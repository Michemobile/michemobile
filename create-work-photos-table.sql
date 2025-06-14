-- Create work_photos table for professionals to showcase their work
CREATE TABLE IF NOT EXISTS work_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER DEFAULT 0
);

-- Create RLS policies for work_photos table
ALTER TABLE work_photos ENABLE ROW LEVEL SECURITY;

-- Policy for selecting work photos (public read access)
CREATE POLICY "Work photos are viewable by everyone" 
ON work_photos FOR SELECT 
USING (true);

-- Policy for inserting work photos (only the professional can add their own photos)
CREATE POLICY "Professionals can add their own work photos" 
ON work_photos FOR INSERT 
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE profile_id = auth.uid()
  )
);

-- Policy for updating work photos (only the professional can update their own photos)
CREATE POLICY "Professionals can update their own work photos" 
ON work_photos FOR UPDATE 
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE profile_id = auth.uid()
  )
);

-- Policy for deleting work photos (only the professional can delete their own photos)
CREATE POLICY "Professionals can delete their own work photos" 
ON work_photos FOR DELETE 
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals 
    WHERE profile_id = auth.uid()
  )
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS work_photos_professional_id_idx ON work_photos(professional_id);
