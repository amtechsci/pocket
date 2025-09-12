const express = require('express');
const { User, BankInfo, Reference, Document, Loan, Transaction } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Remove sensitive data
    const { password, ...userProfile } = user;

    res.json({
      status: 'success',
      data: userProfile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, validate(schemas.profileUpdate), async (req, res) => {
  try {
    const updatedUser = User.update(req.user.id, {
      ...req.validatedData,
      personalInfo: {
        ...req.validatedData
      }
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Remove sensitive data
    const { password, ...userProfile } = updatedUser;

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: userProfile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
});

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
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
      .slice(0, 5);

    // Calculate dashboard stats
    const activeLoans = loans.filter(loan => ['approved', 'disbursed', 'active'].includes(loan.status));
    const totalOutstanding = activeLoans.reduce((sum, loan) => sum + (loan.amount - (loan.paidAmount || 0)), 0);
    const nextEmiAmount = activeLoans.length > 0 ? activeLoans[0].emi : 0;

    // Get pending document requests
    const pendingDocuments = Document.findAll({ 
      userId: req.user.id, 
      status: 'pending' 
    });

    res.json({
      status: 'success',
      data: {
        user: {
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          creditScore: user.creditScore,
          memberLevel: user.memberLevel,
          kycStatus: user.kycStatus
        },
        stats: {
          totalLoans: loans.length,
          activeLoans: activeLoans.length,
          totalOutstanding,
          nextEmiAmount,
          creditScore: user.creditScore || 0,
          pendingDocuments: pendingDocuments.length
        },
        recentTransactions: transactions,
        activeLoans: activeLoans.slice(0, 3), // Show up to 3 active loans
        pendingTasks: [
          ...pendingDocuments.map(doc => ({
            type: 'document_upload',
            title: `Upload ${doc.name}`,
            description: 'Required for loan processing',
            priority: 'high'
          })),
          ...(user.kycStatus !== 'completed' ? [{
            type: 'kyc_completion',
            title: 'Complete KYC Verification',
            description: 'Submit required documents',
            priority: 'high'
          }] : [])
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

// Get user's bank information
router.get('/bank-info', authenticateToken, async (req, res) => {
  try {
    const bankInfo = BankInfo.findAll({ userId: req.user.id });

    res.json({
      status: 'success',
      data: bankInfo
    });

  } catch (error) {
    console.error('Get bank info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch bank information'
    });
  }
});

// Add/Update bank information
router.post('/bank-info', authenticateToken, validate(schemas.bankInfo), async (req, res) => {
  try {
    // Check if bank info already exists
    const existingBankInfo = BankInfo.findOne({ userId: req.user.id });

    if (existingBankInfo) {
      // Update existing bank info
      const updatedBankInfo = BankInfo.update(existingBankInfo.id, {
        ...req.validatedData,
        isVerified: false // Reset verification status when updated
      });

      res.json({
        status: 'success',
        message: 'Bank information updated successfully',
        data: updatedBankInfo
      });
    } else {
      // Create new bank info
      const bankInfo = BankInfo.create({
        userId: req.user.id,
        ...req.validatedData,
        isVerified: false
      });

      res.json({
        status: 'success',
        message: 'Bank information added successfully',
        data: bankInfo
      });
    }

  } catch (error) {
    console.error('Bank info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save bank information'
    });
  }
});

// Get user's references
router.get('/references', authenticateToken, async (req, res) => {
  try {
    const references = Reference.findAll({ userId: req.user.id });

    res.json({
      status: 'success',
      data: references
    });

  } catch (error) {
    console.error('Get references error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch references'
    });
  }
});

// Add reference
router.post('/references', authenticateToken, validate(schemas.reference), async (req, res) => {
  try {
    // Check reference limit (max 3 references)
    const existingReferences = Reference.findAll({ userId: req.user.id });
    if (existingReferences.length >= 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum 3 references allowed'
      });
    }

    const reference = Reference.create({
      userId: req.user.id,
      ...req.validatedData,
      verificationStatus: 'pending'
    });

    res.json({
      status: 'success',
      message: 'Reference added successfully',
      data: reference
    });

  } catch (error) {
    console.error('Add reference error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add reference'
    });
  }
});

// Update reference
router.put('/references/:id', authenticateToken, validate(schemas.reference), async (req, res) => {
  try {
    // Check if reference belongs to user
    const existingReference = Reference.findById(req.params.id);
    if (!existingReference || existingReference.userId !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Reference not found'
      });
    }

    const updatedReference = Reference.update(req.params.id, {
      ...req.validatedData,
      verificationStatus: 'pending' // Reset verification when updated
    });

    res.json({
      status: 'success',
      message: 'Reference updated successfully',
      data: updatedReference
    });

  } catch (error) {
    console.error('Update reference error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update reference'
    });
  }
});

// Delete reference
router.delete('/references/:id', authenticateToken, async (req, res) => {
  try {
    // Check if reference belongs to user
    const existingReference = Reference.findById(req.params.id);
    if (!existingReference || existingReference.userId !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Reference not found'
      });
    }

    Reference.delete(req.params.id);

    res.json({
      status: 'success',
      message: 'Reference deleted successfully'
    });

  } catch (error) {
    console.error('Delete reference error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete reference'
    });
  }
});

// Get user's documents
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const documents = Document.findAll({ userId: req.user.id });

    res.json({
      status: 'success',
      data: documents
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch documents'
    });
  }
});

// Get user's transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    // Build filter
    const filter = { userId: req.user.id };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const result = Transaction.findWithPagination(
      filter,
      parseInt(page),
      parseInt(limit),
      'createdAt',
      'desc'
    );

    res.json({
      status: 'success',
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transactions'
    });
  }
});

// Get user's loans
router.get('/loans', authenticateToken, async (req, res) => {
  try {
    const loans = Loan.findAll({ userId: req.user.id });

    // Sort by created date (newest first)
    loans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      status: 'success',
      data: loans
    });

  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch loans'
    });
  }
});

// Get specific loan details
router.get('/loans/:loanId', authenticateToken, async (req, res) => {
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

    // Get related transactions
    const transactions = Transaction.findAll({ 
      userId: req.user.id, 
      loanId: req.params.loanId 
    });

    // Get related documents
    const documents = Document.findAll({ 
      userId: req.user.id,
      loanId: req.params.loanId 
    });

    res.json({
      status: 'success',
      data: {
        loan,
        transactions,
        documents
      }
    });

  } catch (error) {
    console.error('Get loan details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch loan details'
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    User.update(req.user.id, { password: hashedPassword });

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to delete account'
      });
    }

    // Get user
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Incorrect password'
      });
    }

    // Check for active loans
    const activeLoans = Loan.findAll({ 
      userId: req.user.id,
      status: { $in: ['approved', 'disbursed', 'active'] }
    });

    if (activeLoans.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete account with active loans. Please contact support.'
      });
    }

    // Deactivate user instead of deleting
    User.update(req.user.id, { 
      isActive: false,
      deletedAt: new Date().toISOString()
    });

    res.json({
      status: 'success',
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account'
    });
  }
});

module.exports = router;