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
    const { serviceId, professionalId } = await req.json()

    // Validate required fields
    if (!serviceId || !professionalId) {
      throw new Error('Missing required fields: serviceId and professionalId are required')
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

    // Get professional's Stripe account ID and service details
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('stripe_account_id')
      .eq('id', professionalId)
      .single()

    if (profError || !professional?.stripe_account_id) {
      throw new Error('Professional not found or Stripe account not connected')
    }

    // Get service details including Stripe price ID
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('stripe_price_id, name')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      throw new Error('Service not found')
    }

    // If service has a Stripe price ID, deactivate it and the associated product
    if (service.stripe_price_id) {
      try {
        // First, get the price to find the product ID
        const price = await stripe.prices.retrieve(service.stripe_price_id, {
          stripeAccount: professional.stripe_account_id
        });

        // Deactivate the price
        await stripe.prices.update(service.stripe_price_id, { 
          active: false 
        }, {
          stripeAccount: professional.stripe_account_id
        });

        // Deactivate the product
        if (price.product && typeof price.product === 'string') {
          await stripe.products.update(price.product, { 
            active: false 
          }, {
            stripeAccount: professional.stripe_account_id
          });
        }

        console.log(`Successfully deactivated Stripe price ${service.stripe_price_id} and product for service ${service.name}`);
      } catch (stripeError) {
        console.error('Error deactivating Stripe resources:', stripeError);
        // Continue with database deletion even if Stripe cleanup fails
        // This prevents orphaned database records
      }
    }

    // Delete the service from the database
    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (deleteError) {
      throw new Error(`Failed to delete service from database: ${deleteError.message}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Service deleted successfully from both database and Stripe'
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