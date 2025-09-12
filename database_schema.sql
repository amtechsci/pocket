-- =====================================================
-- AUTOMATED LENDING PLATFORM DATABASE SCHEMA
-- Spheeti Fintech Private Limited (Pocket Credit)
-- =====================================================

-- Users Table - Core user information
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    marital_status ENUM('single', 'married', 'divorced', 'widowed') DEFAULT 'single',
    
    -- Address Information
    current_address TEXT NOT NULL,
    current_city VARCHAR(100) NOT NULL,
    current_state VARCHAR(100) NOT NULL,
    current_pincode VARCHAR(10) NOT NULL,
    permanent_address TEXT,
    permanent_city VARCHAR(100),
    permanent_state VARCHAR(100),
    permanent_pincode VARCHAR(10),
    
    -- Verification Status
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_verified BOOLEAN DEFAULT FALSE,
    video_kyc_verified BOOLEAN DEFAULT FALSE,
    
    -- Account Status
    status ENUM('active', 'inactive', 'suspended', 'blocked') DEFAULT 'active',
    member_tier ENUM('new', 'regular', 'premium', 'vip', 'gold') DEFAULT 'new',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status)
);

-- Employment Details Table
CREATE TABLE employment_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    employment_type ENUM('salaried', 'self_employed', 'business', 'unemployed') NOT NULL,
    company_name VARCHAR(255),
    designation VARCHAR(255),
    work_experience_years INT DEFAULT 0,
    monthly_salary DECIMAL(12,2),
    salary_date INT DEFAULT 1,
    company_address TEXT,
    company_phone VARCHAR(15),
    
    -- Verification
    employment_verified BOOLEAN DEFAULT FALSE,
    salary_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Financial Information Table
CREATE TABLE financial_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- PAN Details
    pan_number VARCHAR(10) UNIQUE NOT NULL,
    pan_name VARCHAR(255),
    pan_verified BOOLEAN DEFAULT FALSE,
    
    -- Bank Account Details
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    account_type ENUM('savings', 'current', 'salary') DEFAULT 'savings',
    bank_verified BOOLEAN DEFAULT FALSE,
    
    -- Credit Information
    credit_score INT DEFAULT 0,
    credit_bureau VARCHAR(100),
    credit_report_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_pan (pan_number),
    INDEX idx_bank_account (account_number, ifsc_code)
);

-- Loan Applications Table
CREATE TABLE loan_applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    application_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Loan Details
    requested_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2) DEFAULT 0,
    loan_purpose TEXT NOT NULL,
    tenure_days INT DEFAULT 30,
    
    -- Interest and Fees
    interest_rate DECIMAL(5,2) DEFAULT 0.10, -- 0.1% per day
    processing_fee_rate DECIMAL(5,2) DEFAULT 13.00, -- 13%
    processing_fee_amount DECIMAL(12,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    total_charges DECIMAL(12,2) DEFAULT 0,
    
    -- Application Status
    status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed', 'completed', 'defaulted') DEFAULT 'draft',
    
    -- Automated Processing
    auto_approved BOOLEAN DEFAULT FALSE,
    risk_score DECIMAL(5,2) DEFAULT 0,
    eligibility_score DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    submitted_at TIMESTAMP NULL,
    approved_at TIMESTAMP NULL,
    disbursed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_application_number (application_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Verification Records Table
CREATE TABLE verification_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    application_id INT,
    
    -- Verification Types
    verification_type ENUM('digilocker', 'otp_phone', 'otp_email', 'bank_api', 'video_kyc', 'digital_signature', 'credit_bureau') NOT NULL,
    
    -- Verification Details
    verification_status ENUM('pending', 'in_progress', 'verified', 'failed', 'expired') DEFAULT 'pending',
    verification_reference VARCHAR(255),
    verification_data JSON, -- Store API responses and verification details
    
    -- Error Handling
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_application_id (application_id),
    INDEX idx_verification_type (verification_type),
    INDEX idx_status (verification_status)
);

-- Video KYC Records Table
CREATE TABLE video_kyc_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    application_id INT,
    
    -- Video Details
    video_url VARCHAR(500),
    video_duration INT, -- in seconds
    video_size BIGINT, -- in bytes
    
    -- AI Processing
    face_detection_score DECIMAL(5,2),
    liveness_score DECIMAL(5,2),
    aadhaar_match_score DECIMAL(5,2),
    overall_score DECIMAL(5,2),
    
    -- Processing Status
    processing_status ENUM('uploaded', 'processing', 'completed', 'failed') DEFAULT 'uploaded',
    processing_result JSON, -- Store AI analysis results
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_application_id (application_id)
);

-- Digital Signatures Table
CREATE TABLE digital_signatures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    application_id INT,
    
    -- Signature Details
    signature_type ENUM('aadhaar_otp', 'biometric', 'dsc') DEFAULT 'aadhaar_otp',
    signature_data TEXT, -- Encrypted signature data
    signature_hash VARCHAR(255), -- Hash for verification
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verification_reference VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_application_id (application_id)
);

-- Loans Table (Active Loans)
CREATE TABLE loans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    user_id INT NOT NULL,
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Loan Details
    principal_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    tenure_days INT NOT NULL,
    disbursed_amount DECIMAL(12,2) NOT NULL,
    
    -- Repayment Details
    total_amount_due DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    outstanding_amount DECIMAL(12,2) NOT NULL,
    
    -- Status
    status ENUM('active', 'completed', 'defaulted', 'written_off') DEFAULT 'active',
    
    -- Dates
    disbursement_date DATE NOT NULL,
    due_date DATE NOT NULL,
    completed_date DATE NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (application_id) REFERENCES loan_applications(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_loan_number (loan_number),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);

-- Transactions Table
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    loan_id INT NOT NULL,
    user_id INT NOT NULL,
    transaction_type ENUM('disbursement', 'repayment', 'fee', 'penalty', 'refund') NOT NULL,
    
    -- Transaction Details
    amount DECIMAL(12,2) NOT NULL,
    transaction_reference VARCHAR(255),
    payment_method ENUM('upi', 'net_banking', 'nach', 'wallet', 'card') NOT NULL,
    
    -- Gateway Details
    gateway_name VARCHAR(100),
    gateway_transaction_id VARCHAR(255),
    gateway_response JSON,
    
    -- Status
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_loan_id (loan_id),
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Notifications Table
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Notification Details
    type ENUM('sms', 'email', 'push', 'in_app') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Delivery Status
    status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    
    -- Metadata
    metadata JSON, -- Store additional data like template variables
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Admin Users Table
CREATE TABLE admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Permissions
    role ENUM('super_admin', 'admin', 'manager', 'agent') DEFAULT 'agent',
    permissions JSON, -- Store specific permissions
    
    -- Status
    status ENUM('active', 'inactive') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- API Logs Table (For monitoring and debugging)
CREATE TABLE api_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    application_id INT,
    
    -- Request Details
    endpoint VARCHAR(255) NOT NULL,
    method ENUM('GET', 'POST', 'PUT', 'DELETE') NOT NULL,
    request_data JSON,
    response_data JSON,
    
    -- Performance
    response_time_ms INT,
    status_code INT,
    
    -- Error Handling
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_application_id (application_id),
    INDEX idx_endpoint (endpoint),
    INDEX idx_created_at (created_at)
);

-- System Settings Table
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX idx_users_status_tier ON users(status, member_tier);
CREATE INDEX idx_loans_user_status ON loans(user_id, status);
CREATE INDEX idx_transactions_loan_type ON transactions(loan_id, transaction_type);
CREATE INDEX idx_verification_user_type ON verification_records(user_id, verification_type);

-- =====================================================
-- INITIAL SYSTEM SETTINGS
-- =====================================================

INSERT INTO system_settings (setting_key, setting_value, description, data_type) VALUES
('max_loan_amount', '500000', 'Maximum loan amount allowed', 'number'),
('min_loan_amount', '5000', 'Minimum loan amount allowed', 'number'),
('default_tenure_days', '30', 'Default loan tenure in days', 'number'),
('processing_fee_rate_new', '14.00', 'Processing fee rate for new members (%)', 'number'),
('processing_fee_rate_regular', '13.00', 'Processing fee rate for regular members (%)', 'number'),
('processing_fee_rate_premium', '13.00', 'Processing fee rate for premium members (%)', 'number'),
('processing_fee_rate_vip', '12.00', 'Processing fee rate for VIP members (%)', 'number'),
('processing_fee_rate_gold', '14.00', 'Processing fee rate for gold members (%)', 'number'),
('interest_rate_new', '0.10', 'Interest rate for new members (% per day)', 'number'),
('interest_rate_regular', '0.10', 'Interest rate for regular members (% per day)', 'number'),
('interest_rate_premium', '0.05', 'Interest rate for premium members (% per day)', 'number'),
('interest_rate_vip', '0.10', 'Interest rate for VIP members (% per day)', 'number'),
('interest_rate_gold', '0.10', 'Interest rate for gold members (% per day)', 'number'),
('gst_rate', '18.00', 'GST rate (%)', 'number'),
('auto_approval_threshold', '750', 'Minimum credit score for auto approval', 'number'),
('video_kyc_timeout', '300', 'Video KYC session timeout in seconds', 'number'),
('otp_expiry_minutes', '10', 'OTP expiry time in minutes', 'number'),
('max_verification_retries', '3', 'Maximum verification retry attempts', 'number');
