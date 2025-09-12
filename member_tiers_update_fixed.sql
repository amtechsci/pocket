-- Step 1: Create member_tiers table
CREATE TABLE member_tiers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_loan_amount DECIMAL(12,2) DEFAULT 500000,
    min_loan_amount DECIMAL(12,2) DEFAULT 5000,
    max_loan_tenure_days INT DEFAULT 30,
    processing_fee_rate DECIMAL(5,2) DEFAULT 13.00,
    interest_rate_per_day DECIMAL(5,2) DEFAULT 0.10,
    priority_level INT DEFAULT 1,
    max_concurrent_loans INT DEFAULT 1,
    max_monthly_applications INT DEFAULT 2,
    auto_approval_enabled BOOLEAN DEFAULT FALSE,
    instant_disbursal BOOLEAN DEFAULT FALSE,
    video_kyc_required BOOLEAN DEFAULT TRUE,
    credit_score_required BOOLEAN DEFAULT TRUE,
    min_credit_score INT DEFAULT 600,
    status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_priority_level (priority_level),
    INDEX idx_is_default (is_default)
);

-- Step 2: Insert default member tiers
INSERT INTO member_tiers (name, display_name, description, max_loan_amount, processing_fee_rate, interest_rate_per_day, priority_level, auto_approval_enabled, is_default) VALUES
('new', 'New Member', 'New customers with basic benefits', 100000, 14.00, 0.10, 1, FALSE, TRUE);

INSERT INTO member_tiers (name, display_name, description, max_loan_amount, processing_fee_rate, interest_rate_per_day, priority_level, auto_approval_enabled, is_default) VALUES
('regular', 'Regular Member', 'Regular customers with standard benefits', 300000, 13.00, 0.10, 2, FALSE, FALSE);

INSERT INTO member_tiers (name, display_name, description, max_loan_amount, processing_fee_rate, interest_rate_per_day, priority_level, auto_approval_enabled, is_default) VALUES
('premium', 'Premium Member', 'Premium customers with enhanced benefits', 500000, 13.00, 0.05, 3, TRUE, FALSE);

INSERT INTO member_tiers (name, display_name, description, max_loan_amount, processing_fee_rate, interest_rate_per_day, priority_level, auto_approval_enabled, is_default) VALUES
('vip', 'VIP Member', 'VIP customers with exclusive benefits', 500000, 12.00, 0.10, 4, TRUE, FALSE);

INSERT INTO member_tiers (name, display_name, description, max_loan_amount, processing_fee_rate, interest_rate_per_day, priority_level, auto_approval_enabled, is_default) VALUES
('gold', 'Gold Member', 'Gold tier customers with premium benefits', 500000, 14.00, 0.10, 5, TRUE, FALSE);

-- Step 3: Add member_id column to users table
ALTER TABLE users ADD COLUMN member_id INT DEFAULT 1 AFTER member_tier;

-- Step 4: Add foreign key constraint
ALTER TABLE users ADD FOREIGN KEY (member_id) REFERENCES member_tiers(id);

-- Step 5: Update existing users to use member_id instead of member_tier
UPDATE users SET member_id = 1 WHERE member_tier = 'new';

UPDATE users SET member_id = 2 WHERE member_tier = 'regular';

UPDATE users SET member_id = 3 WHERE member_tier = 'premium';

UPDATE users SET member_id = 4 WHERE member_tier = 'vip';

UPDATE users SET member_id = 5 WHERE member_tier = 'gold';

-- Step 6: Drop the old member_tier column
ALTER TABLE users DROP COLUMN member_tier;

-- Step 7: Update the index
DROP INDEX idx_member_tier ON users;

CREATE INDEX idx_member_id ON users(member_id);
