import { serve } from 'std/http/server'
import { createClient, PostgrestError } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// The `createClient` function requires the Supabase URL and a service role key.
// These are stored as environment variables on the Supabase platform.
// Deno.env.get() is used to access them.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // This is needed for CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // The request body should contain the profile and professional data.
    const { profileData, professionalData } = await req.json()

    // Validate the incoming data.
    if (!profileData || !professionalData) {
      throw new Error('Profile and professional data are required.')
    }
    if (!profileData.id || !profileData.email) {
      throw new Error('User ID and email are required in profile data.')
    }

    // --- Transaction Start (Simulated) ---
    // In a real-world scenario, these operations should be wrapped in a database
    // transaction to ensure atomicity. You can achieve this by creating a
    // PostgreSQL function (e.g., `create_professional_profile`) and calling it
    // via `supabaseAdmin.rpc()`. For now, we proceed with sequential operations.

    // 1. Upsert the user's profile.
    // `upsert` creates a new profile or updates an existing one, which is ideal
    // for users who sign up via OAuth and may already have a user entry.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData)
      .select()
      .single()

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      throw new Error(`Failed to create profile: ${(profileError as PostgrestError).message}`)
    }

    // 2. Create the professional record, linking it to the profile.
    const professionalRecord = {
      ...professionalData,
      profile_id: profile.id,
    }
    
    const { data: professional, error: professionalError } = await supabaseAdmin
      .from('professionals')
      .insert(professionalRecord)
      .select()
      .single()

    if (professionalError) {
      // --- Rollback (Simulated) ---
      // If this fails, the profile created above will not be rolled back automatically.
      // A proper database transaction would prevent this data inconsistency.
      console.error('Professional insert error:', professionalError)
      throw new Error(`Failed to create professional record: ${(professionalError as PostgrestError).message}`)
    }
    
    // --- Transaction End (Simulated) ---

    // TODO: Add logic to send a notification email to the admin team.
    // Example: await sendAdminNotification(profile.email);

    // Return the newly created professional record to the client.
    return new Response(JSON.stringify({ professional }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Return a generic error response.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
