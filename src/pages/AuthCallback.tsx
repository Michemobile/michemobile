import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash
        const hash = window.location.hash;
        
        // Process the hash if it exists
        if (hash) {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          if (data?.session) {
            // Successfully signed in
            console.log("Authentication successful, session established");
            
            // Get the user type selection from localStorage
            const selectedUserType = localStorage.getItem('selectedUserType');
            console.log("Retrieved user type from localStorage:", selectedUserType);
            
            // Check if user already has a profile
            try {
              const user = data.session.user;
              const profile = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
              
              if (profile.data) {
                console.log("User profile found:", profile.data);
                // User has a profile, redirect to the appropriate dashboard
                if (profile.data.type === 'client') {
                  navigate("/dashboard/client", { replace: true });
                } else if (profile.data.type === 'professional') {
                  // Check if this is a professional who has just been approved
                  const { data: professionalData } = await supabase
                    .from('professionals')
                    .select('is_approved, is_onboarding_complete')
                    .eq('profile_id', user.id)
                    .single();
                  
                  // If professional is approved but hasn't seen the onboarding complete message
                  if (professionalData?.is_approved && !professionalData?.is_onboarding_complete) {
                    // Update the professional record to mark onboarding as complete
                    await supabase
                      .from('professionals')
                      .update({ is_onboarding_complete: true })
                      .eq('profile_id', user.id);
                    
                    // Redirect to the onboarding complete page
                    navigate("/pro-onboarding-complete", { replace: true });
                  } else {
                    // Regular professional dashboard - direct to main dashboard
                    navigate("/dashboard/professional", { replace: true });
                  }
                } else {
                  navigate("/dashboard", { replace: true }); // Let the dashboard component handle unknown types
                }
              } else {
                console.log("No user profile found, creating one based on selection");
                // User doesn't have a profile, create one based on the selected type
                if (selectedUserType === 'client') {
                  // Create a client profile using admin client to bypass RLS
                  const adminClient = supabaseAdmin || supabase;
                  console.log("Using admin client to create client profile:", !!supabaseAdmin);
                  
                  await adminClient
                    .from('profiles')
                    .insert([{
                      id: user.id,
                      first_name: "New",
                      last_name: "User",
                      email: user.email || `user-${Date.now()}@example.com`,
                      phone: "",
                      username: `user_${Date.now()}`,
                      type: 'client'
                    }]);
                  
                  // Redirect to client dashboard
                  navigate("/dashboard/client", { replace: true });
                } else if (selectedUserType === 'professional') {
                  // For professionals, redirect to the join-as-pro page to complete profile
                  navigate("/join-as-pro", { replace: true });
                } else {
                  // Default to dashboard if no selection was made
                  navigate("/dashboard", { replace: true });
                }
              }
            } catch (profileError) {
              console.error("Error checking/creating profile:", profileError);
              // If there's an error, still redirect to dashboard
              navigate("/dashboard", { replace: true });
            }
          } else {
            throw new Error("No session found");
          }
        }
      } catch (err) {
        console.error("Error during auth callback:", err);
        setError("Authentication failed. Please try again.");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
            <p className="text-gray-700 mb-6">{error}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="px-4 py-2 bg-brand-bronze text-white rounded-md"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Completing Sign In</h1>
            <p className="text-gray-700 mb-6">Please wait while we verify your credentials...</p>
            <div className="flex justify-center">
              <Spinner className="h-8 w-8 text-brand-bronze" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 