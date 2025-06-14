-- Create auth schema if it doesn't exist (supabase schema)
CREATE SCHEMA IF NOT EXISTS auth;

-- Create tables
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('client', 'professional')),
  profile_photo_url TEXT
);

CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service_area TEXT NOT NULL,
  service_radius INTEGER NOT NULL DEFAULT 10,
  travel_fee DECIMAL(10, 2),
  years_experience TEXT NOT NULL,
  bio TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(profile_id)
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  service_id UUID NOT NULL REFERENCES services(id),
  booking_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  location TEXT NOT NULL,
  notes TEXT,
  total_amount DECIMAL(10, 2) NOT NULL
);

CREATE TABLE professional_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certification_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  notes TEXT
);

CREATE TABLE work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER NOT NULL
);

-- Create transaction management functions
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Start a new transaction
  BEGIN;
END;
$$;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Commit the current transaction
  COMMIT;
END;
$$;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rollback the current transaction
  ROLLBACK;
END;
$$;

-- Create stored procedure for creating a professional with profile in one transaction
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
    type,
    profile_photo_url
  )
  VALUES (
    profile_data->>'first_name',
    profile_data->>'last_name',
    profile_data->>'email',
    profile_data->>'phone',
    profile_data->>'username',
    profile_data->>'type',
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
  
  -- Create the result object
  SELECT jsonb_build_object(
    'profile_id', new_profile_id,
    'professional_id', new_professional_id
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create stored procedure for complete professional profile creation
CREATE OR REPLACE FUNCTION complete_professional_profile(
  profile_data JSONB,
  professional_data JSONB,
  certifications JSONB[],
  insurance JSONB,
  work_photos JSONB[]
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

  -- Insert services if any
  IF professional_data ? 'services' THEN
    INSERT INTO services (
      professional_id,
      name,
      price,
      description,
      is_custom
    )
    SELECT 
      new_professional_id,
      (service->>'name')::TEXT,
      (service->>'price')::DECIMAL,
      (service->>'description')::TEXT,
      (service->>'is_custom')::BOOLEAN
    FROM jsonb_array_elements(professional_data->'services') AS service;
  END IF;

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
    INSERT INTO professional_insurance (
      professional_id,
      file_path,
      insurance_type,
      status
    )
    VALUES (
      new_professional_id,
      insurance->>'file_path',
      'general',
      'pending'
    );
  END IF;

  -- Insert work photos if any
  IF array_length(work_photos, 1) > 0 THEN
    INSERT INTO work_photos (
      professional_id,
      url,
      caption,
      order_index
    )
    SELECT 
      new_professional_id,
      photo->>'url',
      photo->>'caption',
      COALESCE((photo->>'order_index')::INTEGER, 0)
    FROM unnest(work_photos) AS photo;
  END IF;

  -- Update professional record to mark onboarding as complete
  UPDATE professionals
  SET is_onboarding_complete = true
  WHERE id = new_professional_id;

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
$$;

-- Row Level Security (RLS) setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_certifications ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for profiles" ON profiles
  FOR SELECT USING (true);
  
CREATE POLICY "Public read access for professionals" ON professionals
  FOR SELECT USING (true);
  
CREATE POLICY "Public read access for services" ON services
  FOR SELECT USING (true);

-- Add policies for professionals table
CREATE POLICY "Professionals can insert their own data" ON professionals
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Professionals can update their own data" ON professionals
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Add policies for services table
CREATE POLICY "Professionals can insert their services" ON services
  FOR INSERT
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can update their services" ON services
  FOR UPDATE
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

-- Booking policies
CREATE POLICY "Clients can see their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = client_id);
  
CREATE POLICY "Professionals can see bookings assigned to them" ON bookings
  FOR SELECT USING (auth.uid() IN (
    SELECT p.profile_id FROM professionals p WHERE p.id = professional_id
  ));

-- Create indexes for performance
CREATE INDEX idx_profiles_type ON profiles(type);
CREATE INDEX idx_professionals_service_area ON professionals(service_area);
CREATE INDEX idx_services_professional_id ON services(professional_id);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_professional_id ON bookings(professional_id);
CREATE INDEX idx_bookings_status ON bookings(status); 