-- Create stored procedure for complete professional profile creation
CREATE OR REPLACE FUNCTION complete_professional_profile(
  profile_data JSONB,
  professional_data JSONB,
  certifications JSONB[] DEFAULT '{}',
  insurance JSONB DEFAULT NULL,
  work_photos JSONB[] DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_profile_id UUID;
  new_professional_id UUID;
  result JSONB;
BEGIN
  -- Start transaction
  BEGIN;
  
  -- Insert profile first
  INSERT INTO profiles (
    id,
    first_name,
    last_name,
    email,
    phone,
    username,
    type,
    profile_photo_url
  )
  VALUES (
    (profile_data->>'id')::UUID,
    profile_data->>'first_name',
    profile_data->>'last_name',
    profile_data->>'email',
    profile_data->>'phone',
    profile_data->>'username',
    'professional',
    profile_data->>'profile_photo_url'
  )
  RETURNING id INTO new_profile_id;
  
  -- Insert professional with the profile ID
  INSERT INTO professionals (
    profile_id,
    service_area,
    service_radius,
    travel_fee,
    years_experience,
    bio,
    verified,
    is_approved,
    is_onboarding_complete
  )
  VALUES (
    new_profile_id,
    professional_data->>'service_area',
    (professional_data->>'service_radius')::INTEGER,
    (professional_data->>'travel_fee')::DECIMAL,
    professional_data->>'years_experience',
    professional_data->>'bio',
    false,
    false,
    false
  )
  RETURNING id INTO new_professional_id;

  -- Insert certifications if any
  IF array_length(certifications, 1) > 0 THEN
    INSERT INTO professional_certifications (
      professional_id,
      certification_type,
      file_path,
      status
    )
    SELECT 
      new_professional_id,
      'general',
      cert->>'file_path',
      'pending'
    FROM unnest(certifications) AS cert;
  END IF;

  -- Insert insurance if provided
  IF insurance IS NOT NULL THEN
    INSERT INTO professional_certifications (
      professional_id,
      certification_type,
      file_path,
      status
    )
    VALUES (
      new_professional_id,
      'insurance',
      insurance->>'file_path',
      'pending'
    );
  END IF;

  -- Create the result object
  SELECT jsonb_build_object(
    'profile_id', new_profile_id,
    'professional_id', new_professional_id
  ) INTO result;
  
  -- Commit the transaction
  COMMIT;
  
  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Rollback the transaction on error
  ROLLBACK;
  RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_professional_profile(JSONB, JSONB, JSONB[], JSONB, JSONB[]) TO authenticated; 