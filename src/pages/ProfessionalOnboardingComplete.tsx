import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const ProfessionalOnboardingComplete = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnectStripe = async () => {
    setLoading(true);
    setError('');
    try {
      // Get current user and professional data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to connect Stripe');
      }

      // Get professional ID from the database
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (profError || !professional) {
        throw new Error('Professional profile not found');
      }

      // Call the Edge Function with proper parameters
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          professional_id: professional.id,
          email: user.email,
          country: 'US'
        }
      });

      if (error) throw new Error(error.message);
      if (data.accountLink) {
        window.location.href = data.accountLink;
      } else {
        throw new Error('Could not get Stripe onboarding URL.');
      }
    } catch (err: any) {
      setError('Failed to connect to Stripe. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 bg-brand-cream">
        <div className="container max-w-3xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            
            <h1 className="text-3xl font-bold text-black mb-4">
              Your Profile is Ready!
            </h1>
            
            <div className="space-y-4 text-gray-700 mb-8">
              <p>
                Your professional profile has been created. The final step is to connect your Stripe account so you can get paid for your services.
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md mb-8 text-left">
              <h3 className="font-bold">Next Step: Connect Stripe</h3>
              <p>To start accepting payments, you need to connect a Stripe account. Click the button below to get started.</p>
            </div>

            <div className="flex flex-col items-center">
              <Button onClick={handleConnectStripe} disabled={loading} className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold mb-4">
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Connect with Stripe
              </Button>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <Button asChild variant="link" className="text-gray-600">
                <Link to="/dashboard/professional">
                  I'll do this later
                </Link>
              </Button>
            </div>

          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfessionalOnboardingComplete;
