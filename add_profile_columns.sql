-- Add missing profile completion columns to users table
-- Run this script in your MySQL database

USE pocket;

-- Add profile completion columns (PAN stored in verification_records table)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_completion_step INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Add index for profile_completion_step
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_profile_completion_step (profile_completion_step);

-- Update existing users to have profile_completion_step = 2 if they have basic info
UPDATE users 
SET profile_completion_step = 2 
WHERE (first_name IS NOT NULL AND first_name != '') 
  AND (last_name IS NOT NULL AND last_name != '') 
  AND (email IS NOT NULL AND email != '')
  AND profile_completion_step = 1;

-- Set profile_completed = true for users with complete profiles
UPDATE users 
SET profile_completed = TRUE 
WHERE profile_completion_step >= 4;

-- Show the updated table structure
DESCRIBE users;
