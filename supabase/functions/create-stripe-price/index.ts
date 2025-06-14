import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { Stripe } from 'https://esm.sh/stripe@13.10.0?target=deno&deno-std=0.177.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {    // Get the request body
    const { name, price: priceAmount, description, professionalId, serviceId } = await req.json()

    // Validate required fields
    if (!name || typeof priceAmount !== 'number' || !professionalId || !serviceId) {
      throw new Error('Missing or invalid required fields: name, price (must be a number), professionalId, and serviceId are required')
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get professional's Stripe account ID
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('stripe_account_id')
      .eq('id', professionalId)
      .single()

    if (profError || !professional?.stripe_account_id) {
      throw new Error('Professional not found or Stripe account not connected')
    }

    // Create a product in Stripe
    const product = await stripe.products.create({
      name: name,
      description: description,
      metadata: {
        professional_id: professionalId,
        service_id: serviceId,
        app_name: 'Miche Mobile',
        environment: Deno.env.get('NODE_ENV') || 'development'
      }
    }, {
      stripeAccount: professional.stripe_account_id
    })    // Create a price for the product (converting dollars to cents)
    const priceResponse = await stripe.prices.create({
      unit_amount: Math.round(priceAmount * 100), // Convert dollars to cents
      currency: 'usd',
      product_data: {
        name: name,
        metadata: {
          professional_id: professionalId
        }
      }
    }, {
      stripeAccount: professional.stripe_account_id
    })    // Update the service with the Stripe price ID
    const { error: updateError } = await supabase
      .from('services')
      .update({ stripe_price_id: priceResponse.id })
      .eq('id', serviceId)

    if (updateError) {
      // If updating the service fails, try to clean up the Stripe resources
      try {
        await stripe.prices.update(priceResponse.id, { active: false }, {
          stripeAccount: professional.stripe_account_id
        })
        await stripe.products.update(product.id, { active: false }, {
          stripeAccount: professional.stripe_account_id
        })
      } catch (cleanupError) {
        console.error('Error cleaning up Stripe resources:', cleanupError)
      }
      throw updateError
    }

    // Return the price ID and product ID
    return new Response(
      JSON.stringify({
        priceId: priceResponse.id,
        productId: product.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while creating the price'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
