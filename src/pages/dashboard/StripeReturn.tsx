import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const StripeReturn: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkStripeConnection = async () => {
      try {
        // Give Stripe a moment to process the redirect
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        const { data: professional, error } = await supabase
          .from('professionals')
          .select('stripe_account_id')
          .eq('user_id', user.id)
          .single();

        if (error || !professional?.stripe_account_id) {
          // If still no account, send back to onboarding
          navigate('/dashboard/onboarding');
        } else {
          // Success, send to professional dashboard
          navigate('/dashboard/professional');
        }
      } catch (error) {
        console.error('Error verifying Stripe connection:', error);
        // On error, send back to onboarding to try again
        navigate('/dashboard/onboarding');
      }
    };

    checkStripeConnection();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin mb-4" />
      <h1 className="text-2xl font-semibold">Finalizing your Stripe connection...</h1>
      <p className="text-gray-600">Please wait while we redirect you.</p>
    </div>
  );
};

export default StripeReturn;
