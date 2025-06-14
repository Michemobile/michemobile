-- Add approval and onboarding completion fields to professionals table
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Update the create_professional function to include the new fields
CREATE OR REPLACE FUNCTION create_professional(
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
BEGIN
  -- Insert profile first
  INSERT INTO profiles (
    first_name,
    last_name,
    email,
    phone,
    username,
    type
  )
  VALUES (
    profile_data->>'first_name',
    profile_data->>'last_name',
    profile_data->>'email',
    profile_data->>'phone',
    profile_data->>'username',
    profile_data->>'type'
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
  
  -- Create the result object
  SELECT jsonb_build_object(
    'profile_id', new_profile_id,
    'professional_id', new_professional_id
  ) INTO result;
  
  RETURN result;
END;
$$;
