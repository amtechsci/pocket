-- Add bank_id column to loan_applications table
USE pocket_loan;

-- Add bank_id column
ALTER TABLE loan_applications 
ADD COLUMN bank_id INT NULL;

-- Add foreign key constraint
ALTER TABLE loan_applications 
ADD CONSTRAINT fk_loan_applications_bank_id 
FOREIGN KEY (bank_id) REFERENCES bank_details(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_loan_applications_bank_id ON loan_applications(bank_id);
