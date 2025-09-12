const express = require('express');
const { User, CibilData, PanData, BankInfo } = require('../utils/database');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Mock external API calls
const mockCibilAPI = async (panNumber) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock CIBIL data based on PAN
  const baseScore = 650 + (panNumber.charCodeAt(4) % 100);
  
  return {
    score: baseScore,
    lastUpdated: new Date().toISOString(),
    trend: baseScore > 700 ? 'improving' : 'stable',
    factors: {
      paymentHistory: { score: Math.min(100, baseScore / 7), status: baseScore >= 700 ? 'good' : 'fair' },
      creditUtilization: { score: Math.min(100, (baseScore - 50) / 7), status: baseScore >= 720 ? 'good' : 'fair' },
      creditLength: { score: Math.min(100, (baseScore - 100) / 6.5), status: baseScore >= 710 ? 'good' : 'fair' },
      creditMix: { score: Math.min(100, (baseScore - 200) / 5), status: baseScore >= 700 ? 'good' : 'fair' },
      newCredit: { score: Math.min(100, (baseScore - 150) / 5.5), status: baseScore >= 730 ? 'excellent' : 'good' }
    },
    accounts: [
      {
        type: 'Credit Card',
        bank: 'HDFC Bank',
        limit: 500000,
        outstanding: Math.floor(baseScore * 200),
        utilization: Math.min(80, Math.floor(baseScore / 10)),
        status: 'active',
        monthsReported: 36
      }
    ],
    inquiries: [
      { date: new Date().toISOString(), type: 'Personal Loan', inquiredBy: 'Pocket Credit' }
    ]
  };
};

const mockPANAPI = async (panNumber) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock PAN verification
  const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber);
  
  if (!isValid) {
    throw new Error('Invalid PAN format');
  }
  
  return {
    panNumber,
    name: 'MOCK NAME FROM PAN API',
    dateOfBirth: '15/05/1990',
    status: 'valid',
    lastVerified: new Date().toISOString(),
    linkingStatus: {
      aadhaar: true,
      bank: true,
      mobile: Math.random() > 0.3,
      email: Math.random() > 0.5
    },
    filings: [
      { year: '2023-24', status: 'filed', income: 900000 + Math.floor(Math.random() * 200000) },
      { year: '2022-23', status: 'filed', income: 850000 + Math.floor(Math.random() * 150000) },
      { year: '2021-22', status: 'filed', income: 750000 + Math.floor(Math.random() * 100000) }
    ]
  };
};

const mockBankAPI = async (accountNumber, ifscCode) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock bank verification
  return {
    accountNumber,
    ifscCode,
    accountHolderName: 'VERIFIED ACCOUNT HOLDER',
    accountType: 'savings',
    isValid: true,
    bankName: 'Mock Bank',
    branchName: 'Mock Branch',
    averageBalance: 125000 + Math.floor(Math.random() * 50000),
    relationshipLength: '5 years'
  };
};

// Verify CIBIL score
router.post('/cibil', authenticateToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.panNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'PAN number is required for CIBIL verification'
      });
    }

    // Check if we have recent CIBIL data (within 30 days)
    const existingCibil = CibilData.findOne({ userId: req.user.id });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    if (existingCibil && new Date(existingCibil.updatedAt) > thirtyDaysAgo) {
      return res.json({
        status: 'success',
        message: 'CIBIL data retrieved from cache',
        data: existingCibil,
        cached: true
      });
    }

    // Fetch fresh CIBIL data
    const cibilData = await mockCibilAPI(user.panNumber);
    
    // Update or create CIBIL record
    let savedCibil;
    if (existingCibil) {
      savedCibil = CibilData.update(existingCibil.id, {
        ...cibilData,
        userId: req.user.id
      });
    } else {
      savedCibil = CibilData.create({
        userId: req.user.id,
        ...cibilData
      });
    }

    // Update user's credit score
    User.update(req.user.id, { creditScore: cibilData.score });

    res.json({
      status: 'success',
      message: 'CIBIL score updated successfully',
      data: savedCibil,
      cached: false
    });

  } catch (error) {
    console.error('CIBIL verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify CIBIL score'
    });
  }
});

// Verify PAN details
router.post('/pan', authenticateToken, async (req, res) => {
  try {
    const { panNumber } = req.body;
    
    if (!panNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'PAN number is required'
      });
    }

    // Check if we have recent PAN data
    const existingPan = PanData.findOne({ userId: req.user.id, panNumber });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (existingPan && new Date(existingPan.updatedAt) > sevenDaysAgo) {
      return res.json({
        status: 'success',
        message: 'PAN data retrieved from cache',
        data: existingPan,
        cached: true
      });
    }

    // Verify PAN with external API
    const panData = await mockPANAPI(panNumber);
    
    // Update or create PAN record
    let savedPan;
    if (existingPan) {
      savedPan = PanData.update(existingPan.id, {
        ...panData,
        userId: req.user.id
      });
    } else {
      savedPan = PanData.create({
        userId: req.user.id,
        ...panData
      });
    }

    // Update user's PAN number
    User.update(req.user.id, { panNumber });

    res.json({
      status: 'success',
      message: 'PAN verified successfully',
      data: savedPan,
      cached: false
    });

  } catch (error) {
    console.error('PAN verification error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to verify PAN'
    });
  }
});

// Verify bank account
router.post('/bank', authenticateToken, async (req, res) => {
  try {
    const { accountNumber, ifscCode } = req.body;
    
    if (!accountNumber || !ifscCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Account number and IFSC code are required'
      });
    }

    // Check if bank info already exists and is verified
    const existingBank = BankInfo.findOne({ 
      userId: req.user.id, 
      accountNumber 
    });

    if (existingBank && existingBank.isVerified) {
      return res.json({
        status: 'success',
        message: 'Bank account already verified',
        data: existingBank,
        cached: true
      });
    }

    // Verify with bank API
    const bankData = await mockBankAPI(accountNumber, ifscCode);
    
    // Update or create bank record
    let savedBank;
    if (existingBank) {
      savedBank = BankInfo.update(existingBank.id, {
        ...existingBank,
        ...bankData,
        isVerified: true,
        verifiedDate: new Date().toISOString()
      });
    } else {
      savedBank = BankInfo.create({
        userId: req.user.id,
        ...bankData,
        isVerified: true,
        verifiedDate: new Date().toISOString()
      });
    }

    res.json({
      status: 'success',
      message: 'Bank account verified successfully',
      data: savedBank,
      cached: false
    });

  } catch (error) {
    console.error('Bank verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify bank account'
    });
  }
});

// Get user's verification status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const cibilData = CibilData.findOne({ userId: req.user.id });
    const panData = PanData.findOne({ userId: req.user.id });
    const bankInfo = BankInfo.findAll({ userId: req.user.id });

    const verificationStatus = {
      kyc: {
        status: user.kycStatus,
        completed: user.kycStatus === 'completed',
        lastUpdated: user.updatedAt
      },
      cibil: {
        verified: !!cibilData,
        score: cibilData?.score || null,
        lastUpdated: cibilData?.updatedAt || null,
        needsUpdate: cibilData ? 
          (new Date() - new Date(cibilData.updatedAt)) > (30 * 24 * 60 * 60 * 1000) : true
      },
      pan: {
        verified: !!panData && panData.status === 'valid',
        number: user.panNumber,
        lastUpdated: panData?.updatedAt || null,
        needsUpdate: panData ? 
          (new Date() - new Date(panData.updatedAt)) > (7 * 24 * 60 * 60 * 1000) : true
      },
      bank: {
        verified: bankInfo.some(bank => bank.isVerified),
        accounts: bankInfo.length,
        verifiedAccounts: bankInfo.filter(bank => bank.isVerified).length,
        lastUpdated: bankInfo.length > 0 ? 
          Math.max(...bankInfo.map(bank => new Date(bank.updatedAt))) : null
      },
      overall: {
        completionPercentage: Math.round(
          ((user.kycStatus === 'completed' ? 25 : 0) +
           (cibilData ? 25 : 0) +
           (panData?.status === 'valid' ? 25 : 0) +
           (bankInfo.some(bank => bank.isVerified) ? 25 : 0))
        ),
        allVerified: user.kycStatus === 'completed' && 
                    !!cibilData && 
                    panData?.status === 'valid' && 
                    bankInfo.some(bank => bank.isVerified)
      }
    };

    res.json({
      status: 'success',
      data: verificationStatus
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch verification status'
    });
  }
});

// Admin: Force refresh user verification (admin only)
router.post('/refresh/:userId', authenticateAdmin, async (req, res) => {
  try {
    const user = User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const results = {
      cibil: null,
      pan: null,
      errors: []
    };

    // Refresh CIBIL if PAN available
    if (user.panNumber) {
      try {
        const cibilData = await mockCibilAPI(user.panNumber);
        
        const existingCibil = CibilData.findOne({ userId: user.id });
        if (existingCibil) {
          results.cibil = CibilData.update(existingCibil.id, {
            ...cibilData,
            userId: user.id
          });
        } else {
          results.cibil = CibilData.create({
            userId: user.id,
            ...cibilData
          });
        }

        // Update user's credit score
        User.update(user.id, { creditScore: cibilData.score });
        
      } catch (error) {
        results.errors.push(`CIBIL refresh failed: ${error.message}`);
      }
    }

    // Refresh PAN
    if (user.panNumber) {
      try {
        const panData = await mockPANAPI(user.panNumber);
        
        const existingPan = PanData.findOne({ userId: user.id });
        if (existingPan) {
          results.pan = PanData.update(existingPan.id, {
            ...panData,
            userId: user.id
          });
        } else {
          results.pan = PanData.create({
            userId: user.id,
            ...panData
          });
        }
        
      } catch (error) {
        results.errors.push(`PAN refresh failed: ${error.message}`);
      }
    }

    res.json({
      status: 'success',
      message: 'Verification data refreshed',
      data: results
    });

  } catch (error) {
    console.error('Refresh verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh verification data'
    });
  }
});

// Check verification eligibility
router.get('/eligibility', authenticateToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const eligibility = {
      cibil: {
        eligible: !!user.panNumber,
        reason: !user.panNumber ? 'PAN number required' : 'Eligible for CIBIL check',
        requirements: ['Valid PAN number']
      },
      pan: {
        eligible: true,
        reason: 'Always eligible for PAN verification',
        requirements: ['Valid PAN format']
      },
      bank: {
        eligible: user.kycStatus !== 'pending',
        reason: user.kycStatus === 'pending' ? 'Complete basic KYC first' : 'Eligible for bank verification',
        requirements: ['Basic KYC completed', 'Valid account number', 'Valid IFSC code']
      },
      advancedVerification: {
        eligible: user.kycStatus === 'completed' && !!user.panNumber,
        reason: user.kycStatus !== 'completed' ? 'Complete KYC verification first' : 
                !user.panNumber ? 'PAN number required' : 'Eligible for advanced verification',
        requirements: ['Completed KYC', 'Valid PAN', 'Bank account verified']
      }
    };

    res.json({
      status: 'success',
      data: eligibility
    });

  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check verification eligibility'
    });
  }
});

// Verification report (admin only)
router.get('/report/:userId', authenticateAdmin, async (req, res) => {
  try {
    const user = User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const cibilData = CibilData.findOne({ userId: user.id });
    const panData = PanData.findOne({ userId: user.id });
    const bankInfo = BankInfo.findAll({ userId: user.id });

    const report = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        kycStatus: user.kycStatus,
        creditScore: user.creditScore
      },
      verifications: {
        cibil: cibilData || null,
        pan: panData || null,
        banking: bankInfo
      },
      riskAssessment: {
        creditRisk: user.creditScore >= 750 ? 'Low' : 
                   user.creditScore >= 700 ? 'Medium' : 'High',
        fraudRisk: panData?.status === 'valid' && 
                  bankInfo.some(bank => bank.isVerified) ? 'Low' : 'Medium',
        overallRisk: user.creditScore >= 700 && 
                    panData?.status === 'valid' && 
                    bankInfo.some(bank => bank.isVerified) ? 'Low' : 'Medium'
      },
      recommendations: []
    };

    // Add recommendations based on verification status
    if (!cibilData) {
      report.recommendations.push('Complete CIBIL verification for better risk assessment');
    }
    if (!panData || panData.status !== 'valid') {
      report.recommendations.push('Verify PAN details for identity confirmation');
    }
    if (!bankInfo.some(bank => bank.isVerified)) {
      report.recommendations.push('Verify bank account for fund transfer setup');
    }

    res.json({
      status: 'success',
      data: report
    });

  } catch (error) {
    console.error('Generate verification report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate verification report'
    });
  }
});

module.exports = router;