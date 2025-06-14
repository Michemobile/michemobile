-- Fix database errors

-- 1. Add missing payment_method column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Card';

-- 2. Create blocked_time_slots table if it doesn't exist
CREATE TABLE IF NOT EXISTS blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Add constraint to ensure end_time is after start_time
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Add RLS policies for blocked_time_slots
ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Allow professionals to manage their own blocked time slots
CREATE POLICY "Professionals can manage their own blocked time slots"
ON blocked_time_slots
FOR ALL
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals
    WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  professional_id IN (
    SELECT id FROM professionals
    WHERE profile_id = auth.uid()
  )
);

-- Allow public to view blocked time slots (for scheduling purposes)
CREATE POLICY "Public can view blocked time slots"
ON blocked_time_slots
FOR SELECT
TO anon, authenticated
USING (true);
