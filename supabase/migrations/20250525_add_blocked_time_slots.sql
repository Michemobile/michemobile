-- Create blocked_time_slots table for professionals to block out unavailable time slots
CREATE TABLE IF NOT EXISTS blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  
  -- Add a constraint to ensure end_time is after start_time
  CONSTRAINT end_time_after_start_time CHECK (end_time > start_time)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS blocked_time_slots_professional_id_idx ON blocked_time_slots(professional_id);
CREATE INDEX IF NOT EXISTS blocked_time_slots_date_idx ON blocked_time_slots(date);

-- Add RLS (Row Level Security) policies
ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Policy for professionals to see and manage their own blocked time slots
CREATE POLICY blocked_time_slots_professionals_policy ON blocked_time_slots
  FOR ALL
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE profile_id = auth.uid()
    )
  );

-- Policy for admins to see all blocked time slots
CREATE POLICY blocked_time_slots_admin_policy ON blocked_time_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND type = 'admin'
    )
  );
