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
    const { bookingId, sessionId } = await req.json();

    if (!bookingId || !sessionId) {
      throw new Error('Missing required fields: bookingId and sessionId are required');
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

    // Verify the session is paid
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      throw new Error('Payment is not completed');
    }

    // Get the booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, service:services(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Start a transaction to update booking status and revenue
    const { data: result, error: transactionError } = await supabase.rpc('handle_successful_payment', {
      p_booking_id: bookingId,
      p_amount: booking.total_amount
    });

    if (transactionError) {
      throw transactionError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: result
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
