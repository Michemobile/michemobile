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
    // Get the request body
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

    // Get professional's Stripe account ID and current service details
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('stripe_account_id')
      .eq('id', professionalId)
      .single()

    if (profError || !professional?.stripe_account_id) {
      throw new Error('Professional not found or Stripe account not connected')
    }

    // Get current service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('stripe_price_id')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      throw new Error('Service not found')
    }

    // Create a new product
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
    })

    // Create a new price for the product
    const priceResponse = await stripe.prices.create({
      unit_amount: Math.round(priceAmount * 100), // Convert dollars to cents
      currency: 'usd',
      product: product.id,
      metadata: {
        professional_id: professionalId
      }
    }, {
      stripeAccount: professional.stripe_account_id
    })

    // If the service had a previous price, deactivate it
    if (service.stripe_price_id) {
      try {
        await stripe.prices.update(service.stripe_price_id, { active: false }, {
          stripeAccount: professional.stripe_account_id
        });
      } catch (error) {
        console.error('Error deactivating old price:', error);
        // Continue anyway since this is not critical
      }
    }

    // Return the new price ID
    return new Response(
      JSON.stringify({
        priceId: priceResponse.id,
        productId: product.id
      }),
      {
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error: any) {
    // Log detailed error information
    console.error('Function error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      details: error.details
    });

    let errorResponse: {
      error: string;
      type: string;
      details?: any;
    };

    if (error.name === 'PostgrestError') {
      errorResponse = {
        error: `Database error: ${error.message}`,
        type: 'database',
        details: error.details || {}
      };
    } else if (error.type === 'StripeError') {
      errorResponse = {
        error: `Stripe error: ${error.message}`,
        type: 'stripe',
        details: { code: error.code }
      };
    } else {
      errorResponse = {
        error: error.message || 'An unknown error occurred',
        type: 'general',
        details: { stack: error.stack }
      };
    }

    return new Response(
      JSON.stringify(errorResponse),
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
