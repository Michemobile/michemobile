import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function BookingCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cancelBooking = async () => {
      try {
        const bookingId = searchParams.get('booking_id');

        if (!bookingId) {
          throw new Error('Missing booking information');
        }

        // Update booking status to cancelled
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', bookingId);

        if (updateError) throw updateError;

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error cancelling booking:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    cancelBooking();
  }, [searchParams]);

  const handleRetry = () => {
    navigate(-1); // Go back to the booking page
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
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <CardTitle className="text-center">Booking Cancelled</CardTitle>
        <CardDescription className="text-center">
          Your booking has been cancelled. No payment has been processed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-4">
        <Button onClick={handleRetry} variant="secondary">
          Try Again
        </Button>
        <Button onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
