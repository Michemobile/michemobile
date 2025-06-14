import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { Stripe } from 'https://esm.sh/stripe@13.10.0?target=deno&deno-std=0.177.0'

// Function to get CORS headers based on the request origin
const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || 'https://michemobile.online';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req)
    });
  }

  try {
    const { professionalId, refreshUrl, returnUrl } = await req.json();

    if (!professionalId || !refreshUrl || !returnUrl) {
      throw new Error('Missing required fields: professionalId, refreshUrl, and returnUrl are required');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get professional details
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('*, profile:profiles(*)')
      .eq('id', professionalId)
      .single();

    if (profError || !professional) {
      throw new Error('Professional not found');
    }

    // Create or get Stripe Connected Account
    let stripeAccountId = professional.stripe_account_id;
    
    if (!stripeAccountId) {
      // Create a new Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: professional.profile.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          professionalId: professionalId,
        }
      });

      stripeAccountId = account.id;

      // Update professional with Stripe account ID
      const { error: updateError } = await supabase
        .from('professionals')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', professionalId);

      if (updateError) {
        // If update fails, try to clean up the Stripe account
        try {
          await stripe.accounts.del(stripeAccountId);
        } catch (cleanupError) {
          console.error('Error cleaning up Stripe account:', cleanupError);
        }
        throw updateError;
      }
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        stripeAccountId: stripeAccountId
      }),
      {
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    console.error('Function error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        status: 400,
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
