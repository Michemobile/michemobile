-- Fix missing payment_method column in bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create blocked_time_slots table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.blocked_time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraint to ensure end_time is after start_time
    CONSTRAINT end_time_after_start_time CHECK (end_time > start_time)
);

-- Add image column to professionals table if it doesn't exist
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS image TEXT;

-- Add RLS policies for blocked_time_slots table
ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Policy for professionals to manage their own blocked time slots
CREATE POLICY "Professionals can manage their own blocked time slots"
ON blocked_time_slots
USING (
    professional_id IN (
        SELECT id FROM professionals
        WHERE profile_id = auth.uid()
    )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_professional_date
ON blocked_time_slots(professional_id, date);

-- Grant permissions
GRANT ALL ON blocked_time_slots TO authenticated;
GRANT ALL ON blocked_time_slots TO service_role;
