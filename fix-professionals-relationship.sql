-- Fix the relationship between professionals and profiles tables

-- First, make sure the image column exists in the professionals table
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS image TEXT NULL;

-- Check if the foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'professionals_profile_id_fkey' 
    AND table_name = 'professionals'
  ) THEN
    -- Add foreign key constraint if it doesn't exist
    ALTER TABLE professionals 
    ADD CONSTRAINT professionals_profile_id_fkey 
    FOREIGN KEY (profile_id) 
    REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Create proper index for the relationship
CREATE INDEX IF NOT EXISTS idx_professionals_profile_id ON professionals(profile_id);

-- Update storage bucket permissions to fix RLS policy violations
BEGIN;
  -- Update storage bucket policies for profiles bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('profiles', 'profiles', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  -- Update storage bucket policies for professional-documents bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('professional-documents', 'professional-documents', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  -- Create policy to allow authenticated users to upload to profiles bucket
  DROP POLICY IF EXISTS "Allow authenticated users to upload their own profile images" ON storage.objects;
  CREATE POLICY "Allow authenticated users to upload their own profile images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Create policy to allow authenticated users to read from profiles bucket
  DROP POLICY IF EXISTS "Allow public read access to profile images" ON storage.objects;
  CREATE POLICY "Allow public read access to profile images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'profiles');

  -- Create policy to allow professionals to upload documents
  DROP POLICY IF EXISTS "Allow professionals to upload their documents" ON storage.objects;
  CREATE POLICY "Allow professionals to upload their documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'professional-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM professionals WHERE profile_id = auth.uid()
    )
  );

  -- Create policy to allow public read access to professional documents
  DROP POLICY IF EXISTS "Allow public read access to professional documents" ON storage.objects;
  CREATE POLICY "Allow public read access to professional documents"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'professional-documents');
COMMIT;
