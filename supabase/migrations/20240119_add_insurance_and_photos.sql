-- Add insurance table
CREATE TABLE professional_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_path TEXT NOT NULL,
  expiry_date DATE,
  insurance_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  notes TEXT
);

-- Add work photos table
CREATE TABLE work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Add indexes for performance
CREATE INDEX idx_insurance_professional_id ON professional_insurance(professional_id);
CREATE INDEX idx_insurance_status ON professional_insurance(status);
CREATE INDEX idx_work_photos_professional_id ON work_photos(professional_id);
CREATE INDEX idx_work_photos_order ON work_photos(order_index);

-- Enable Row Level Security
ALTER TABLE professional_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for insurance" ON professional_insurance
  FOR SELECT USING (true);

CREATE POLICY "Public read access for work photos" ON work_photos
  FOR SELECT USING (true);

-- Create policies for professional write access
CREATE POLICY "Professionals can manage their own insurance" ON professional_insurance
  FOR ALL USING (
    auth.uid() IN (
      SELECT p.profile_id 
      FROM professionals p 
      WHERE p.id = professional_id
    )
  );

CREATE POLICY "Professionals can manage their own work photos" ON work_photos
  FOR ALL USING (
    auth.uid() IN (
      SELECT p.profile_id 
      FROM professionals p 
      WHERE p.id = professional_id
    )
  ); 