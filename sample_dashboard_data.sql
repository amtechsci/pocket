-- Sample data for testing the dynamic dashboard
-- Run this after the main database schema is set up

USE pocket;

-- First, create a test user (ID 1)
INSERT INTO users (id, phone, first_name, last_name, email, status, profile_completion_step, profile_completed)
VALUES (1, '9876543210', 'Atul', 'Mishra', 'atul.mishra@example.com', 'active', 4, TRUE)
ON DUPLICATE KEY UPDATE 
  first_name = 'Atul',
  last_name = 'Mishra',
  email = 'atul.mishra@example.com',
  status = 'active',
  profile_completion_step = 4,
  profile_completed = TRUE;

-- Insert sample financial details for user
INSERT INTO financial_details (user_id, monthly_income, monthly_expenses, existing_loans, credit_score, financial_verified)
VALUES (1, 75000, 45000, 0, 720, TRUE)
ON DUPLICATE KEY UPDATE 
  monthly_income = 75000,
  monthly_expenses = 45000,
  credit_score = 720,
  financial_verified = TRUE;

-- Insert sample loan application
INSERT INTO loan_applications (user_id, application_number, loan_amount, loan_purpose, tenure_months, interest_rate, emi_amount, status)
VALUES (1, 'APP001', 300000, 'Personal Loan', 24, 12.5, 15000, 'approved')
ON DUPLICATE KEY UPDATE 
  loan_amount = 300000,
  loan_purpose = 'Personal Loan',
  tenure_months = 24,
  interest_rate = 12.5,
  emi_amount = 15000,
  status = 'approved';

-- Insert sample loan
INSERT INTO loans (user_id, loan_application_id, loan_number, loan_amount, disbursed_amount, interest_rate, tenure_months, emi_amount, status, disbursed_at, first_emi_date)
VALUES (1, LAST_INSERT_ID(), 'PL001', 300000, 300000, 12.5, 24, 15000, 'active', '2023-08-15 10:00:00', '2023-09-15')
ON DUPLICATE KEY UPDATE 
  loan_amount = 300000,
  disbursed_amount = 300000,
  interest_rate = 12.5,
  tenure_months = 24,
  emi_amount = 15000,
  status = 'active';

-- Insert sample transactions (EMI payments)
INSERT INTO transactions (user_id, loan_id, transaction_type, amount, transaction_id, payment_method, payment_gateway, status, processed_at)
VALUES 
(1, 1, 'emi_payment', 15000, 'TXN001', 'upi', 'razorpay', 'success', '2023-09-15 10:00:00'),
(1, 1, 'emi_payment', 15000, 'TXN002', 'upi', 'razorpay', 'success', '2023-10-15 10:00:00'),
(1, 1, 'emi_payment', 15000, 'TXN003', 'upi', 'razorpay', 'success', '2023-11-15 10:00:00'),
(1, 1, 'emi_payment', 15000, 'TXN004', 'upi', 'razorpay', 'success', '2023-12-15 10:00:00')
ON DUPLICATE KEY UPDATE 
  status = 'success';

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, notification_type, channel, status, sent_at)
VALUES 
(1, 'EMI Payment Successful', 'Your EMI payment of ₹15,000 has been processed successfully.', 'success', 'in_app', 'delivered', NOW()),
(1, 'Credit Score Updated', 'Your credit score has been updated to 720. Great job!', 'info', 'in_app', 'delivered', NOW()),
(1, 'Loan Application Approved', 'Congratulations! Your loan application has been approved.', 'success', 'in_app', 'delivered', NOW())
ON DUPLICATE KEY UPDATE 
  status = 'delivered';

-- Insert sample bank details
INSERT INTO bank_details (user_id, bank_name, account_number, ifsc_code, account_holder_name, account_type, branch_name, is_primary, is_verified)
VALUES (1, 'HDFC Bank', '1234567890', 'HDFC0001234', 'Atul Mishra', 'savings', 'Main Branch', TRUE, TRUE)
ON DUPLICATE KEY UPDATE 
  is_verified = TRUE;

-- User profile is already set above
