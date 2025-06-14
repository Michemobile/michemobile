// Script to fix Supabase issues directly:
// 1. Add missing 'image' column to professionals table
// 2. Fix storage bucket permissions for profile photos

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

// Function to check if image column exists
async function checkImageColumn() {
  try {
    console.log('Checking if image column exists in professionals table...');
    
    // Try to select the image column
    const { data, error } = await supabase
      .from('professionals')
      .select('image')
      .limit(1);
    
    if (error) {
      // If error contains "column professionals.image does not exist", then we need to add it
      if (error.message.includes('does not exist')) {
        console.log('Image column does not exist. Will add it.');
        return false;
      } else {
        console.error('Error checking image column:', error);
        return null; // Unknown status
      }
    }
    
    console.log('Image column already exists.');
    return true;
  } catch (err) {
    console.error('Error checking image column:', err);
    return null; // Unknown status
  }
}

// Function to add image column
async function addImageColumn() {
  try {
    console.log('Adding image column to professionals table...');
    
    // We'll use a raw SQL query via the REST API
    const { error } = await supabase.rpc('alter_professionals_table', {});
    
    if (error) {
      console.error('Error adding image column via RPC:', error);
      console.log('Trying alternative method...');
      
      // If the RPC method doesn't exist, we'll create it first
      const createRpcResult = await fetch(`${supabaseUrl}/rest/v1/rpc/alter_professionals_table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          sql: `
            ALTER TABLE professionals 
            ADD COLUMN IF NOT EXISTS image TEXT;
            
            COMMENT ON COLUMN professionals.image IS 'URL to the professional''s profile image';
          `
        })
      });
      
      if (!createRpcResult.ok) {
        console.error('Error creating RPC function:', await createRpcResult.text());
        console.log('You may need to add the image column manually through the Supabase dashboard SQL editor.');
        console.log('SQL to run: ALTER TABLE professionals ADD COLUMN IF NOT EXISTS image TEXT;');
        return false;
      }
      
      console.log('Successfully added image column via alternative method.');
      return true;
    }
    
    console.log('Successfully added image column.');
    return true;
  } catch (err) {
    console.error('Error adding image column:', err);
    console.log('You may need to add the image column manually through the Supabase dashboard SQL editor.');
    console.log('SQL to run: ALTER TABLE professionals ADD COLUMN IF NOT EXISTS image TEXT;');
    return false;
  }
}

// Function to fix storage bucket permissions
async function fixStorageBucketPermissions() {
  try {
    console.log('Fixing storage bucket permissions...');
    
    // First, ensure the profiles bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    // Check if profiles bucket exists
    const profilesBucketExists = buckets.some(bucket => bucket.name === 'profiles');
    
    if (!profilesBucketExists) {
      console.log('Creating profiles bucket...');
      const { error: createError } = await supabase.storage.createBucket('profiles', {
        public: true
      });
      
      if (createError) {
        console.error('Error creating profiles bucket:', createError);
        return false;
      }
      
      console.log('Successfully created profiles bucket.');
    } else {
      console.log('Profiles bucket already exists.');
    }
    
    // Update bucket policies
    console.log('Updating storage bucket policies...');
    
    // We'll use the Supabase dashboard SQL editor to update policies
    console.log('Please run the following SQL in the Supabase dashboard SQL editor:');
    console.log(`
-- Drop existing policies if they're causing issues
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual users to manage their own files" ON storage.objects;

-- Create proper storage policies
-- Allow anyone to read public files
CREATE POLICY "Allow public read access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'public');

-- Allow authenticated users to upload their own files
CREATE POLICY "Allow authenticated users to upload files" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = auth.uid()
);

-- Allow users to update and delete their own files
CREATE POLICY "Allow individual users to manage their own files" 
ON storage.objects FOR UPDATE, DELETE
TO authenticated 
USING (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = auth.uid()
);
    `);
    
    return true;
  } catch (err) {
    console.error('Error fixing storage bucket permissions:', err);
    return false;
  }
}

// Main function to fix all issues
async function fixSupabaseIssues() {
  console.log('Starting to fix Supabase issues...');
  
  // 1. Fix missing image column
  const columnExists = await checkImageColumn();
  
  if (columnExists === false) {
    await addImageColumn();
  } else if (columnExists === null) {
    console.log('Could not determine if image column exists. Please check manually.');
  }
  
  // 2. Fix storage bucket permissions
  await fixStorageBucketPermissions();
  
  console.log('Finished fixing Supabase issues.');
  console.log('Note: Some changes may require manual intervention through the Supabase dashboard.');
}

// Execute the fixes
fixSupabaseIssues().catch(console.error);
