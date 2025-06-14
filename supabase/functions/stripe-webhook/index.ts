// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'

serve(async (req) => {
  try {
    // Get the stripe signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2022-11-15',
    })

    // Get the raw body
    const body = await req.text()

    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const bookingId = paymentIntent.metadata.bookingId

        // Update booking status
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'succeeded',
            stripe_transfer_id: paymentIntent.transfer,
          })
          .eq('id', bookingId)

        if (updateError) {
          throw new Error(`Failed to update booking: ${updateError.message}`)
        }

        // Create a transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            booking_id: bookingId,
            professional_id: paymentIntent.metadata.professionalId,
            client_id: paymentIntent.metadata.clientId,
            amount: paymentIntent.amount,
            commission_amount: paymentIntent.application_fee_amount,
            net_amount: paymentIntent.amount - paymentIntent.application_fee_amount,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_transfer_id: paymentIntent.transfer,
            status: 'completed',
          })

        if (transactionError) {
          throw new Error(`Failed to create transaction: ${transactionError.message}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        const bookingId = paymentIntent.metadata.bookingId

        // Update booking status
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'payment_failed',
            payment_status: 'failed',
          })
          .eq('id', bookingId)

        if (updateError) {
          throw new Error(`Failed to update booking: ${updateError.message}`)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object
        
        // Update professional's Stripe status
        const { error: updateError } = await supabase
          .from('professionals')
          .update({
            stripe_account_status: account.charges_enabled ? 'active' : 'pending',
            stripe_details_submitted: account.details_submitted,
          })
          .eq('stripe_account_id', account.id)

        if (updateError) {
          throw new Error(`Failed to update professional: ${updateError.message}`)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}); 