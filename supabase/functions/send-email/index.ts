import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define types for our request body
interface WebhookRequest {
  type: 'booking_notification';
  bookingId?: string;
}

// Define the booking type for our database
interface Booking {
  id: string;
  created_at: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  location: string;
  notes: string | null;
  total_amount: number;
  payment_method?: string;
}

// Define the service type for our database
interface Service {
  id: string;
  professional_id: string;
  name: string;
  price: number;
  description: string;
  is_custom: boolean;
  created_at: string;
}

// Define the profile type for our database
interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  username: string;
  type: 'client' | 'professional';
}

// Define the professional type for our database
interface Professional {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  specialty: string;
  years_experience: number;
  certification: string;
  is_approved: boolean;
  is_onboarding_complete: boolean;
  created_at: string;
  image: string | null; // Added image field that was missing
  service_area?: string;
}

// Function to send booking data to Make.com webhook
async function sendBookingWebhook(bookingId: string, supabase: any) {
  try {
    // Get the booking data with related information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'Booking not found',
        details: bookingError
      };
    }

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', booking.client_id)
      .single();

    if (clientError || !client) {
      return {
        success: false,
        error: 'Client not found',
        details: clientError
      };
    }

    // Get professional information
    const { data: professional, error: professionalError } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', booking.professional_id)
      .single();

    if (professionalError || !professional) {
      return {
        success: false,
        error: 'Professional not found',
        details: professionalError
      };
    }

    // Get professional's profile
    const { data: professionalProfile, error: professionalProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', professional.profile_id)
      .single();

    if (professionalProfileError || !professionalProfile) {
      return {
        success: false,
        error: 'Professional profile not found',
        details: professionalProfileError
      };
    }

    // Get service information
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', booking.service_id)
      .single();

    if (serviceError || !service) {
      return {
        success: false,
        error: 'Service not found',
        details: serviceError
      };
    }

    // Prepare the data for the webhook
    const webhookData = {
      booking: {
        id: booking.id,
        created_at: booking.created_at,
        booking_date: booking.booking_date,
        status: booking.status,
        location: booking.location,
        notes: booking.notes,
        total_amount: booking.total_amount,
        payment_method: booking.payment_method || 'Card'
      },
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        phone: client.phone
      },
      professional: {
        id: professional.id,
        name: `${professionalProfile.first_name} ${professionalProfile.last_name}`,
        email: professionalProfile.email,
        phone: professionalProfile.phone,
        service_area: professional.service_area,
        bio: professional.bio
      },
      service: {
        id: service.id,
        name: service.name,
        price: service.price,
        description: service.description
      }
    };

    // Send data to Make.com webhook
    const webhookUrl = 'https://hook.us1.make.com/x9373mbqjdrrt227e6s70eagwxxs8txv';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const responseText = await response.text();
      return {
        success: false,
        error: 'Failed to send data to webhook',
        status: response.status,
        details: responseText
      };
    }

    const responseData = await response.json().catch(() => ({}));
    return {
      success: true,
      message: 'Booking data sent to webhook successfully',
      data: responseData
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: 'Failed to process booking webhook',
      details: errorMessage
    };
  }
}

serve(async (req) => {
  try {
    // Get the request body
    const requestBody = await req.json() as WebhookRequest;
    const { type, bookingId } = requestBody;

    // Create a Supabase client with service role key to bypass RLS policies
    // This is necessary to avoid RLS policy violations when accessing tables and storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (type === 'booking_notification') {
      // Handle booking notification webhook
      if (!bookingId) {
        return new Response(
          JSON.stringify({ error: 'Booking ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Send booking data to webhook
      const result = await sendBookingWebhook(bookingId as string, supabase);
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
