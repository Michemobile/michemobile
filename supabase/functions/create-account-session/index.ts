// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { Stripe } from 'https://esm.sh/stripe@13.10.0?target=deno&deno-std=0.177.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin, x-requested-with',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'content-length, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Content-Length': '0' } })
  }

  try {
    console.log('Function started')
    const { professional_id } = await req.json()
    if (!professional_id) throw new Error('professional_id is required')

    // Log environment variables (safely)
    console.log('Environment check:', {
      hasStripeKey: !!Deno.env.get('STRIPE_SECRET_KEY'),
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseKey: !!Deno.env.get('SUPABASE_ANON_KEY')
    })

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16'
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: req.headers.get('Authorization') } }
      }
    )

    console.log('Querying professional:', professional_id)
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('stripe_account_id')
      .eq('id', professional_id)
      .single()

    if (profError) {
      console.error('Database error:', profError)
      throw profError
    }

    if (!professional?.stripe_account_id) {
      console.error('No Stripe account found for professional:', professional_id)
      throw new Error('Stripe account not found for professional')
    }

    console.log('Creating account session for:', professional.stripe_account_id)

    try {
      // Create an account session for embedded components
      const session = await stripe.accounts.sessions.create({
        account: professional.stripe_account_id,
        components: {
          payments: {
            enabled: true,
            features: {
              refund_management: true,
              dispute_management: true
            }
          },
          balances: { enabled: true },
          payouts: { enabled: true }
        }
      })

      console.log('Session created successfully')

      return new Response(JSON.stringify({ client_secret: session.client_secret }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (stripeErr) {
      console.error('Stripe API error:', stripeErr)
      throw new Error(`Stripe API error: ${stripeErr.message}`)
    }
  } catch (err) {
    console.error('Function error:', {
      message: err.message,
      name: err.name,
      stack: err.stack
    })

    return new Response(JSON.stringify({
      error: err.message || 'Internal server error',
      details: err.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})