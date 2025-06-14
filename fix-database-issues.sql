-- Fix database issues for Miche Mobile

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Professionals can manage their own blocked time slots" ON blocked_time_slots;
DROP POLICY IF EXISTS "Professionals can insert blocked time slots" ON blocked_time_slots;
DROP POLICY IF EXISTS "Professionals can update blocked time slots" ON blocked_time_slots;
DROP POLICY IF EXISTS "Professionals can delete blocked time slots" ON blocked_time_slots;
DROP POLICY IF EXISTS "Public can view blocked time slots" ON blocked_time_slots;

-- Allow professionals to manage their own blocked time slots
CREATE POLICY "Professionals can insert blocked time slots"
ON blocked_time_slots
FOR INSERT
TO authenticated
WITH CHECK (
  professional_id IN (
    SELECT id FROM professionals
    WHERE profile_id = (select auth.uid())
  )
);

CREATE POLICY "Professionals can update blocked time slots"
ON blocked_time_slots
FOR UPDATE
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals
    WHERE profile_id = (select auth.uid())
  )
);

CREATE POLICY "Professionals can delete blocked time slots"
ON blocked_time_slots
FOR DELETE
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals
    WHERE profile_id = (select auth.uid())
  )
);

-- Allow public to view blocked time slots (for scheduling purposes)
CREATE POLICY "Public can view blocked time slots"
ON blocked_time_slots
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Add missing image column to professionals table
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS image TEXT;

-- 4. Fix storage bucket permissions for profile photos
-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow users to upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to profile photos" ON storage.objects;

-- Create policy to allow authenticated users to upload files to their own folder
CREATE POLICY "Allow users to upload their own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Create policy to allow authenticated users to update their own files
CREATE POLICY "Allow users to update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Create policy to allow authenticated users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (select auth.uid())::text = (storage.foldername(name))[1]
);

-- Create policy to allow public read access to profile photos
CREATE POLICY "Allow public read access to profile photos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'profile-photos'
);
