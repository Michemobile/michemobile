// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'

// Log environment variables (first 10 chars only for security)
console.log('Environment variables check:')
console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL')?.slice(0, 10))
console.log('SUPABASE_ANON_KEY:', Deno.env.get('SUPABASE_ANON_KEY')?.slice(0, 10))
console.log('STRIPE_SECRET_KEY:', Deno.env.get('STRIPE_SECRET_KEY')?.slice(0, 10))

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin, x-requested-with',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'content-length, content-type'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Content-Length': '0'
      }
    })
  }

  try {
    const { professional_id, email, country } = await req.json()

    // Validate required fields
    if (!professional_id) {
      return new Response(
        JSON.stringify({ error: 'professional_id is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Validate authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2022-11-15',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
          headers: { Authorization: authHeader },
      },
      }
    )

    // Get the base URL from environment or use a fallback
    const appUrl = Deno.env.get('APP_URL');
    if (!appUrl) {
      console.error('APP_URL environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: APP_URL not set' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Validate the URL
    try {
      new URL(appUrl);
    } catch (err) {
      console.error('Invalid APP_URL:', appUrl);
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Invalid APP_URL' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // First check if the professional already has a Stripe account
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('stripe_account_id')
      .eq('id', professional_id)
      .single()

    if (profError) {
      console.error('Error fetching professional:', profError);
      return new Response(
        JSON.stringify({ error: 'Professional not found' }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    let account;
    let accountLink;

    if (professional?.stripe_account_id) {
      try {
        // Account exists, get its current status
        account = await stripe.accounts.retrieve(professional.stripe_account_id)
        
        // Create a new account link for completing requirements
        accountLink = await stripe.accountLinks.create({
          account: professional.stripe_account_id,
          refresh_url: `${appUrl}/pro-onboarding-complete`,
          return_url: `${appUrl}/dashboard/professional?stripe_return=success`,
          type: 'account_onboarding',
        })
      } catch (stripeErr) {
        console.error('Stripe API error:', stripeErr);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve or update Stripe account' }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }
    } else {
      try {
        // Create a new Connect account
        account = await stripe.accounts.create({
          type: 'express',
          email: email,
          country: country || 'US',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          }
        })

        // Create an account link for onboarding
        accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${appUrl}/pro-onboarding-complete`,
          return_url: `${appUrl}/dashboard/professional?stripe_return=success`,
          type: 'account_onboarding',
        })

        // Update the professional record with the Stripe account ID
        const { error: updateError } = await supabase
          .from('professionals')
          .update({
            stripe_account_id: account.id,
            stripe_account_status: 'pending',
            stripe_details_submitted: false,
          })
          .eq('id', professional_id)

        if (updateError) {
          console.error('Error updating professional:', updateError);
      return new Response(
            JSON.stringify({ error: 'Failed to update professional record' }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          )
    }
      } catch (stripeErr) {
        console.error('Stripe API error:', stripeErr);
    return new Response(
          JSON.stringify({ error: 'Failed to create Stripe account' }),
      {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }
    }

    return new Response(
      JSON.stringify({
        accountLink: accountLink.url,
        accountId: account.id,
        requirements: account.requirements,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
});
