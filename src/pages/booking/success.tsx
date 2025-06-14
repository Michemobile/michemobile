import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateBooking = async () => {
      try {
        const bookingId = searchParams.get('booking_id');
        const sessionId = searchParams.get('session_id');

        if (!bookingId || !sessionId) {
          throw new Error('Missing booking information');
        }        // Call our Edge Function to handle the successful payment
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-successful-payment`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              bookingId,
              sessionId
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to process payment completion');
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error updating booking:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    updateBooking();
  }, [searchParams]);

  const handleViewBookings = () => {
    navigate('/dashboard/client/bookings');
  };

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-20">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-green-100 p-3">
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-center">Booking Confirmed!</CardTitle>
        <CardDescription className="text-center">
          Your appointment has been successfully booked and payment processed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={handleViewBookings} className="mt-4">
          View My Bookings
        </Button>
      </CardContent>
    </Card>
  );
}
