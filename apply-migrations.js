// Apply Supabase migrations directly to the database
// This script uses the Supabase JS client to execute SQL migrations

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY are set.');
  process.exit(1);
}

// Create Supabase admin client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to execute a single SQL statement
const executeStatement = async (statement) => {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    if (error) throw error;
  } catch (error) {
    console.error('Error executing statement:', error);
    throw error;
  }
};

// Define migrations
const migrations = [
  // Create exec_sql function first
  `
  CREATE OR REPLACE FUNCTION exec_sql(sql text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    EXECUTE sql;
  END;
  $$;
  `,

  // Add complete_professional_profile function
  `
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
        photo->>'file_path',
        photo->>'description',
        (photo->>'order_index')::INTEGER
      FROM unnest(work_photos) AS photo;
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
  `,

  // Grant execute permission
  `
  GRANT EXECUTE ON FUNCTION complete_professional_profile(JSONB, JSONB, JSONB[], JSONB, JSONB[]) TO authenticated;
  `
];

// Apply migrations
const applyMigrations = async () => {
  try {
  console.log('Starting database migrations...');

  for (let i = 0; i < migrations.length; i++) {
      console.log(`Applying migration ${i + 1}/${migrations.length}...`);
      await executeStatement(migrations[i]);
      console.log(`Migration ${i + 1} applied successfully.`);
    }
    
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Database setup failed. Please check the errors above.');
    process.exit(1);
  }
};

// Run migrations
applyMigrations();
