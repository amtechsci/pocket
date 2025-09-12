const express = require('express');
const { Loan, User, Transaction, Document, getNextSequence } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const router = express.Router();

// Apply for a loan
router.post('/apply', authenticateToken, validate(schemas.loanApplication), async (req, res) => {
  try {
    const { amount, tenure, purpose, type, monthlyIncome, employmentType, companyName } = req.validatedData;

    // Get user details
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user has completed KYC
    if (user.kycStatus !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Please complete KYC verification before applying for a loan'
      });
    }

    // Check for existing pending applications
    const pendingLoans = Loan.findAll({
      userId: req.user.id,
      status: { $in: ['pending', 'under_review'] }
    });

    if (pendingLoans.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a pending loan application'
      });
    }

    // Calculate interest rate based on credit score and loan type
    const creditScore = user.creditScore || 650;
    let interestRate;
    
    if (type === 'personal') {
      interestRate = creditScore >= 750 ? 12 : creditScore >= 700 ? 14 : 16;
    } else { // business
      interestRate = creditScore >= 750 ? 14 : creditScore >= 700 ? 16 : 18;
    }

    // Calculate EMI
    const monthlyRate = interestRate / (12 * 100);
    const emi = Math.round((amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
                          (Math.pow(1 + monthlyRate, tenure) - 1));

    // Calculate fees
    const processingFee = Math.min(amount * 0.02, 10000); // 2% or max 10k
    const insurance = amount * 0.005; // 0.5% of loan amount

    // Generate loan ID
    const loanIdNumber = getNextSequence('loanId');
    const loanId = `CL${loanIdNumber}`;

    // Create loan application
    const loan = Loan.create({
      loanId,
      userId: req.user.id,
      type,
      amount,
      tenure,
      purpose,
      interestRate,
      emi,
      status: 'pending',
      applicationData: {
        monthlyIncome,
        employmentType,
        companyName,
        existingLoans: 0, // TODO: Calculate from existing loans
        cibilScore: creditScore
      },
      processingFee,
      insurance,
      totalAmount: amount + processingFee + insurance,
      appliedDate: new Date().toISOString()
    });

    // Create processing fee transaction
    Transaction.create({
      userId: req.user.id,
      loanId: loan.loanId,
      type: 'debit',
      amount: -processingFee,
      description: 'Loan Processing Fee',
      status: 'pending',
      reference: `PROC_FEE_${loan.loanId}`,
      method: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Loan application submitted successfully',
      data: {
        loan: {
          id: loan.id,
          loanId: loan.loanId,
          type: loan.type,
          amount: loan.amount,
          tenure: loan.tenure,
          interestRate: loan.interestRate,
          emi: loan.emi,
          status: loan.status,
          processingFee: loan.processingFee,
          totalAmount: loan.totalAmount
        }
      }
    });

  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit loan application'
    });
  }
});

// Get loan eligibility
router.post('/eligibility', authenticateToken, async (req, res) => {
  try {
    const { amount, monthlyIncome, existingEmis = 0, employmentType, creditScore } = req.body;

    if (!amount || !monthlyIncome || !employmentType) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount, monthly income, and employment type are required'
      });
    }

    // Calculate eligibility
    const foir = 0.6; // Fixed Obligation to Income Ratio
    const availableIncome = monthlyIncome - existingEmis;
    const maxEmi = availableIncome * foir;

    // Calculate maximum eligible amount for different tenures
    const eligibilityResults = [12, 24, 36, 48, 60].map(tenure => {
      const interestRate = creditScore >= 750 ? 12 : creditScore >= 700 ? 14 : 16;
      const monthlyRate = interestRate / (12 * 100);
      
      const maxAmount = Math.floor((maxEmi * (Math.pow(1 + monthlyRate, tenure) - 1)) / 
                                  (monthlyRate * Math.pow(1 + monthlyRate, tenure)));

      const requestedEmi = Math.round((amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
                                    (Math.pow(1 + monthlyRate, tenure) - 1));

      return {
        tenure,
        maxAmount,
        interestRate,
        isEligible: maxAmount >= amount,
        emi: requestedEmi,
        totalInterest: (requestedEmi * tenure) - amount,
        totalAmount: requestedEmi * tenure
      };
    });

    const overallEligible = eligibilityResults.some(result => result.isEligible);
    const recommendedTenure = eligibilityResults.find(result => result.isEligible);

    res.json({
      status: 'success',
      data: {
        isEligible: overallEligible,
        requestedAmount: amount,
        monthlyIncome,
        availableIncome,
        maxEmi,
        eligibilityByTenure: eligibilityResults,
        recommendation: recommendedTenure ? {
          tenure: recommendedTenure.tenure,
          emi: recommendedTenure.emi,
          interestRate: recommendedTenure.interestRate,
          message: `You are eligible for ₹${amount.toLocaleString()} for ${recommendedTenure.tenure} months`
        } : {
          message: 'You may not be eligible for the requested amount. Consider a lower amount or longer tenure.'
        }
      }
    });

  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check eligibility'
    });
  }
});

// Get loan offers
router.get('/offers', authenticateToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const creditScore = user.creditScore || 650;
    const monthlyIncome = user.personalInfo?.monthlyIncome || 50000;

    // Generate personalized offers based on user profile
    const offers = [
      {
        id: 'offer_1',
        type: 'personal',
        title: 'Personal Loan - Quick Cash',
        amount: Math.min(monthlyIncome * 15, 500000),
        tenure: 36,
        interestRate: creditScore >= 750 ? 12 : creditScore >= 700 ? 14 : 16,
        processingFee: 1999,
        features: [
          'Instant approval',
          'No collateral required',
          'Flexible repayment',
          'Quick disbursal'
        ],
        eligibility: [
          'Minimum salary: ₹25,000',
          'Age: 21-65 years',
          'Employment: Salaried/Self-employed'
        ]
      },
      {
        id: 'offer_2',
        type: 'personal',
        title: 'Premium Personal Loan',
        amount: Math.min(monthlyIncome * 20, 1000000),
        tenure: 48,
        interestRate: creditScore >= 750 ? 11.5 : creditScore >= 700 ? 13.5 : 15.5,
        processingFee: 2999,
        features: [
          'Higher loan amount',
          'Competitive rates',
          'Longer tenure options',
          'Priority service'
        ],
        eligibility: [
          'Minimum salary: ₹50,000',
          'CIBIL Score: 700+',
          'Stable employment'
        ]
      }
    ];

    // Add business loan offer if applicable
    if (user.personalInfo?.employmentType === 'self-employed') {
      offers.push({
        id: 'offer_3',
        type: 'business',
        title: 'Business Growth Loan',
        amount: Math.min(monthlyIncome * 25, 2000000),
        tenure: 60,
        interestRate: creditScore >= 750 ? 14 : creditScore >= 700 ? 16 : 18,
        processingFee: 5000,
        features: [
          'Business expansion',
          'Working capital',
          'Equipment financing',
          'Tax benefits'
        ],
        eligibility: [
          'Business vintage: 2+ years',
          'Annual turnover: ₹10 lakh+',
          'ITR filed for 2 years'
        ]
      });
    }

    // Calculate EMI for each offer
    offers.forEach(offer => {
      const monthlyRate = offer.interestRate / (12 * 100);
      offer.emi = Math.round((offer.amount * monthlyRate * Math.pow(1 + monthlyRate, offer.tenure)) / 
                           (Math.pow(1 + monthlyRate, offer.tenure) - 1));
      offer.totalInterest = (offer.emi * offer.tenure) - offer.amount;
      offer.totalAmount = offer.emi * offer.tenure + offer.processingFee;
    });

    res.json({
      status: 'success',
      data: {
        offers,
        userProfile: {
          creditScore,
          memberLevel: user.memberLevel,
          eligibleForPreApproval: creditScore >= 700
        }
      }
    });

  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch loan offers'
    });
  }
});

// Get loan status
router.get('/:loanId/status', authenticateToken, async (req, res) => {
  try {
    const loan = Loan.findOne({
      loanId: req.params.loanId,
      userId: req.user.id
    });

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Get loan timeline/status history
    const statusHistory = [
      {
        status: 'pending',
        date: loan.createdAt,
        description: 'Application submitted',
        completed: true
      },
      {
        status: 'under_review',
        date: loan.status === 'under_review' ? loan.updatedAt : null,
        description: 'Under review by our team',
        completed: ['under_review', 'approved', 'disbursed', 'active'].includes(loan.status)
      },
      {
        status: 'approved',
        date: loan.approvedDate || null,
        description: 'Loan approved',
        completed: ['approved', 'disbursed', 'active'].includes(loan.status)
      },
      {
        status: 'disbursed',
        date: loan.disbursalDate || null,
        description: 'Loan amount disbursed',
        completed: ['disbursed', 'active'].includes(loan.status)
      }
    ];

    // Get required documents
    const requiredDocs = Document.findAll({
      userId: req.user.id,
      loanId: req.params.loanId
    });

    // Calculate progress percentage
    const completedSteps = statusHistory.filter(step => step.completed).length;
    const progressPercentage = (completedSteps / statusHistory.length) * 100;

    res.json({
      status: 'success',
      data: {
        loan: {
          loanId: loan.loanId,
          amount: loan.amount,
          status: loan.status,
          appliedDate: loan.createdAt,
          expectedDisbursalDate: loan.expectedDisbursalDate
        },
        statusHistory,
        progressPercentage,
        requiredDocuments: requiredDocs.map(doc => ({
          name: doc.name,
          status: doc.status,
          required: true
        })),
        nextAction: loan.status === 'pending' 
          ? 'Complete document upload' 
          : loan.status === 'under_review' 
          ? 'Wait for approval' 
          : loan.status === 'approved'
          ? 'Complete agreement signing'
          : 'No action required'
      }
    });

  } catch (error) {
    console.error('Get loan status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch loan status'
    });
  }
});

// Cancel loan application
router.post('/:loanId/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const loan = Loan.findOne({
      loanId: req.params.loanId,
      userId: req.user.id
    });

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check if loan can be cancelled
    if (!['pending', 'under_review'].includes(loan.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Loan cannot be cancelled in current status'
      });
    }

    // Update loan status
    Loan.update(loan.id, {
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by user',
      cancelledDate: new Date().toISOString()
    });

    res.json({
      status: 'success',
      message: 'Loan application cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel loan error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel loan application'
    });
  }
});

// Get EMI schedule
router.get('/:loanId/emi-schedule', authenticateToken, async (req, res) => {
  try {
    const loan = Loan.findOne({
      loanId: req.params.loanId,
      userId: req.user.id
    });

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    if (!['approved', 'disbursed', 'active'].includes(loan.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'EMI schedule not available for current loan status'
      });
    }

    // Generate EMI schedule
    const principal = loan.amount;
    const monthlyRate = loan.interestRate / (12 * 100);
    const emi = loan.emi;
    let remainingPrincipal = principal;
    const schedule = [];

    for (let month = 1; month <= loan.tenure; month++) {
      const interestAmount = Math.round(remainingPrincipal * monthlyRate);
      const principalAmount = emi - interestAmount;
      remainingPrincipal -= principalAmount;

      // Calculate due date (assuming disbursal date + months)
      const dueDate = new Date(loan.disbursalDate || loan.approvedDate || new Date());
      dueDate.setMonth(dueDate.getMonth() + month);

      schedule.push({
        month,
        dueDate: dueDate.toISOString().split('T')[0],
        emi,
        principalAmount,
        interestAmount,
        remainingBalance: Math.max(0, remainingPrincipal),
        status: month <= (loan.paidEmis || 0) ? 'paid' : 'pending'
      });

      if (remainingPrincipal <= 0) break;
    }

    res.json({
      status: 'success',
      data: {
        loanId: loan.loanId,
        principal,
        interestRate: loan.interestRate,
        tenure: loan.tenure,
        emi,
        totalInterest: (emi * loan.tenure) - principal,
        totalAmount: emi * loan.tenure,
        paidEmis: loan.paidEmis || 0,
        remainingEmis: loan.tenure - (loan.paidEmis || 0),
        schedule
      }
    });

  } catch (error) {
    console.error('Get EMI schedule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate EMI schedule'
    });
  }
});

// Pre-closure calculation
router.get('/:loanId/preclosure', authenticateToken, async (req, res) => {
  try {
    const loan = Loan.findOne({
      loanId: req.params.loanId,
      userId: req.user.id
    });

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    if (!['active'].includes(loan.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Pre-closure not available for current loan status'
      });
    }

    // Calculate pre-closure amount
    const paidEmis = loan.paidEmis || 0;
    const remainingEmis = loan.tenure - paidEmis;
    const monthlyRate = loan.interestRate / (12 * 100);
    
    // Calculate outstanding principal
    let outstandingPrincipal = loan.amount;
    for (let i = 1; i <= paidEmis; i++) {
      const interestAmount = outstandingPrincipal * monthlyRate;
      const principalAmount = loan.emi - interestAmount;
      outstandingPrincipal -= principalAmount;
    }

    // Pre-closure charges (typically 2-4% of outstanding principal)
    const preclosureCharges = Math.round(outstandingPrincipal * 0.02);
    const totalPreclosureAmount = Math.round(outstandingPrincipal) + preclosureCharges;

    // Calculate savings
    const remainingInterest = (loan.emi * remainingEmis) - outstandingPrincipal;
    const savings = remainingInterest - preclosureCharges;

    res.json({
      status: 'success',
      data: {
        loanId: loan.loanId,
        outstandingPrincipal: Math.round(outstandingPrincipal),
        preclosureCharges,
        totalPreclosureAmount,
        remainingEmis,
        remainingInterest,
        savings,
        eligibleForPreclosure: paidEmis >= 6, // Minimum 6 EMIs paid
        message: paidEmis < 6 
          ? 'Pre-closure available after paying minimum 6 EMIs' 
          : `You can save ₹${savings.toLocaleString()} by pre-closing this loan`
      }
    });

  } catch (error) {
    console.error('Pre-closure calculation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to calculate pre-closure amount'
    });
  }
});

module.exports = router;