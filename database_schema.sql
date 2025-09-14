-- =====================================================
-- Pocket Credit Database Schema
-- Complete table creation script
-- =====================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS pocket CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pocket;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    date_of_birth DATE NULL,
    gender ENUM('male', 'female', 'other') NULL,
    marital_status ENUM('single', 'married', 'divorced', 'widowed') NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_completed BOOLEAN DEFAULT FALSE,
    profile_completion_step INT DEFAULT 1,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_profile_completion_step (profile_completion_step)
);

-- =====================================================
-- 2. EMPLOYMENT DETAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employment_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    employment_type ENUM('salaried', 'self_employed', 'business', 'unemployed') NOT NULL,
    company_name VARCHAR(255),
    designation VARCHAR(100),
    monthly_salary DECIMAL(12,2),
    work_experience_years INT DEFAULT 0,
    work_experience_months INT DEFAULT 0,
    salary_date INT CHECK (salary_date >= 1 AND salary_date <= 31),
    employment_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_employment_type (employment_type),
    INDEX idx_verified (employment_verified)
);

-- =====================================================
-- 3. FINANCIAL DETAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    monthly_income DECIMAL(12,2),
    monthly_expenses DECIMAL(12,2),
    existing_loans DECIMAL(12,2) DEFAULT 0,
    credit_score INT,
    financial_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_verified (financial_verified)
);

-- =====================================================
-- 3.1. BANK DETAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_type ENUM('savings', 'current', 'salary') DEFAULT 'savings',
    branch_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_primary_account (is_primary),
    INDEX idx_verified (is_verified),
    INDEX idx_bank_name (bank_name)
);

-- =====================================================
-- 4. LOAN APPLICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    application_number VARCHAR(20) UNIQUE NOT NULL,
    loan_amount DECIMAL(12,2) NOT NULL,
    loan_purpose VARCHAR(255),
    tenure_months INT NOT NULL,
    interest_rate DECIMAL(5,2),
    emi_amount DECIMAL(12,2),
    status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed') DEFAULT 'draft',
    rejection_reason TEXT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    disbursed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_application_number (application_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 5. VERIFICATION RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    document_type ENUM('pan', 'aadhaar', 'address_proof', 'bank_statement', 'salary_slip') NOT NULL,
    document_number VARCHAR(100),
    document_path VARCHAR(500),
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_document_type (document_type),
    INDEX idx_verification_status (verification_status)
);

-- =====================================================
-- 6. VIDEO KYC RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS video_kyc_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    video_path VARCHAR(500),
    status ENUM('scheduled', 'in_progress', 'completed', 'failed') DEFAULT 'scheduled',
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    scheduled_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status),
    INDEX idx_verification_status (verification_status)
);

-- =====================================================
-- 7. DIGITAL SIGNATURES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS digital_signatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    signature_data LONGTEXT,
    signature_type ENUM('biometric', 'digital', 'otp_verified') NOT NULL,
    document_type VARCHAR(100),
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_signature_type (signature_type),
    INDEX idx_verification_status (verification_status)
);

-- =====================================================
-- 8. LOANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_application_id INT NOT NULL,
    loan_number VARCHAR(20) UNIQUE NOT NULL,
    loan_amount DECIMAL(12,2) NOT NULL,
    disbursed_amount DECIMAL(12,2),
    interest_rate DECIMAL(5,2) NOT NULL,
    tenure_months INT NOT NULL,
    emi_amount DECIMAL(12,2) NOT NULL,
    status ENUM('active', 'closed', 'defaulted', 'written_off') DEFAULT 'active',
    disbursed_at TIMESTAMP NULL,
    first_emi_date DATE,
    last_emi_date DATE,
    closed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_loan_number (loan_number),
    INDEX idx_status (status),
    INDEX idx_disbursed_at (disbursed_at)
);

-- =====================================================
-- 9. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_id INT,
    transaction_type ENUM('disbursement', 'emi_payment', 'prepayment', 'penalty', 'refund') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE,
    payment_method ENUM('upi', 'net_banking', 'card', 'nacha', 'cash') NOT NULL,
    payment_gateway VARCHAR(100),
    gateway_transaction_id VARCHAR(200),
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    failure_reason TEXT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_loan_id (loan_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 10. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
    channel ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 11. ADMIN USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'admin', 'manager', 'support') DEFAULT 'support',
    permissions JSON,
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- =====================================================
-- 12. API LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_body JSON,
    response_body JSON,
    status_code INT,
    response_time_ms INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_endpoint (endpoint),
    INDEX idx_status_code (status_code),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 13. SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key),
    INDEX idx_is_public (is_public)
);

-- =====================================================
-- 14. MEMBER TIERS TABLE (for user tier system)
-- =====================================================
CREATE TABLE IF NOT EXISTS member_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tier_name VARCHAR(50) UNIQUE NOT NULL,
    tier_display_name VARCHAR(100) NOT NULL,
    max_loan_amount_type ENUM('fixed', 'percentage') DEFAULT 'fixed',
    max_loan_amount DECIMAL(12,2) NOT NULL,
    interest_rate_daily DECIMAL(8,4) NOT NULL,
    processing_fee DECIMAL(5,2) NOT NULL,
    benefits JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tier_name (tier_name),
    INDEX idx_is_active (is_active),
    INDEX idx_loan_amount_type (max_loan_amount_type)
);

-- =====================================================
-- 15. ADDRESSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address_type ENUM('current', 'permanent', 'office') DEFAULT 'current',
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    is_primary BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_address_type (address_type),
    INDEX idx_is_primary (is_primary)
);

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default member tiers
INSERT INTO member_tiers (tier_name, tier_display_name, max_loan_amount_type, max_loan_amount, interest_rate_daily, processing_fee, benefits) VALUES
('bronze', 'Bronze Member', 'fixed', 500000, 0.0411, 2.0, '{"features": ["Basic loan processing", "Standard customer support"], "discounts": []}'),
('silver', 'Silver Member', 'percentage', 80, 0.0342, 1.5, '{"features": ["Priority processing", "Dedicated support"], "discounts": ["Processing fee discount"]}'),
('gold', 'Gold Member', 'percentage', 120, 0.0274, 1.0, '{"features": ["VIP processing", "Personal loan manager"], "discounts": ["Processing fee waiver", "Interest rate discount"]}'),
('platinum', 'Platinum Member', 'fixed', 5000000, 0.0205, 0.5, '{"features": ["Instant approval", "Premium support", "Custom rates"], "discounts": ["All fees waived", "Best rates"]}');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, data_type, is_public) VALUES
('app_name', 'Pocket Credit', 'Application name', 'string', TRUE),
('app_version', '1.0.0', 'Application version', 'string', TRUE),
('max_loan_amount', '5000000', 'Maximum loan amount allowed', 'number', TRUE),
('min_loan_amount', '50000', 'Minimum loan amount allowed', 'number', TRUE),
('default_interest_rate', '15.0', 'Default interest rate percentage', 'number', TRUE),
('processing_fee_rate', '2.0', 'Default processing fee percentage', 'number', TRUE),
('otp_expiry_minutes', '5', 'OTP expiry time in minutes', 'number', FALSE),
('max_login_attempts', '5', 'Maximum login attempts before lockout', 'number', FALSE);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, permissions) VALUES
('admin@pocketcredit.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'super_admin', '{"all": true}');

-- =====================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- User profile view with all related information
CREATE VIEW user_profiles AS
SELECT 
    u.id,
    u.email,
    u.phone,
    u.first_name,
    u.last_name,
    u.date_of_birth,
    u.gender,
    u.marital_status,
    u.status,
    u.email_verified,
    u.phone_verified,
    u.kyc_completed,
    u.created_at,
    u.last_login_at,
    ed.employment_type,
    ed.company_name,
    ed.designation,
    ed.monthly_salary,
    ed.work_experience_years,
    ed.work_experience_months,
    ed.employment_verified,
    fd.monthly_income,
    fd.monthly_expenses,
    fd.existing_loans,
    fd.credit_score,
    fd.bank_name,
    fd.account_number,
    fd.ifsc_code,
    fd.account_holder_name,
    fd.account_type,
    fd.financial_verified
FROM users u
LEFT JOIN employment_details ed ON u.id = ed.user_id
LEFT JOIN financial_details fd ON u.id = fd.user_id;

-- Loan applications with user details
CREATE VIEW loan_application_details AS
SELECT 
    la.id,
    la.user_id,
    la.application_number,
    la.loan_amount,
    la.loan_purpose,
    la.tenure_months,
    la.interest_rate,
    la.emi_amount,
    la.status,
    la.rejection_reason,
    la.approved_at,
    la.disbursed_at,
    la.created_at,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    ed.company_name,
    ed.monthly_salary
FROM loan_applications la
JOIN users u ON la.user_id = u.id
LEFT JOIN employment_details ed ON u.id = ed.user_id;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
