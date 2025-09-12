const express = require('express');
const { User, Loan, Transaction, Document, FollowUp, Note } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get user dashboard data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get user's loans
    const loans = Loan.findAll({ userId: req.user.id });
    
    // Get recent transactions
    const transactions = Transaction.findAll({ userId: req.user.id })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Get pending documents
    const pendingDocuments = Document.findAll({ 
      userId: req.user.id, 
      status: { $in: ['pending', 'rejected'] }
    });

    // Calculate loan statistics
    const loanStats = {
      total: loans.length,
      active: loans.filter(loan => ['approved', 'disbursed', 'active'].includes(loan.status)).length,
      pending: loans.filter(loan => ['pending', 'under_review'].includes(loan.status)).length,
      completed: loans.filter(loan => loan.status === 'closed').length
    };

    // Calculate financial summary
    const activeLoans = loans.filter(loan => ['approved', 'disbursed', 'active'].includes(loan.status));
    const totalLoanAmount = activeLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalEmiAmount = activeLoans.reduce((sum, loan) => sum + (loan.emi || 0), 0);
    const totalOutstanding = activeLoans.reduce((sum, loan) => {
      const paidAmount = (loan.paidEmis || 0) * (loan.emi || 0);
      return sum + Math.max(0, loan.amount - paidAmount);
    }, 0);

    // Get next EMI date
    let nextEmiDate = null;
    if (activeLoans.length > 0) {
      const activeLoan = activeLoans[0];
      if (activeLoan.disbursalDate || activeLoan.approvedDate) {
        const baseDate = new Date(activeLoan.disbursalDate || activeLoan.approvedDate);
        const currentEmi = (activeLoan.paidEmis || 0) + 1;
        nextEmiDate = new Date(baseDate);
        nextEmiDate.setMonth(nextEmiDate.getMonth() + currentEmi);
      }
    }

    // Get pending tasks
    const pendingTasks = [];
    
    // KYC completion task
    if (user.kycStatus !== 'completed') {
      pendingTasks.push({
        id: 'kyc_completion',
        type: 'kyc',
        title: 'Complete KYC Verification',
        description: 'Upload required documents to complete your profile',
        priority: 'high',
        dueDate: null
      });
    }

    // Document upload tasks
    pendingDocuments.forEach(doc => {
      pendingTasks.push({
        id: `doc_${doc.id}`,
        type: 'document',
        title: doc.status === 'rejected' ? `Re-upload ${doc.name}` : `Upload ${doc.name}`,
        description: doc.status === 'rejected' 
          ? `Document was rejected: ${doc.remarks || 'Please upload a clearer version'}`
          : 'Required for loan processing',
        priority: 'medium',
        dueDate: null
      });
    });

    // EMI payment reminder (if due within 7 days)
    if (nextEmiDate && nextEmiDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      pendingTasks.push({
        id: 'emi_payment',
        type: 'payment',
        title: 'Upcoming EMI Payment',
        description: `EMI of ₹${totalEmiAmount.toLocaleString()} is due soon`,
        priority: 'high',
        dueDate: nextEmiDate.toISOString()
      });
    }

    // Get notifications/updates
    const notifications = [
      // Recent loan status changes
      ...loans
        .filter(loan => loan.updatedAt !== loan.createdAt)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 3)
        .map(loan => ({
          id: `loan_${loan.id}`,
          type: 'loan_update',
          title: `Loan ${loan.loanId} Status Updated`,
          message: `Your loan status has been changed to ${loan.status.replace('_', ' ')}`,
          timestamp: loan.updatedAt,
          read: false
        })),
      
      // Document verification updates
      ...Document.findAll({ userId: req.user.id, status: 'verified' })
        .sort((a, b) => new Date(b.verificationDate || b.updatedAt) - new Date(a.verificationDate || a.updatedAt))
        .slice(0, 2)
        .map(doc => ({
          id: `doc_${doc.id}`,
          type: 'document_verified',
          title: 'Document Verified',
          message: `Your ${doc.name} has been successfully verified`,
          timestamp: doc.verificationDate || doc.updatedAt,
          read: false
        }))
    ].slice(0, 5);

    // Credit score trend (mock data - in real app, would come from credit bureau)
    const creditScoreTrend = [
      { month: 'Jan', score: (user.creditScore || 650) - 20 },
      { month: 'Feb', score: (user.creditScore || 650) - 15 },
      { month: 'Mar', score: (user.creditScore || 650) - 10 },
      { month: 'Apr', score: (user.creditScore || 650) - 5 },
      { month: 'May', score: user.creditScore || 650 }
    ];

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          creditScore: user.creditScore,
          memberLevel: user.memberLevel,
          kycStatus: user.kycStatus,
          joinedDate: user.createdAt
        },
        loanStats,
        financialSummary: {
          totalLoanAmount,
          totalEmiAmount,
          totalOutstanding,
          availableCreditLimit: Math.max(0, (user.personalInfo?.monthlyIncome || 0) * 15 - totalLoanAmount),
          nextEmiDate: nextEmiDate?.toISOString(),
          creditUtilization: user.creditScore ? Math.min(100, (totalOutstanding / ((user.personalInfo?.monthlyIncome || 0) * 10)) * 100) : 0
        },
        recentTransactions: transactions.slice(0, 5),
        activeLoans: activeLoans.slice(0, 3),
        pendingTasks: pendingTasks.slice(0, 5),
        notifications,
        creditScoreTrend,
        quickActions: [
          {
            id: 'apply_loan',
            title: 'Apply for Loan',
            description: 'Quick loan application',
            icon: 'plus',
            available: user.kycStatus === 'completed' && loanStats.pending === 0
          },
          {
            id: 'pay_emi',
            title: 'Pay EMI',
            description: 'Make EMI payment',
            icon: 'payment',
            available: loanStats.active > 0
          },
          {
            id: 'check_credit_score',
            title: 'Check Credit Score',
            description: 'View detailed credit report',
            icon: 'chart',
            available: true
          },
          {
            id: 'upload_documents',
            title: 'Upload Documents',
            description: 'Submit required documents',
            icon: 'upload',
            available: pendingDocuments.length > 0
          }
        ]
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get user's loan portfolio
router.get('/loans', authenticateToken, async (req, res) => {
  try {
    const loans = Loan.findAll({ userId: req.user.id })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const portfolio = loans.map(loan => {
      const paidAmount = (loan.paidEmis || 0) * (loan.emi || 0);
      const outstanding = Math.max(0, loan.amount - paidAmount);
      const progressPercentage = loan.amount > 0 ? Math.min(100, (paidAmount / loan.amount) * 100) : 0;

      return {
        ...loan,
        paidAmount,
        outstanding,
        progressPercentage,
        nextEmiDate: loan.status === 'active' && loan.disbursalDate
          ? new Date(new Date(loan.disbursalDate).setMonth(
              new Date(loan.disbursalDate).getMonth() + (loan.paidEmis || 0) + 1
            )).toISOString()
          : null
      };
    });

    const summary = {
      totalLoans: loans.length,
      totalBorrowed: loans.reduce((sum, loan) => 
        ['approved', 'disbursed', 'active', 'closed'].includes(loan.status) ? sum + loan.amount : sum, 0
      ),
      totalRepaid: portfolio.reduce((sum, loan) => sum + loan.paidAmount, 0),
      currentOutstanding: portfolio.reduce((sum, loan) => 
        ['active', 'disbursed'].includes(loan.status) ? sum + loan.outstanding : sum, 0
      ),
      monthlyEmi: portfolio
        .filter(loan => ['active', 'disbursed'].includes(loan.status))
        .reduce((sum, loan) => sum + (loan.emi || 0), 0)
    };

    res.json({
      status: 'success',
      data: {
        portfolio,
        summary
      }
    });

  } catch (error) {
    console.error('Loan portfolio error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch loan portfolio'
    });
  }
});

// Get payment calendar
router.get('/payment-calendar', authenticateToken, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const activeLoans = Loan.findAll({ 
      userId: req.user.id,
      status: { $in: ['active', 'disbursed'] }
    });

    const paymentCalendar = [];

    activeLoans.forEach(loan => {
      if (!loan.disbursalDate) return;

      const disbursalDate = new Date(loan.disbursalDate);
      const paidEmis = loan.paidEmis || 0;
      const remainingEmis = loan.tenure - paidEmis;

      for (let i = 1; i <= remainingEmis && i <= 12; i++) {
        const emiDate = new Date(disbursalDate);
        emiDate.setMonth(emiDate.getMonth() + paidEmis + i);

        if (emiDate.getFullYear() == year && (emiDate.getMonth() + 1) == month) {
          paymentCalendar.push({
            date: emiDate.toISOString().split('T')[0],
            loanId: loan.loanId,
            amount: loan.emi,
            status: 'upcoming',
            type: 'emi'
          });
        }
      }
    });

    // Add past payments for the month
    const transactions = Transaction.findAll({ 
      userId: req.user.id,
      type: 'debit'
    }).filter(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      return transactionDate.getFullYear() == year && 
             transactionDate.getMonth() + 1 == month &&
             transaction.description.includes('EMI');
    });

    transactions.forEach(transaction => {
      paymentCalendar.push({
        date: transaction.createdAt.split('T')[0],
        loanId: transaction.loanId,
        amount: Math.abs(transaction.amount),
        status: transaction.status === 'completed' ? 'paid' : 'failed',
        type: 'emi'
      });
    });

    // Sort by date
    paymentCalendar.sort((a, b) => new Date(a.date) - new Date(b.date));

    const summary = {
      totalUpcoming: paymentCalendar.filter(p => p.status === 'upcoming').length,
      totalUpcomingAmount: paymentCalendar
        .filter(p => p.status === 'upcoming')
        .reduce((sum, p) => sum + p.amount, 0),
      totalPaid: paymentCalendar.filter(p => p.status === 'paid').length,
      totalPaidAmount: paymentCalendar
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0)
    };

    res.json({
      status: 'success',
      data: {
        year: parseInt(year),
        month: parseInt(month),
        payments: paymentCalendar,
        summary
      }
    });

  } catch (error) {
    console.error('Payment calendar error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment calendar'
    });
  }
});

// Get credit score details
router.get('/credit-score', authenticateToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const creditScore = user.creditScore || 650;

    // Mock credit score breakdown
    const breakdown = {
      paymentHistory: {
        score: Math.min(100, creditScore / 8.5),
        weight: 35,
        status: creditScore >= 700 ? 'good' : creditScore >= 650 ? 'fair' : 'poor'
      },
      creditUtilization: {
        score: Math.min(100, (creditScore - 100) / 7),
        weight: 30,
        status: creditScore >= 720 ? 'good' : creditScore >= 670 ? 'fair' : 'poor'
      },
      creditLength: {
        score: Math.min(100, (creditScore - 50) / 7.5),
        weight: 15,
        status: creditScore >= 710 ? 'good' : creditScore >= 660 ? 'fair' : 'poor'
      },
      creditMix: {
        score: Math.min(100, (creditScore - 200) / 6),
        weight: 10,
        status: creditScore >= 700 ? 'good' : creditScore >= 650 ? 'fair' : 'poor'
      },
      newCredit: {
        score: Math.min(100, (creditScore - 150) / 6.5),
        weight: 10,
        status: creditScore >= 730 ? 'excellent' : creditScore >= 680 ? 'good' : 'fair'
      }
    };

    // Mock historical data
    const history = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        date: date.toISOString().split('T')[0],
        score: Math.max(500, creditScore + Math.random() * 40 - 20)
      };
    });

    // Credit improvement tips
    const tips = [];
    if (breakdown.paymentHistory.status !== 'good') {
      tips.push('Make all payments on time to improve payment history');
    }
    if (breakdown.creditUtilization.status !== 'good') {
      tips.push('Keep credit utilization below 30% of available limit');
    }
    if (breakdown.creditLength.status !== 'good') {
      tips.push('Keep old accounts open to maintain credit history length');
    }

    res.json({
      status: 'success',
      data: {
        currentScore: creditScore,
        category: creditScore >= 750 ? 'Excellent' : 
                 creditScore >= 700 ? 'Good' : 
                 creditScore >= 650 ? 'Fair' : 'Poor',
        lastUpdated: user.updatedAt,
        breakdown,
        history,
        tips,
        comparison: {
          nationalAverage: 685,
          ageGroup: 692,
          incomeGroup: creditScore >= 700 ? 715 : 668
        }
      }
    });

  } catch (error) {
    console.error('Credit score error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch credit score details'
    });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd update the notification status in the database
    // For now, we'll just return success
    
    res.json({
      status: 'success',
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update notification'
    });
  }
});

module.exports = router;