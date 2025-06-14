import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { subscribeToPush } from '@/utils/notifications';
import { supabase } from '../../../lib/supabase'; // Corrected import path
import { Loader2 } from 'lucide-react';

interface ProfessionalWithProfile {
  id: string;
  profiles: {
    email: string;
  };
}

const NotificationSettings: React.FC = () => {
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeOnboarded, setStripeOnboarded] = useState<boolean | null>(null);
  const [showStripeSuccess, setShowStripeSuccess] = useState(false);
    useEffect(() => {
    // Check for the query parameter on component mount
    const checkStripeReturn = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('stripe_return') === 'true') {
        setShowStripeSuccess(true);
      }
    };

    // Check if the professional has already onboarded with Stripe
    const checkOnboardingStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('professionals')
          .select('stripe_account_id')
          .eq('user_id', user.id)
          .single();

        if (data && data.stripe_account_id) {
          setStripeOnboarded(true);
        } else {
          setStripeOnboarded(false);
        }
      }
    };

    checkStripeReturn();
    checkOnboardingStatus();
  }, []);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    setStripeError(null);

    try {
      // Get the current session and user
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!session || !user) {
        throw new Error('Not authenticated');
      }

      // Get professional data
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select(`
          id,
          profiles!inner (
            email
          )
        `)
        .eq('profile_id', user.id)
        .single() as { data: ProfessionalWithProfile | null, error: any };

      if (profError || !professional) {
        throw new Error('Professional profile not found');
      }

      const professionalData = {
        id: professional.id,
        email: professional.profiles.email
      };

      console.log('Making request to Edge Function...');

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          professional_id: professionalData.id,
          email: professionalData.email,
          country: 'US'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to Stripe');
      }

      const data = await response.json();
      
      // Check if there are pending requirements
      if (data.requirements?.currently_due?.length > 0) {
        console.log('Stripe account requires additional information:', data.requirements);
      }

      // Redirect to Stripe onboarding/update URL
      if (data.accountLink) {
        window.location.href = data.accountLink;
      } else {
        throw new Error('No Stripe onboarding URL received');
      }
    } catch (error: any) {
      console.error('Stripe connection error:', error);
      setStripeError(
        error.message || 'Failed to connect to Stripe. Please try again.'
      );
    } finally {
      setStripeLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }

    if (Notification.permission === 'granted') {
      await subscribeToPush();
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      } else {
        alert('Notification permission was denied. Please enable it in your browser settings to receive push notifications.');
      }
    } else {
      // Permission is denied
      alert('Notification permission is currently denied. Please go to your browser settings to enable it for this site.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Push Notification Settings</h1>
      <p className="mb-6 text-gray-700">
        Enable push notifications to receive instant alerts about new bookings and important updates directly on your device.
      </p>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-3">Booking Alerts</h2>
        <p className="text-sm text-gray-600 mb-4">
          Get notified immediately when a client books one of your services.
        </p>
        <Button onClick={handleEnableNotifications}>
          Enable Push Notifications
        </Button>
        {Notification.permission === 'granted' && (
          <p className="text-sm text-green-600 mt-3">
            Push notifications are currently enabled.
          </p>
        )}
        {Notification.permission === 'denied' && (
          <p className="text-sm text-red-600 mt-3">
            Push notifications are currently disabled. Please update your browser settings.
          </p>
        )}
      </div>
      
      {/* Stripe Connect Section */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-3">Payment Setup</h2>
        <p className="text-sm text-gray-600 mb-4">
          Connect your Stripe account to receive payments directly from clients for your services.
        </p>
        
        {showStripeSuccess && (
          <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50" role="alert">
            <span className="font-medium">Welcome back!</span> Your account details have been submitted to Stripe. You will be notified once the verification process is complete.
          </div>
        )}

        {stripeOnboarded === null && <p>Loading payment status...</p>}

        {stripeOnboarded === true && !showStripeSuccess && (
           <p className="text-sm text-green-600 mt-3">
            Your account is connected to Stripe and ready to receive payments.
          </p>
        )}

        {stripeOnboarded === false && (
          <Button onClick={handleConnectStripe} disabled={stripeLoading}>
            {stripeLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</> : 'Connect with Stripe'}
          </Button>
        )}

        {stripeError && (
          <p className="text-sm text-red-600 mt-3">
            Error: {stripeError}
          </p>
        )}
      </div>

      {/* You can add more notification settings here in the future */}
    </div>
  );
};

export default NotificationSettings;
