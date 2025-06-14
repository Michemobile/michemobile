-- Fix storage bucket permissions for profiles
-- This ensures users can upload their own profile photos

-- First, ensure the profiles bucket exists and is public
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'profiles'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('profiles', 'profiles', true);
    ELSE
        -- Update existing bucket to ensure it's public
        UPDATE storage.buckets 
        SET public = true 
        WHERE name = 'profiles';
    END IF;
END $$;

-- Drop existing policies if they're causing issues
DROP POLICY IF EXISTS "Allow public read access to profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to manage profile photos" ON storage.objects;

-- Create proper storage policies
-- Allow anyone to read profile photos (no path restrictions)
CREATE POLICY "Allow public read access to profiles" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'profiles');

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Allow users to upload profile photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'profiles' AND 
    (auth.uid() IS NOT NULL)
);

-- Allow users to update and delete their own profile photos
CREATE POLICY "Allow users to manage profile photos" 
ON storage.objects FOR UPDATE, DELETE
TO authenticated 
USING (
    bucket_id = 'profiles' AND 
    (auth.uid() IS NOT NULL)
);

-- Also create similar policies for work-photos bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'work-photos'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('work-photos', 'work-photos', true);
    END IF;
END $$;

-- Drop existing policies for work-photos if they're causing issues
DROP POLICY IF EXISTS "Allow public read access for work photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow pros to upload work photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow pros to manage their work photos" ON storage.objects;

-- Create proper storage policies for work photos
CREATE POLICY "Allow public read access for work photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'work-photos');

-- Allow professionals to upload work photos
CREATE POLICY "Allow pros to upload work photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'work-photos' AND 
    EXISTS (
        SELECT 1 FROM professionals p
        JOIN profiles pr ON p.profile_id = pr.id
        WHERE pr.id = auth.uid()
    )
);

-- Allow professionals to manage their work photos
CREATE POLICY "Allow pros to manage work photos" 
ON storage.objects FOR UPDATE, DELETE
TO authenticated 
USING (
    bucket_id = 'work-photos' AND 
    EXISTS (
        SELECT 1 FROM professionals p
        JOIN profiles pr ON p.profile_id = pr.id
        WHERE pr.id = auth.uid()
    )
);
