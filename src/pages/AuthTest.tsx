import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, supabase } from "@/lib/supabase";

const AuthTest = () => {
  const [authState, setAuthState] = useState({
    user: null,
    session: null,
    loading: true,
    error: null
  });
  const [apiTest, setApiTest] = useState({
    profilesResult: null,
    profilesError: null,
    loading: false
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data: user } = await supabase.auth.getUser();
      
      setAuthState({
        user,
        session,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthState({
        user: null,
        session: null,
        loading: false,
        error
      });
    }
  };
  
  const testProfilesAPI = async () => {
    setApiTest({
      ...apiTest,
      loading: true
    });
    
    try {
      // Get the current user
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error("No authenticated user found");
      }
      
      // Test querying profiles table with proper headers
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      
      setApiTest({
        profilesResult: profiles,
        profilesError: null,
        loading: false
      });
    } catch (error) {
      console.error("API test error:", error);
      setApiTest({
        profilesResult: null,
        profilesError: error,
        loading: false
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold gradient-text mb-8">Auth & API Diagnostic</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="bg-brand-bronze/10">
                <CardTitle>Authentication Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {authState.loading ? (
                  <p>Loading authentication status...</p>
                ) : authState.error ? (
                  <div className="text-red-500">
                    <p>Error checking authentication:</p>
                    <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(authState.error, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">
                      <span className="font-medium">Status:</span>{" "}
                      {authState.user ? (
                        <span className="text-green-600">Authenticated</span>
                      ) : (
                        <span className="text-yellow-600">Not Authenticated</span>
                      )}
                    </p>
                    
                    {authState.user && (
                      <>
                        <p className="mb-2">
                          <span className="font-medium">User ID:</span>{" "}
                          {authState.user.user.id}
                        </p>
                        <p className="mb-2">
                          <span className="font-medium">Email:</span>{" "}
                          {authState.user.user.email}
                        </p>
                        <p className="mb-4">
                          <span className="font-medium">Last Sign In:</span>{" "}
                          {new Date(authState.user.user.last_sign_in_at).toLocaleString()}
                        </p>
                        
                        <div className="text-xs mt-6">
                          <p className="font-medium mb-1">Session Details:</p>
                          <pre className="bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(authState.session, null, 2)}
                          </pre>
                        </div>
                      </>
                    )}
                    
                    <Button 
                      onClick={checkAuth} 
                      className="mt-4" 
                      variant="outline"
                    >
                      Refresh Auth Status
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-brand-bronze/10">
                <CardTitle>API Connection Test</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Button 
                  onClick={testProfilesAPI}
                  disabled={apiTest.loading || !authState.user}
                >
                  Test Profiles API
                </Button>
                
                {apiTest.loading ? (
                  <p className="mt-4">Testing API connection...</p>
                ) : apiTest.profilesError ? (
                  <div className="mt-4 text-red-500">
                    <p>Error connecting to Profiles API:</p>
                    <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(apiTest.profilesError, null, 2)}
                    </pre>
                  </div>
                ) : apiTest.profilesResult ? (
                  <div className="mt-4">
                    <p className="text-green-600 mb-2">Successfully connected to Profiles API</p>
                    <p className="mb-2">Found {apiTest.profilesResult.length} profiles</p>
                    <div className="text-xs">
                      <pre className="bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(apiTest.profilesResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8">
            <Card>
              <CardHeader className="bg-brand-bronze/10">
                <CardTitle>Possible Solutions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <h3 className="font-medium text-lg mb-2">406 (Not Acceptable) Errors:</h3>
                <ol className="list-decimal pl-5 mb-4">
                  <li>Check that your API requests are formatting query parameters correctly</li>
                  <li>Verify content-type headers are appropriate (application/json)</li>
                  <li>Ensure select statements follow Supabase's PostgREST format</li>
                </ol>
                
                <h3 className="font-medium text-lg mb-2">403 (Forbidden) Errors:</h3>
                <ol className="list-decimal pl-5 mb-4">
                  <li>Check that your session token is valid and not expired</li>
                  <li>Verify you have proper Row Level Security (RLS) policies in Supabase</li>
                  <li>Ensure your API calls include the authentication header</li>
                </ol>
                
                <p className="mt-4 text-sm text-gray-600">
                  After testing, you can use the demo dashboards to preview functionality until API issues are resolved.
                </p>
                
                <div className="mt-4 flex space-x-4">
                  <Button asChild variant="outline">
                    <a href="/dashboard/demo">View Dashboard Demo</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AuthTest; 