-- First, add duration column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;

-- Check and enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Professionals can manage their own services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;

-- Create policy for professionals to manage their own services
CREATE POLICY "Professionals can manage their own services" 
ON services
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

-- Create policy for public to view services
CREATE POLICY "Public can view services" 
ON services
FOR SELECT
TO anon, authenticated
USING (true);

-- Grant permissions
GRANT ALL ON services TO authenticated;
GRANT SELECT ON services TO anon;
