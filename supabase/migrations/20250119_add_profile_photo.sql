-- Migration: Add profile photo columns to both profiles and professionals tables
-- Date: 2025-01-19

-- Add profile_photo_url column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add image column to professionals table if it doesn't exist
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS image TEXT;

-- Add indexes for better performance when querying by photo URL
CREATE INDEX IF NOT EXISTS idx_profiles_photo_url ON profiles(profile_photo_url);
CREATE INDEX IF NOT EXISTS idx_professionals_image ON professionals(image);

-- Add comments to document the columns
COMMENT ON COLUMN profiles.profile_photo_url IS 'URL to the user''s profile photo stored in Supabase storage';
COMMENT ON COLUMN professionals.image IS 'URL to the professional''s profile photo stored in Supabase storage (duplicated for performance)';

-- Update the complete_professional_profile function to handle both columns
CREATE OR REPLACE FUNCTION complete_professional_profile(
  profile_data JSONB,
  professional_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_profile_id UUID;
  new_professional_id UUID;
  result JSONB;
  profile_photo_url TEXT;
BEGIN
  -- Start transaction
  BEGIN;
    -- Extract profile photo URL from profile data
    profile_photo_url := profile_data->>'profile_photo_url';
    
    -- Create or update profile
    INSERT INTO profiles (
      id,
      first_name,
      last_name,
      email,
      phone,
      profile_photo_url
    )
    VALUES (
      (profile_data->>'id')::UUID,
      profile_data->>'first_name',
      profile_data->>'last_name',
      profile_data->>'email',
      profile_data->>'phone',
      profile_photo_url
    )
    ON CONFLICT (id) DO UPDATE
    SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      profile_photo_url = EXCLUDED.profile_photo_url
    RETURNING id INTO new_profile_id;
    
    -- Create or update professional
    INSERT INTO professionals (
      profile_id,
      service_area,
      service_radius,
      travel_fee,
      years_experience,
      bio,
      image
    )
    VALUES (
      new_profile_id,
      professional_data->>'service_area',
      (professional_data->>'service_radius')::INTEGER,
      (professional_data->>'travel_fee')::DECIMAL,
      professional_data->>'years_experience',
      professional_data->>'bio',
      profile_photo_url  -- Use the same URL for both columns
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET
      service_area = EXCLUDED.service_area,
      service_radius = EXCLUDED.service_radius,
      travel_fee = EXCLUDED.travel_fee,
      years_experience = EXCLUDED.years_experience,
      bio = EXCLUDED.bio,
      image = EXCLUDED.image
    RETURNING id INTO new_professional_id;
    
    -- Create the result object
    SELECT jsonb_build_object(
      'profile_id', new_profile_id,
      'professional_id', new_professional_id
    ) INTO result;
    
    -- Commit transaction
    COMMIT;
    
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on any error
    ROLLBACK;
    RAISE;
  END;
END;
$$; 