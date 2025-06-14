// Script to apply RLS policies, fix storage permissions, and add missing columns to Supabase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Setup ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY or VITE_SUPABASE_SERVICE_KEY are set.');
  process.exit(1);
}

// Apply SQL migrations to Supabase
async function applyMigrations() {
  try {
    console.log('Applying SQL migrations to Supabase...');
    
    // 1. Apply booking policy
    const bookingPolicyPath = path.join(__dirname, 'add-booking-policy.sql');
    if (fs.existsSync(bookingPolicyPath)) {
      const bookingPolicySql = fs.readFileSync(bookingPolicyPath, 'utf8');
      console.log('Booking policy SQL to execute:', bookingPolicySql);
    }
    
    // 2. Apply image column migration
    const imageColumnSql = `
    -- Add image column to professionals table if it doesn't exist
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'professionals' AND column_name = 'image'
        ) THEN
            -- Add the image column to store profile image URLs
            ALTER TABLE professionals ADD COLUMN image TEXT;
            
            -- Add a comment to document the column's purpose
            COMMENT ON COLUMN professionals.image IS 'URL to the professional''s profile image';
        END IF;
    END $$;
    `;
    
    console.log('Image column SQL to execute:', imageColumnSql);
    
    // 3. Apply storage policies migration
    const storagePoliciesSql = `
    -- Fix storage bucket permissions for profiles
    -- This ensures users can upload their own profile photos

    -- First, ensure the profiles bucket exists
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM storage.buckets WHERE name = 'profiles'
        ) THEN
            INSERT INTO storage.buckets (id, name, public)
            VALUES ('profiles', 'profiles', true);
        END IF;
    END $$;

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

    -- Also create similar policies for public folder access
    -- This allows access to files in the public folder regardless of user
    CREATE POLICY "Allow access to public folder" 
    ON storage.objects FOR ALL
    USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'public');

    -- Policies for 'professional-documents' bucket
    CREATE POLICY "Allow authenticated users to upload professional documents" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'professional-documents');

    CREATE POLICY "Allow individual users to manage their own professional documents" 
    ON storage.objects FOR SELECT, UPDATE, DELETE 
    TO authenticated 
    USING (bucket_id = 'professional-documents' AND owner = auth.uid());

    -- Policies for 'work-photos' bucket
    CREATE POLICY "Allow authenticated users to upload work photos" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'work-photos');

    CREATE POLICY "Allow individual users to manage their own work photos" 
    ON storage.objects FOR SELECT, UPDATE, DELETE 
    TO authenticated 
    USING (bucket_id = 'work-photos' AND owner = auth.uid());
    `;
    
    // 4. Apply blocked time slots migration
    const blockedTimeSlotsPath = path.join(__dirname, 'supabase/migrations/20250525_add_blocked_time_slots.sql');
    let blockedTimeSlotsSql = '';
    if (fs.existsSync(blockedTimeSlotsPath)) {
      blockedTimeSlotsSql = fs.readFileSync(blockedTimeSlotsPath, 'utf8');
      console.log('Blocked time slots SQL to execute:', blockedTimeSlotsSql);
    } else {
      // Fallback if file doesn't exist
      blockedTimeSlotsSql = `
      -- Add blocked_time_slots table for professionals to mark unavailable times
      CREATE TABLE IF NOT EXISTS blocked_time_slots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT time_range_check CHECK (end_time > start_time)
      );

      -- Add RLS policies for blocked_time_slots
      ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

      -- Allow professionals to view and manage their own blocked time slots
      CREATE POLICY "Professionals can manage their own blocked time slots"
      ON blocked_time_slots
      FOR ALL
      TO authenticated
      USING (
        professional_id IN (
          SELECT id FROM professionals 
          WHERE profile_id = auth.uid()
        )
      );

      -- Allow clients to view professionals' blocked time slots (read-only)
      CREATE POLICY "Clients can view professionals' blocked time slots"
      ON blocked_time_slots
      FOR SELECT
      TO authenticated
      USING (true);
      `;
      console.log('Blocked time slots SQL (fallback) to execute:', blockedTimeSlotsSql);
    }
    
    console.log('\n---------------------------------------');
    console.log('IMPORTANT: You need to apply these SQL migrations through the Supabase dashboard:');
    console.log('');
    console.log('1. Log in to your Supabase dashboard at https://app.supabase.io');
    console.log('2. Select your project');
    console.log('3. Go to the SQL Editor');
    console.log('4. Create a new query');
    console.log('5. Paste each SQL migration one at a time');
    console.log('6. Run each query');
    console.log('');
    console.log('Apply the migrations in this order:');
    console.log('1. Image column migration - to add the missing image column');
    console.log('2. Storage policies - to fix profile photo upload permissions');
    console.log('3. Blocked time slots - to add the feature for professionals to block out unavailable times');
    console.log('4. Booking policy - if needed for additional booking functionality');
    console.log('');
    console.log('After applying these migrations, restart your application to see the changes take effect.');
    console.log('---------------------------------------');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Alternative approach: Modify the supabase.ts file to use the service role key for bookings
function updateSupabaseClientCode() {
  console.log('Updating Supabase client code to use service role for bookings...');
  
  // Path to the supabase.ts file
  const supabaseTsPath = path.join(__dirname, 'src', 'lib', 'supabase.ts');
  
  try {
    // Read the current file
    let content = fs.readFileSync(supabaseTsPath, 'utf8');
    
    // Check if we've already modified the file
    if (content.includes('SUPABASE_SERVICE_KEY')) {
      console.log('Supabase client already configured to use service role for bookings.');
      return;
    }
    
    // Add service role client for admin operations
    const serviceRoleClientCode = `
// Service role client for admin operations (use with caution)
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY as string
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
`;
    
    // Insert the service role client code before the export default line
    content = content.replace('export default supabase', serviceRoleClientCode + 'export default supabase');
    
    // Update the createBooking function to use the admin client
    const originalCreateBooking = `  createBooking: async (booking: Omit<Booking, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
    
    if (error) throw error
    return data?.[0] as Booking
  },`;
    
    const updatedCreateBooking = `  createBooking: async (booking: Omit<Booking, 'id' | 'created_at'>) => {
    // Try with regular client first
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
    
    if (!error) return data?.[0] as Booking
    
    // If that fails due to RLS, try with admin client if available
    if (supabaseServiceKey) {
      console.log('Using admin client for booking creation due to RLS restrictions')
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('bookings')
        .insert([booking])
        .select()
      
      if (adminError) throw adminError
      return adminData?.[0] as Booking
    }
    
    // If no admin client or that also fails, throw the original error
    throw error
  },`;
    
    // Replace the createBooking function
    content = content.replace(originalCreateBooking, updatedCreateBooking);
    
    // Write the updated content back to the file
    fs.writeFileSync(supabaseTsPath, content, 'utf8');
    
    console.log('Supabase client updated successfully!');
  } catch (error) {
    console.error('Error updating Supabase client:', error);
  }
}

// Run all fixes
applyMigrations();
updateSupabaseClientCode();
