
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS Headers - Adjust 'Access-Control-Allow-Origin' to your frontend domain for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For local development. For production, use your frontend domain e.g., 'https://michemobile.online'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to get professional_id from auth.users.id
// IMPORTANT: Review and adjust this function based on your database schema.
async function getProfessionalId(supabaseClient: SupabaseClient, userId: string): Promise<string | null> {
  // This function assumes your 'professionals' table has a column
  // that directly links to 'auth.users.id' (which is the 'userId' parameter here).
  //
  // COMMON PATTERNS:
  // 1. Direct Link: 'professionals' table has a 'user_id' (or 'auth_id', 'profile_id') column
  //    that stores the `auth.users.id`.
  //    In this case, the query below would be:
  //    .eq('user_id_column_in_professionals_table', userId)
  //
  // 2. Indirect Link (via a 'profiles' table):
  //    - 'profiles' table has a 'user_id' column (linking to `auth.users.id`).
  //    - 'professionals' table has a 'profile_id' column (linking to `profiles.id`).
  //    If this is your setup, you'll need a more complex query or two separate queries.
  //    Example for two queries:
  //      a. Get profile.id from profiles where user_id = userId
  //      b. Get professional.id from professionals where profile_id = (result from a)

  // PLEASE REPLACE 'profile_id' WITH THE CORRECT COLUMN NAME IN YOUR 'professionals' TABLE
  // THAT LINKS TO THE AUTHENTICATED USER'S ID (user.id).
  const { data, error } = await supabaseClient
    .from('professionals')
    .select('id') // Selects the primary key of the professional
    .eq('profile_id', userId) // <--- !!! CRITICAL: CHANGE 'profile_id' if needed !!!
    .single();

  if (error) {
    console.error('Error fetching professional ID:', error.message);
    return null;
  }
  return data ? data.id : null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL or Anon Key not configured in Edge Function environment.');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Create a Supabase client with the user's auth token passed in the request headers
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError?.message);
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401, // Unauthorized
      });
    }

    // Get the professional_id associated with the authenticated user
    const professionalId = await getProfessionalId(supabaseClient, user.id);

    if (!professionalId) {
      console.error('Professional ID not found for user:', user.id);
      return new Response(JSON.stringify({ error: 'Professional profile not found or not linked correctly to user account.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404, // Not Found
      });
    }

    // Parse the request body to get the subscription object
    const requestBody = await req.json();
    const subscription = requestBody.subscription;

    if (!subscription || typeof subscription !== 'object' || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid or missing subscription object in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Bad Request
      });
    }

    // Insert the subscription into the 'push_subscriptions' table
    // The RLS policy on 'push_subscriptions' should allow an authenticated user
    // to insert if the professional_id matches their own.
    // Alternatively, use a service_role client here if RLS is more restrictive.
    const { error: insertError } = await supabaseClient
      .from('push_subscriptions')
      .insert({
        professional_id: professionalId,
        subscription_object: subscription,
      });
      // Note on Upserting (to avoid duplicate subscriptions for the same device):
      // If you want to prevent multiple identical subscriptions for the same professional and device,
      // you would typically add a unique constraint in your database on
      // (professional_id, and a text representation of subscription_object->>'endpoint').
      // Then, you could use .upsert() instead of .insert().
      // Example:
      // .upsert(
      //   { professional_id: professionalId, subscription_object: subscription, endpoint_text: subscription.endpoint },
      //   { onConflict: 'your_unique_constraint_name_for_professional_and_endpoint' }
      // );
      // This requires adding an 'endpoint_text' column or using a function-based index for the constraint.

    if (insertError) {
      console.error('Error saving subscription to database:', insertError.message);
      // Check for unique constraint violation if you implement upsert logic or have unique constraints
      if (insertError.code === '23505') { // PostgreSQL unique violation error code
        return new Response(JSON.stringify({ message: 'Subscription already exists or conflict.', details: insertError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to save subscription', details: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Internal Server Error
      });
    }

    return new Response(JSON.stringify({ message: 'Subscription saved successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (e) {
    console.error('Critical error in Edge Function:', e.message);
    return new Response(JSON.stringify({ error: 'Internal server error', details: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});