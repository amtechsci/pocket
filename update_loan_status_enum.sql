-- Update loan_applications status ENUM to include bank_details_provided
USE pocket_loan;

-- Add bank_details_provided to the status ENUM
ALTER TABLE loan_applications 
MODIFY COLUMN status ENUM(
  'draft', 
  'submitted', 
  'bank_details_provided',
  'under_review', 
  'approved', 
  'rejected', 
  'disbursed'
) DEFAULT 'draft';
