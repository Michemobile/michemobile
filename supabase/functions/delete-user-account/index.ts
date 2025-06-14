import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

console.log('Delete user account function booting up');

// Standard CORS headers - IMPORTANT: Update Access-Control-Allow-Origin for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // e.g., 'https://your-frontend-domain.com'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS
};

serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the user ID from the auth header (JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Error getting user from JWT:', userError);
      return new Response(JSON.stringify({ error: 'Authentication failed: ' + (userError?.message || 'No user found') }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = user.id;
    console.log(`Attempting to delete all data for user ID: ${userId}`);

    // --- BEGIN SIMPLIFIED DATA DELETION --- 
    
    // First, get the professional record (without complex joins)
    const { data: professional, error: professionalFetchError } = await supabaseAdmin
      .from('professionals')
      .select('id, profile_id')
      .eq('profile_id', userId)
      .maybeSingle();

    if (professionalFetchError) {
      console.error(`Error fetching professional data for user ${userId}:`, professionalFetchError);
      return new Response(JSON.stringify({ error: `Failed to fetch professional data: ${professionalFetchError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let professionalId = null;
    if (professional) {
      professionalId = professional.id;
      console.log(`Found professional record with ID: ${professionalId}`);

      // Delete database records in correct order (child tables first)
      
      // 1. Delete bookings where user is the professional
      const { error: professionalBookingsError } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('professional_id', professionalId);
      if (professionalBookingsError) {
        console.error(`Error deleting professional bookings for user ${userId}:`, professionalBookingsError);
      } else {
        console.log(`Successfully deleted professional bookings for user ID: ${userId}`);
      }

      // 2. Delete services
      const { error: servicesError } = await supabaseAdmin
        .from('services')
        .delete()
        .eq('professional_id', professionalId);
      if (servicesError) {
        console.error(`Error deleting services for professional ${professionalId}:`, servicesError);
      } else {
        console.log(`Successfully deleted services for professional ID: ${professionalId}`);
      }

      // 3. Delete certifications
      const { error: certificationsError } = await supabaseAdmin
        .from('professional_certifications')
        .delete()
        .eq('professional_id', professionalId);
      if (certificationsError) {
        console.error(`Error deleting certifications for professional ${professionalId}:`, certificationsError);
      } else {
        console.log(`Successfully deleted certifications for professional ID: ${professionalId}`);
      }

      // 4. Delete work photos
      const { error: workPhotosError } = await supabaseAdmin
        .from('work_photos')
        .delete()
        .eq('professional_id', professionalId);
      if (workPhotosError) {
        console.error(`Error deleting work photos for professional ${professionalId}:`, workPhotosError);
      } else {
        console.log(`Successfully deleted work photos for professional ID: ${professionalId}`);
      }

      // 5. Delete professional insurance
      const { error: insuranceError } = await supabaseAdmin
        .from('professional_insurance')
        .delete()
        .eq('professional_id', professionalId);
      if (insuranceError) {
        console.error(`Error deleting insurance for professional ${professionalId}:`, insuranceError);
      } else {
        console.log(`Successfully deleted insurance for professional ID: ${professionalId}`);
      }
    }

    // 6. Delete bookings where user is the client
    const { error: clientBookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('client_id', userId);
    if (clientBookingsError) {
      console.error(`Error deleting client bookings for user ${userId}:`, clientBookingsError);
    } else {
      console.log(`Successfully deleted client bookings for user ID: ${userId}`);
    }

    // 7. Delete the professional record (this will cascade to remaining related data)
    if (professionalId) {
      const { error: professionalDeleteError } = await supabaseAdmin
        .from('professionals')
        .delete()
        .eq('id', professionalId);

      if (professionalDeleteError) {
        console.error(`Error deleting professional record for user ${userId}:`, professionalDeleteError);
        return new Response(JSON.stringify({ error: "Failed to delete professional data: " + professionalDeleteError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      console.log(`Successfully deleted professional record for user ID: ${userId}`);
    }

    // 8. Delete the profile record
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles') 
      .delete()
      .eq('id', userId); 

    if (profileDeleteError) {
      console.error(`Error deleting profile for user ${userId}:`, profileDeleteError);
      return new Response(JSON.stringify({ error: "Failed to delete profile data: " + profileDeleteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log(`Successfully deleted profile for user ID: ${userId}`);

    // --- END SIMPLIFIED DATA DELETION ---

    // LAST STEP: Delete the user from auth.users (this must be done with admin client)
    const { error: authUserDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authUserDeleteError) {
      console.error(`CRITICAL: Error deleting user ${userId} from auth.users:`, authUserDeleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete user authentication record: ' + authUserDeleteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`Successfully deleted user account (auth.users) for user ID: ${userId}`);

    return new Response(JSON.stringify({ message: 'Account and all associated data deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in delete-user-account function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
