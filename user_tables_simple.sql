-- =====================================================
-- CORE USER TABLES - POCKET CREDIT LENDING PLATFORM
-- Spheeti Fintech Private Limited
-- =====================================================

-- 1. USERS TABLE - Main user profile and authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    marital_status ENUM('single', 'married', 'divorced', 'widowed') DEFAULT 'single',
    
    -- Account Status
    status ENUM('active', 'inactive', 'suspended', 'blocked') DEFAULT 'active',
    member_tier ENUM('new', 'regular', 'premium', 'vip', 'gold') DEFAULT 'new',
    
    -- Verification Status
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_completed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_member_tier (member_tier),
    INDEX idx_created_at (created_at)
);

-- 2. USER ADDRESSES TABLE - Current and permanent addresses
CREATE TABLE user_addresses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Address Type
    address_type ENUM('current', 'permanent', 'office') NOT NULL,
    
    -- Address Details
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_address_type (address_type),
    INDEX idx_city (city),
    INDEX idx_pincode (pincode)
);

-- 3. USER EMPLOYMENT TABLE - Job and salary information
CREATE TABLE user_employment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Employment Details
    employment_type ENUM('salaried', 'self_employed', 'business', 'unemployed') NOT NULL,
    company_name VARCHAR(255),
    designation VARCHAR(255),
    work_experience_years INT DEFAULT 0,
    work_experience_months INT DEFAULT 0,
    
    -- Salary Information
    monthly_salary DECIMAL(12,2),
    salary_date INT DEFAULT 1, -- Day of month when salary is credited
    
    -- Company Details
    company_address TEXT,
    company_phone VARCHAR(15),
    company_email VARCHAR(255),
    
    -- Verification
    employment_verified BOOLEAN DEFAULT FALSE,
    salary_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_employment_type (employment_type),
    INDEX idx_company_name (company_name),
    INDEX idx_monthly_salary (monthly_salary)
);

-- 4. USER BANK ACCOUNTS TABLE - Bank account details
CREATE TABLE user_bank_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Bank Details
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_type ENUM('savings', 'current', 'salary') DEFAULT 'savings',
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method ENUM('micro_deposit', 'instant', 'manual') DEFAULT 'instant',
    verified_at TIMESTAMP NULL,
    
    -- Status
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_bank_name (bank_name),
    INDEX idx_account_number (account_number),
    INDEX idx_ifsc_code (ifsc_code),
    INDEX idx_is_primary (is_primary),
    INDEX idx_status (status)
);

-- 5. USER DOCUMENTS TABLE - KYC documents and files
CREATE TABLE user_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Document Details
    document_type ENUM('pan_card', 'aadhaar_front', 'aadhaar_back', 'voter_id', 'driving_license', 'passport', 'salary_slip', 'bank_statement', 'company_id', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status ENUM('pending', 'verified', 'rejected', 'expired') DEFAULT 'pending',
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    
    -- Metadata
    upload_source ENUM('manual', 'digilocker', 'auto_fetch') DEFAULT 'manual',
    metadata JSON, -- Store additional document-specific data
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_document_type (document_type),
    INDEX idx_verification_status (verification_status),
    INDEX idx_is_verified (is_verified),
    INDEX idx_created_at (created_at)
);

-- 6. USER KYC STATUS TABLE - KYC verification status tracking
CREATE TABLE user_kyc_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- KYC Status
    overall_status ENUM('not_started', 'in_progress', 'completed', 'failed', 'expired') DEFAULT 'not_started',
    completion_percentage INT DEFAULT 0,
    
    -- Individual Verification Status
    pan_verified BOOLEAN DEFAULT FALSE,
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    address_verified BOOLEAN DEFAULT FALSE,
    bank_account_verified BOOLEAN DEFAULT FALSE,
    employment_verified BOOLEAN DEFAULT FALSE,
    video_kyc_verified BOOLEAN DEFAULT FALSE,
    
    -- Verification Scores
    pan_score DECIMAL(5,2) DEFAULT 0,
    aadhaar_score DECIMAL(5,2) DEFAULT 0,
    address_score DECIMAL(5,2) DEFAULT 0,
    bank_score DECIMAL(5,2) DEFAULT 0,
    employment_score DECIMAL(5,2) DEFAULT 0,
    video_kyc_score DECIMAL(5,2) DEFAULT 0,
    overall_score DECIMAL(5,2) DEFAULT 0,
    
    -- Risk Assessment
    risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    risk_score DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_overall_status (overall_status),
    INDEX idx_completion_percentage (completion_percentage),
    INDEX idx_risk_level (risk_level),
    INDEX idx_overall_score (overall_score)
);

-- 7. USER VERIFICATIONS TABLE - OTP, email, phone verification logs
CREATE TABLE user_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Verification Details
    verification_type ENUM('email', 'phone', 'otp', 'digilocker', 'bank_api', 'credit_bureau') NOT NULL,
    verification_method ENUM('otp', 'link', 'api', 'manual') NOT NULL,
    
    -- Verification Data
    verification_code VARCHAR(255), -- OTP code or verification token
    verification_reference VARCHAR(255), -- External reference ID
    
    -- Status
    status ENUM('pending', 'verified', 'failed', 'expired', 'cancelled') DEFAULT 'pending',
    attempts_count INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    -- Metadata
    metadata JSON, -- Store API responses and additional data
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_verification_type (verification_type),
    INDEX idx_status (status),
    INDEX idx_verification_code (verification_code),
    INDEX idx_created_at (created_at)
);

-- 8. USER SESSIONS TABLE - Login sessions and tokens
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Session Details
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_type ENUM('web', 'mobile', 'api') DEFAULT 'web',
    device_info TEXT, -- Store device fingerprint or info
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Status
    status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    is_primary BOOLEAN DEFAULT FALSE, -- Primary session for user
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_activity (last_activity_at)
);

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample admin user
INSERT INTO users (email, phone, password_hash, first_name, last_name, date_of_birth, gender, email_verified, phone_verified, member_tier) VALUES
('admin@pocketcredit.com', '+919876543210', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', '1990-01-01', 'male', TRUE, TRUE, 'premium');

-- Insert sample regular user
INSERT INTO users (email, phone, password_hash, first_name, last_name, date_of_birth, gender, email_verified, phone_verified, member_tier) VALUES
('user@example.com', '+919876543211', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', '1995-05-15', 'male', TRUE, TRUE, 'new');

-- Insert sample address for user
INSERT INTO user_addresses (user_id, address_type, address_line1, city, state, pincode, is_verified) VALUES
(2, 'current', '123 Main Street', 'Mumbai', 'Maharashtra', '400001', TRUE);

-- Insert sample employment for user
INSERT INTO user_employment (user_id, employment_type, company_name, designation, work_experience_years, monthly_salary, employment_verified) VALUES
(2, 'salaried', 'Tech Corp', 'Software Engineer', 3, 75000.00, TRUE);

-- Insert sample bank account for user
INSERT INTO user_bank_accounts (user_id, bank_name, account_number, ifsc_code, account_holder_name, account_type, is_verified, is_primary) VALUES
(2, 'State Bank of India', '123456789012', 'SBIN0001234', 'John Doe', 'savings', TRUE, TRUE);

-- Insert sample KYC status for user
INSERT INTO user_kyc_status (user_id, overall_status, completion_percentage, pan_verified, aadhaar_verified, address_verified, bank_account_verified, employment_verified, overall_score, risk_level) VALUES
(2, 'completed', 100, TRUE, TRUE, TRUE, TRUE, TRUE, 95.50, 'low');
