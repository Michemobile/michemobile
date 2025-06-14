import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const StripeConnect: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('stripe_account_id, stripe_account_status')
        .eq('profile_id', user.id)
        .single();

      if (profError) throw profError;

      if (professional?.stripe_account_id) {
        setAccountId(professional.stripe_account_id);
        if (professional.stripe_account_status === 'active') {
          navigate('/dashboard/professional');
        }
      }
    } catch (err: any) {
      console.error('Error checking account status:', err);
      setError(err.message);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get professional ID
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (profError) throw profError;
      if (!professional) throw new Error('Professional profile not found');
      if (!user.email) throw new Error('User email not found');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            professional_id: professional.id,
            email: user.email,
            country: 'US', // You might want to make this dynamic
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stripe account');
      }

      const { accountLink, accountId } = await response.json();
      setAccountId(accountId);

      // Redirect to Stripe onboarding
      window.location.href = accountLink;
    } catch (err: any) {
      console.error('Error creating Stripe account:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">Connect with Stripe</h1>
        
        <div className="space-y-6">
          <div className="prose">
            <p>
              To receive payments from clients, you need to connect your Stripe account.
              This allows us to:
            </p>
            <ul>
              <li>Send payments directly to your bank account</li>
              <li>Handle payment processing securely</li>
              <li>Manage service fees and commissions automatically</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <h3 className="font-semibold text-blue-900">Platform Fee Information</h3>
            <p className="text-blue-800">
              Miche-Mobile charges a 10% platform fee on each transaction.
              This fee covers payment processing, platform maintenance, and customer support.
            </p>
          </div>

          <Button
            onClick={handleCreateAccount}
            disabled={loading}
            className="w-full bg-brand-bronze hover:bg-brand-bronze/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up your account...
              </>
            ) : (
              'Connect with Stripe'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StripeConnect; 