// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'

const PLATFORM_COMMISSION_PERCENTAGE = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bookingId, paymentMethodId } = await req.json()

    if (!bookingId || !paymentMethodId) {
      throw new Error('Missing required parameters')
    }

    // Initialize Stripe and Supabase clients
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
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(
          price,
          professional:professionals(
            stripe_account_id
          )
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      throw new Error('Booking not found')
    }

    const professionalStripeAccountId = booking.service.professional.stripe_account_id
    if (!professionalStripeAccountId) {
      throw new Error('Professional has not completed Stripe onboarding')
    }

    const amount = Math.round(booking.service.price * 100) // Convert to cents
    const applicationFeeAmount = Math.round(amount * (PLATFORM_COMMISSION_PERCENTAGE / 100))

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: professionalStripeAccountId,
      },
      metadata: {
        bookingId,
        professionalId: booking.service.professional.id,
        clientId: booking.client_id,
        serviceId: booking.service_id,
      },
    })

    // Update booking status based on payment intent status
    const newStatus = paymentIntent.status === 'succeeded' ? 'confirmed' : 'pending_payment'
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: paymentIntent.status,
      })
      .eq('id', bookingId)

    if (updateError) {
      throw new Error('Failed to update booking status')
    }

    return new Response(
      JSON.stringify({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (err) {
    const status = err.message?.includes('not found') ? 404 : 500
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
}); 