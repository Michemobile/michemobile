import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { auth, api } from "@/lib/supabase";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState<"client" | "professional" | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          const user = await auth.getUser();
          // Get user profile if needed
          if (user) {
            try {
              const profile = await api.getUserProfile(user.id);
              if (profile) {
                // Ensure we have a name to display
                if (profile.first_name && profile.last_name) {
                  setUserName(`${profile.first_name} ${profile.last_name}`);
                } else if (profile.first_name) {
                  setUserName(profile.first_name);
                } else if (user.email) {
                  // If no name is available, use the email username part
                  setUserName(user.email.split('@')[0]);
                } else {
                  setUserName("User"); // Fallback
                }
                setUserType(profile.type as "client" | "professional");
                console.log("User type in navbar:", profile.type);
                console.log("User name set to:", userName);
              } else {
                // No profile found, but we have a user - use email or default
                if (user.email) {
                  setUserName(user.email.split('@')[0]);
                } else {
                  setUserName("User");
                }
                console.log("No profile found for user, using fallback name");
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
              // Still set a name even if profile fetch fails
              if (user.email) {
                setUserName(user.email.split('@')[0]);
              } else {
                setUserName("User");
              }
            }
          }
        } else {
          setIsAuthenticated(false);
          setUserName("");
          setUserType(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        setUserType(null);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsAuthenticated(false);
      setUserName("");
      setUserType(null);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="fixed w-full z-50 bg-white backdrop-blur-sm text-gray-900 border-b border-brand-lightsilver shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold gradient-text flex items-center">
              Míche
              <img src="https://ik.imagekit.io/pg1g5ievp/Subtract.png?updatedAt=1747540715414" alt="" className="h-6 w-auto inline-block mx-0.5 align-middle" />
              Mobile
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm hover:text-brand-silver transition-colors">
              Home
            </Link>
            <Link to="/services" className="text-sm hover:text-brand-silver transition-colors">
              Services
            </Link>
            <Link to="/professionals" className="text-sm hover:text-brand-silver transition-colors">
              Professionals
            </Link>
            <Link to="/how-it-works" className="text-sm hover:text-brand-silver transition-colors">
              How It Works
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to={userType === "client" ? "/dashboard/client" : userType === "professional" ? "/dashboard/professional" : "/dashboard"}>
                    <Button variant="ghost" className="text-black hover:text-black flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="bg-black text-white border-black flex items-center"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-black hover:text-white">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-brand-silver hover:bg-brand-bronze text-black">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-900" />
            ) : (
              <Menu className="h-6 w-6 text-gray-900" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 flex flex-col space-y-4 animate-fade-in">
            <Link
              to="/"
              className="text-sm hover:text-brand-silver transition-colors px-2 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/services"
              className="text-sm hover:text-brand-silver transition-colors px-2 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              to="/professionals"
              className="text-sm hover:text-brand-silver transition-colors px-2 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              Professionals
            </Link>
            <Link
              to="/how-it-works"
              className="text-sm hover:text-brand-silver transition-colors px-2 py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              How It Works
            </Link>
            <div className="flex flex-col space-y-2 pt-2 border-t border-brand-lightsilver">
              {isAuthenticated ? (
                <>
                  <Link to={userType === "client" ? "/dashboard/client" : userType === "professional" ? "/dashboard/professional" : "/dashboard"} onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full text-gray-900 flex items-center justify-center">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full bg-black text-white border-black flex items-center justify-center"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full text-gray-900">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-brand-silver hover:bg-brand-bronze text-black">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
