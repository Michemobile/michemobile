import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import CustomPaymentsDashboard from './CustomPaymentsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const PaymentsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    const checkStripeAccount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          return;
        }

        // Get professional ID and stripe account status
        const { data: professional, error: profError } = await supabase
          .from('professionals')
          .select('id, stripe_account_id')
          .eq('profile_id', user.id)
          .single();

        if (profError) {
          throw profError;
        }

        if (professional) {
          setProfessionalId(professional.id);
          setHasStripeAccount(!!professional.stripe_account_id);
        }
      } catch (err) {
        console.error('Error checking Stripe account:', err);
        setError('Failed to load payment dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkStripeAccount();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8 text-brand-bronze" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!hasStripeAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Stripe Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">You need to connect your Stripe account to view your payments dashboard.</p>
          <Button onClick={() => navigate('/dashboard/professional/stripe-connect')}>
            Connect Stripe Account
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <CustomPaymentsDashboard />
    </div>
  );
};

export default PaymentsDashboard; 