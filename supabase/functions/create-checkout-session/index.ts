import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { Stripe } from 'https://esm.sh/stripe@13.10.0?target=deno&deno-std=0.177.0';

// Function to get CORS headers based on the request origin
const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || 'https://michemobile.online';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
    'Access-Control-Allow-Credentials': 'true'
  };
};

interface BookingRequest {
  serviceId: string;
  professionalId: string;
  clientId: string;
  bookingDate: string;
  location: string;
}

// Deno environment interface
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

serve(async (req) => {  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No content
      headers: getCorsHeaders(req)
    });
  }

  let requestBody: BookingRequest | null = null;

  try {
    console.log('Request received');
    
    // Log request headers
    console.log('Request headers:', {
      auth: req.headers.get('Authorization'),
      contentType: req.headers.get('Content-Type'),
      apikey: req.headers.get('apikey')
    });

    // Parse and validate request body
    const rawBody = await req.json();
    requestBody = rawBody as BookingRequest;
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Log environment variables (without values)
    console.log('Environment variables present:', {
      STRIPE_SECRET_KEY: !!Deno.env.get('STRIPE_SECRET_KEY'),
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      APP_URL: !!Deno.env.get('APP_URL')
    });

    const {
      serviceId,
      professionalId,
      clientId,
      bookingDate,
      location
    } = requestBody;    // Get environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appUrl = Deno.env.get('APP_URL');

    // Validate environment variables
    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey || !appUrl) {
      throw new Error('Missing required environment variables');
    }

    // Validate required fields
    const missingFields: string[] = [];
    if (!serviceId) missingFields.push('serviceId');
    if (!professionalId) missingFields.push('professionalId');
    if (!clientId) missingFields.push('clientId');
    if (!bookingDate) missingFields.push('bookingDate');
    if (!location) missingFields.push('location');
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);    // Get service details including price
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        professionals:professional_id (
          stripe_account_id
        )
      `)
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      console.error('Service fetch error:', serviceError);
      throw new Error(`Service not found: ${serviceError?.message || 'No service data returned'}`);
    }

    console.log('Service found:', {
      id: service.id,
      name: service.name,
      price: service.price,
      hasStripePrice: !!service.stripe_price_id,
      professional: service.professionals ? {
        id: service.professionals.id,
        hasStripeAccount: !!service.professionals.stripe_account_id
      } : null
    });

    // Get professional's Stripe account
    const professional = service.professionals;
    if (!professional?.stripe_account_id) {
      throw new Error(`Professional not found or Stripe account not connected. Professional ID: ${professionalId}`);
    }

    // Validate and convert price
    if (!service.price || typeof service.price !== 'number') {
      console.error('Invalid service price:', {
        serviceId: service.id,
        price: service.price,
        type: typeof service.price
      });
      throw new Error(`Service ${service.id} does not have a valid price set`);
    }

    // Validate or create Stripe price
    let stripePrice;
    try {
      if (service.stripe_price_id) {
        try {
          // Try to retrieve the existing price
          stripePrice = await stripe.prices.retrieve(service.stripe_price_id);
          console.log('Retrieved existing Stripe price:', stripePrice.id);
        } catch (error) {
          console.log('Failed to retrieve existing price:', error);
          stripePrice = null;
        }
      }

      if (!stripePrice) {
        // Create new product and price
        console.log('Creating new Stripe product and price for service:', service.id);
        const product = await stripe.products.create({
          name: service.name,
          description: service.description || undefined,
          metadata: {
            service_id: service.id
          }
        });

        stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(service.price * 100), // Convert to cents
          currency: 'usd' // Hardcoded for now, could be made configurable
        });

        // Update service with new Stripe price ID
        const { error: updateError } = await supabase
          .from('services')
          .update({ stripe_price_id: stripePrice.id })
          .eq('id', service.id);

        if (updateError) {
          console.error('Failed to update service with Stripe price ID:', updateError);
          // Continue anyway since we have the price ID
        }

        console.log('Created new Stripe price:', stripePrice.id);
      }
    } catch (error) {
      console.error('Error handling Stripe price:', error);
      throw new Error(`Failed to handle Stripe price: ${error.message}`);
    }

    console.log('Creating booking with price:', {
      servicePrice: service.price
    });

    // Create a temporary booking record with pending status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: clientId,
        professional_id: professionalId,
        service_id: serviceId,
        booking_date: bookingDate,
        location: location,
        status: 'pending',
        total_amount: service.price // Store the price in dollars/main currency unit
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Booking creation error:', bookingError);
      throw new Error(`Failed to create booking: ${bookingError?.message || 'No booking data returned'}`);
    }

    // Calculate amounts in cents for Stripe
    const amountInCents = Math.round(service.price * 100);
    const platformFeeInCents = Math.round(amountInCents * 0.1); // 10% platform fee

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id, // Use the validated/created price ID
          quantity: 1,
        },
      ],      mode: 'payment',      success_url: `${appUrl}/client-dashboard?booking_success=true&session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
      cancel_url: `${appUrl}/client-dashboard?booking_cancelled=true&booking_id=${booking.id}`,
      metadata: {
        booking_id: booking.id,
        service_id: serviceId,
        professional_id: professionalId,
        client_id: clientId
      },
      payment_intent_data: {
        on_behalf_of: professional.stripe_account_id,
        application_fee_amount: platformFeeInCents,
        transfer_data: {
          destination: professional.stripe_account_id
        }
      }
    });    return new Response(
      JSON.stringify({
        sessionId: session.id,
        checkoutUrl: session.url,
        bookingId: booking.id
      }),
      {
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json'
        }
      }
    )} catch (error: any) {
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
        requestData?: BookingRequest;
      };

      if (error.name === 'PostgrestError') {
        errorResponse = {
          error: `Database error: ${error.message}`,
          type: 'database',
          details: error.details || {},
          requestData: requestBody || undefined
        };
      } else if (error.type === 'StripeError') {
        errorResponse = {
          error: `Stripe error: ${error.message}`,
          type: 'stripe',
          details: { code: error.code },
          requestData: requestBody || undefined
        };
      } else {
        errorResponse = {
          error: error.message || 'An unknown error occurred',
          type: 'general',
          details: { stack: error.stack },
          requestData: requestBody || undefined
        };
      }

      return new Response(
        JSON.stringify(errorResponse),
        {
          status: 400,          headers: {
            ...getCorsHeaders(req),
            'Content-Type': 'application/json'
          }
        }
      )
  }
})
