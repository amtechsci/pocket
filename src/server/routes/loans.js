const express = require('express');
const { getConnection } = require('../utils/mysqlDatabase');
const router = express.Router();

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const connection = await getConnection();
    const [users] = await connection.execute(
      'SELECT id, email, status FROM users WHERE id = ? AND status = "active"',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// =====================================================
// LOAN APPLICATION MANAGEMENT
// =====================================================

// POST /api/loans/apply - Create New Loan Application
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { 
      loan_amount, 
      loan_purpose, 
      loan_tenure_days = 30,
      requested_disbursal_date 
    } = req.body;

    if (!loan_amount || !loan_purpose) {
      return res.status(400).json({
        success: false,
        message: 'Loan amount and purpose are required'
      });
    }

    const connection = await getConnection();

    // Get user with member tier info
    const [users] = await connection.execute(
      `SELECT u.*, mt.max_loan_amount, mt.min_loan_amount, mt.max_loan_tenure_days,
              mt.processing_fee_rate, mt.interest_rate_per_day
       FROM users u 
       LEFT JOIN member_tiers mt ON u.member_id = mt.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Validate loan amount against member tier limits
    if (loan_amount < user.min_loan_amount || loan_amount > user.max_loan_amount) {
      return res.status(400).json({
        success: false,
        message: `Loan amount must be between ₹${user.min_loan_amount} and ₹${user.max_loan_amount} for your member tier`
      });
    }

    // Validate tenure
    if (loan_tenure_days > user.max_loan_tenure_days) {
      return res.status(400).json({
        success: false,
        message: `Loan tenure cannot exceed ${user.max_loan_tenure_days} days for your member tier`
      });
    }

    // Calculate loan details
    const processing_fee = (loan_amount * user.processing_fee_rate) / 100;
    const gst_on_processing_fee = (processing_fee * 18) / 100;
    const total_processing_fee = processing_fee + gst_on_processing_fee;
    const interest_amount = (loan_amount * user.interest_rate_per_day * loan_tenure_days) / 100;
    const total_amount = loan_amount + total_processing_fee + interest_amount;

    // Create loan application
    const [result] = await connection.execute(
      `INSERT INTO loan_applications (user_id, loan_amount, loan_purpose, loan_tenure_days,
                                     requested_disbursal_date, processing_fee_rate, interest_rate_per_day,
                                     processing_fee, gst_on_processing_fee, total_processing_fee,
                                     interest_amount, total_amount, status, application_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [req.user.id, loan_amount, loan_purpose, loan_tenure_days, requested_disbursal_date,
       user.processing_fee_rate, user.interest_rate_per_day, processing_fee, gst_on_processing_fee,
       total_processing_fee, interest_amount, total_amount]
    );

    const applicationId = result.insertId;

    // Create loan record
    const [loanResult] = await connection.execute(
      `INSERT INTO loans (user_id, loan_application_id, loan_amount, loan_purpose, 
                         loan_tenure_days, interest_rate_per_day, processing_fee_rate,
                         processing_fee, total_amount, status, disbursal_date, due_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, DATE_ADD(?, INTERVAL ? DAY))`,
      [req.user.id, applicationId, loan_amount, loan_purpose, loan_tenure_days,
       user.interest_rate_per_day, user.processing_fee_rate, total_processing_fee,
       total_amount, requested_disbursal_date, requested_disbursal_date, loan_tenure_days]
    );

    const loanId = loanResult.insertId;

    // Update loan application with loan ID
    await connection.execute(
      'UPDATE loan_applications SET loan_id = ? WHERE id = ?',
      [loanId, applicationId]
    );

    // Create notification
    await connection.execute(
      `INSERT INTO notifications (user_id, type, title, message, is_read) 
       VALUES (?, 'loan_application', 'Loan Application Submitted', 
               'Your loan application for ₹${loan_amount} has been submitted successfully.', FALSE)`,
      [req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data: {
        application_id: applicationId,
        loan_id: loanId,
        loan_amount,
        loan_purpose,
        loan_tenure_days,
        processing_fee,
        gst_on_processing_fee,
        total_processing_fee,
        interest_amount,
        total_amount,
        status: 'pending',
        next_steps: [
          'Complete KYC verification',
          'Upload required documents',
          'Complete video KYC',
          'Wait for approval'
        ]
      }
    });

  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while submitting loan application'
    });
  }
});

// GET /api/loans/applications - Get User's Loan Applications
router.get('/applications', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;

    const connection = await getConnection();

    let query = `
      SELECT la.*, l.loan_id, l.status as loan_status, l.disbursal_date, l.due_date
      FROM loan_applications la
      LEFT JOIN loans l ON la.loan_id = l.id
      WHERE la.user_id = ?
    `;
    let params = [req.user.id];

    if (status) {
      query += ' AND la.status = ?';
      params.push(status);
    }

    query += ' ORDER BY la.application_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [applications] = await connection.execute(query, params);

    res.json({
      success: true,
      data: applications
    });

  } catch (error) {
    console.error('Get loan applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching loan applications'
    });
  }
});

// GET /api/loans/applications/:id - Get Specific Loan Application
router.get('/applications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await getConnection();

    const [applications] = await connection.execute(
      `SELECT la.*, l.loan_id, l.status as loan_status, l.disbursal_date, l.due_date,
              u.first_name, u.last_name, u.email, u.phone
       FROM loan_applications la
       LEFT JOIN loans l ON la.loan_id = l.id
       LEFT JOIN users u ON la.user_id = u.id
       WHERE la.id = ? AND la.user_id = ?`,
      [id, req.user.id]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loan application not found'
      });
    }

    // Get application documents
    const [documents] = await connection.execute(
      'SELECT * FROM user_documents WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    // Get KYC status
    const [kycStatus] = await connection.execute(
      'SELECT * FROM user_kyc_status WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        application: applications[0],
        documents,
        kyc_status: kycStatus[0] || null
      }
    });

  } catch (error) {
    console.error('Get loan application error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching loan application'
    });
  }
});

// =====================================================
// LOAN MANAGEMENT
// =====================================================

// GET /api/loans - Get User's Active Loans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;

    const connection = await getConnection();

    let query = `
      SELECT l.*, la.loan_purpose, la.application_date
      FROM loans l
      LEFT JOIN loan_applications la ON l.loan_application_id = la.id
      WHERE l.user_id = ?
    `;
    let params = [req.user.id];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [loans] = await connection.execute(query, params);

    res.json({
      success: true,
      data: loans
    });

  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching loans'
    });
  }
});

// GET /api/loans/:id - Get Specific Loan Details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await getConnection();

    const [loans] = await connection.execute(
      `SELECT l.*, la.loan_purpose, la.application_date, la.processing_fee_rate,
              u.first_name, u.last_name, u.email, u.phone
       FROM loans l
       LEFT JOIN loan_applications la ON l.loan_application_id = la.id
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.id = ? AND l.user_id = ?`,
      [id, req.user.id]
    );

    if (loans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    const loan = loans[0];

    // Get loan transactions
    const [transactions] = await connection.execute(
      'SELECT * FROM transactions WHERE loan_id = ? ORDER BY created_at DESC',
      [id]
    );

    // Calculate loan summary
    const paid_amount = transactions
      .filter(t => t.type === 'repayment' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const remaining_amount = parseFloat(loan.total_amount) - paid_amount;
    const days_remaining = Math.max(0, Math.ceil((new Date(loan.due_date) - new Date()) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        loan,
        transactions,
        summary: {
          total_amount: parseFloat(loan.total_amount),
          paid_amount,
          remaining_amount,
          days_remaining,
          is_overdue: days_remaining < 0
        }
      }
    });

  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching loan details'
    });
  }
});

// POST /api/loans/:id/pay - Make Loan Payment
router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method = 'upi', payment_reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const connection = await getConnection();

    // Get loan details
    const [loans] = await connection.execute(
      'SELECT * FROM loans WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (loans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    const loan = loans[0];

    if (loan.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot make payment for inactive loan'
      });
    }

    // Generate transaction reference
    const transaction_reference = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    const [result] = await connection.execute(
      `INSERT INTO transactions (loan_id, user_id, type, amount, payment_method, 
                                payment_reference, transaction_reference, status) 
       VALUES (?, ?, 'repayment', ?, ?, ?, ?, 'pending')`,
      [id, req.user.id, amount, payment_method, payment_reference, transaction_reference]
    );

    const transactionId = result.insertId;

    // TODO: Integrate with actual payment gateway
    // For now, simulate payment processing
    setTimeout(async () => {
      try {
        await connection.execute(
          'UPDATE transactions SET status = "completed", processed_at = NOW() WHERE id = ?',
          [transactionId]
        );

        // Check if loan is fully paid
        const [transactions] = await connection.execute(
          'SELECT SUM(amount) as total_paid FROM transactions WHERE loan_id = ? AND type = "repayment" AND status = "completed"',
          [id]
        );

        const totalPaid = parseFloat(transactions[0].total_paid || 0);
        const loanAmount = parseFloat(loan.total_amount);

        if (totalPaid >= loanAmount) {
          await connection.execute(
            'UPDATE loans SET status = "completed", completed_at = NOW() WHERE id = ?',
            [id]
          );

          // Create completion notification
          await connection.execute(
            `INSERT INTO notifications (user_id, type, title, message, is_read) 
             VALUES (?, 'loan_completed', 'Loan Completed', 
                     'Congratulations! Your loan has been fully repaid.', FALSE)`,
            [req.user.id]
          );
        }

        // Create payment notification
        await connection.execute(
          `INSERT INTO notifications (user_id, type, title, message, is_read) 
           VALUES (?, 'payment_success', 'Payment Successful', 
                   'Your payment of ₹${amount} has been processed successfully.', FALSE)`,
          [req.user.id]
        );
      } catch (error) {
        console.error('Payment processing error:', error);
      }
    }, 3000); // Simulate 3-second payment processing

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        transaction_id: transactionId,
        transaction_reference,
        amount,
        payment_method,
        status: 'pending',
        estimated_completion_time: '3 minutes'
      }
    });

  } catch (error) {
    console.error('Loan payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing payment'
    });
  }
});

// =====================================================
// ELIGIBILITY CHECK
// =====================================================

// POST /api/loans/check-eligibility - Check Loan Eligibility
router.post('/check-eligibility', authenticateToken, async (req, res) => {
  try {
    const { loan_amount, loan_tenure_days = 30 } = req.body;

    if (!loan_amount) {
      return res.status(400).json({
        success: false,
        message: 'Loan amount is required'
      });
    }

    const connection = await getConnection();

    // Get user with complete profile
    const [users] = await connection.execute(
      `SELECT u.*, mt.max_loan_amount, mt.min_loan_amount, mt.max_loan_tenure_days,
              mt.processing_fee_rate, mt.interest_rate_per_day, mt.auto_approval_enabled
       FROM users u 
       LEFT JOIN member_tiers mt ON u.member_id = mt.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Get KYC status
    const [kycStatus] = await connection.execute(
      'SELECT * FROM user_kyc_status WHERE user_id = ?',
      [req.user.id]
    );

    // Get employment details
    const [employment] = await connection.execute(
      'SELECT * FROM user_employment WHERE user_id = ?',
      [req.user.id]
    );

    // Get bank accounts
    const [bankAccounts] = await connection.execute(
      'SELECT * FROM user_bank_accounts WHERE user_id = ? AND status = "active"',
      [req.user.id]
    );

    // Eligibility checks
    const eligibility = {
      is_eligible: true,
      reasons: [],
      warnings: [],
      recommendations: []
    };

    // Check loan amount limits
    if (loan_amount < user.min_loan_amount) {
      eligibility.is_eligible = false;
      eligibility.reasons.push(`Loan amount must be at least ₹${user.min_loan_amount}`);
    }

    if (loan_amount > user.max_loan_amount) {
      eligibility.is_eligible = false;
      eligibility.reasons.push(`Loan amount cannot exceed ₹${user.max_loan_amount} for your member tier`);
    }

    // Check tenure limits
    if (loan_tenure_days > user.max_loan_tenure_days) {
      eligibility.is_eligible = false;
      eligibility.reasons.push(`Loan tenure cannot exceed ${user.max_loan_tenure_days} days`);
    }

    // Check KYC completion
    if (!user.email_verified) {
      eligibility.warnings.push('Email verification pending');
    }

    if (!user.phone_verified) {
      eligibility.warnings.push('Phone verification pending');
    }

    if (kycStatus.length > 0) {
      const kyc = kycStatus[0];
      if (!kyc.pan_verified) {
        eligibility.reasons.push('PAN verification required');
      }
      if (!kyc.aadhaar_verified) {
        eligibility.reasons.push('Aadhaar verification required');
      }
      if (!kyc.bank_account_verified) {
        eligibility.reasons.push('Bank account verification required');
      }
    }

    // Check employment
    if (employment.length === 0) {
      eligibility.reasons.push('Employment details required');
    } else if (!employment[0].employment_verified) {
      eligibility.warnings.push('Employment verification pending');
    }

    // Check bank accounts
    if (bankAccounts.length === 0) {
      eligibility.reasons.push('Bank account required');
    } else {
      const hasVerifiedAccount = bankAccounts.some(account => account.is_verified);
      if (!hasVerifiedAccount) {
        eligibility.warnings.push('Bank account verification required');
      }
    }

    // Calculate loan details if eligible
    let loanDetails = null;
    if (eligibility.is_eligible) {
      const processing_fee = (loan_amount * user.processing_fee_rate) / 100;
      const gst_on_processing_fee = (processing_fee * 18) / 100;
      const total_processing_fee = processing_fee + gst_on_processing_fee;
      const interest_amount = (loan_amount * user.interest_rate_per_day * loan_tenure_days) / 100;
      const total_amount = loan_amount + total_processing_fee + interest_amount;

      loanDetails = {
        loan_amount,
        loan_tenure_days,
        processing_fee_rate: user.processing_fee_rate,
        interest_rate_per_day: user.interest_rate_per_day,
        processing_fee,
        gst_on_processing_fee,
        total_processing_fee,
        interest_amount,
        total_amount,
        auto_approval_eligible: user.auto_approval_enabled
      };
    }

    res.json({
      success: true,
      data: {
        eligibility,
        loan_details: loanDetails,
        user_tier: {
          name: user.tier_name,
          display_name: user.tier_display_name
        }
      }
    });

  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while checking eligibility'
    });
  }
});

module.exports = router;