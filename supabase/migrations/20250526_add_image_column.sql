-- Add image column to professionals table
-- This fixes the error: "Could not find the 'image' column of 'professionals' in the schema cache"

-- Check if the column already exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'professionals' AND column_name = 'image'
    ) THEN
        -- Add the image column to store profile image URLs
        ALTER TABLE professionals ADD COLUMN image TEXT;
        
        -- Add a comment to document the column's purpose
        COMMENT ON COLUMN professionals.image IS 'URL to the professional''s profile image';
    END IF;
END $$;
