-- Add duration column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
