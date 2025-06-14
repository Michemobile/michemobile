import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { type User } from "@supabase/supabase-js";
import { auth, api, supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<"client" | "professional" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        console.log("Dashboard: Checking user session...");
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          console.log("Dashboard: No user session found.");
          setUser(null);
          setUserType(null);
          return;
        }

        console.log("Dashboard: User found", authUser);
        setUser(authUser);

        console.log("Dashboard: Fetching profile...");
        const profile = await api.getUserProfile(authUser.id);

        if (profile) {
          console.log("Dashboard: Profile found with type:", profile.type);
          setUserType(profile.type);
        } else {
          console.log("Dashboard: No profile found for this user. Awaiting role selection.");
          setError("To continue, please select the type of account you'd like to create.");
        }
      } catch (e) {
        console.error("Dashboard: Error determining user status:", e);
        setError("An error occurred while loading your account. Please try logging in again.");
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-bronze" />
      </div>
    );
  }

  if (error) {
    // This UI is shown when a user is authenticated but has no profile.
    // It allows them to choose a role.
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold gradient-text mb-6">Complete Your Account Setup</h1>
            <div className="max-w-md mx-auto bg-white p-8 rounded-lg border border-brand-bronze/20">
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-y-4">
                <Button
                  className="w-full bg-brand-bronze hover:bg-brand-bronze/80 text-white"
                  onClick={async () => {
                    if (!user) return;
                    try {
                      await api.createClientProfile({
                        first_name: user.user_metadata?.first_name || "New",
                        last_name: user.user_metadata?.last_name || "User",
                        email: user.email!,
                        phone: "",
                        username: `user_${Date.now()}`,
                      });
                      window.location.reload();
                    } catch (e) {
                      console.error("Error creating client profile:", e);
                    }
                  }}
                  disabled={!user}
                >
                  I'm a Client
                </Button>
                <Link to="/join-as-pro">
                  <Button className="w-full bg-brand-silver hover:bg-brand-silver/80 text-black">
                    I'm a Professional
                  </Button>
                </Link>
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await auth.signOut();
                      setUser(null); // Update state to trigger re-render/redirect
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (userType === "client") {
    console.log("Redirecting to client dashboard");
    return <Navigate to="/dashboard/client" replace />;
  }

  if (userType === "professional") {
    console.log("Redirecting to professional dashboard");
    return <Navigate to="/dashboard/professional" replace />;
  }

  // If not loading, no error, and no userType, it means no user session. Redirect to login.
  return <Navigate to="/login" replace />;
};

export default Dashboard;
