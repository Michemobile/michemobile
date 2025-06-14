import React, { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Users, Briefcase, CreditCard, Settings, User, Image, Clock, Bell, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { supabase, supabaseAdmin, auth } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccountModal } from "@/components/DeleteAccountModal"; // Import the modal

interface SidebarItemProps {
  icon: ReactNode;
  text: string;
  to?: string; // 'to' is optional if onClick is provided
  onClick?: (event: React.MouseEvent<HTMLElement>) => void; // Optional onClick handler
  active: boolean;
  itemClassName?: string;
}

const SidebarItem = ({ icon, text, to, onClick, active, itemClassName }: SidebarItemProps) => {
  const commonProps = {
    className: cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors",
      active && "bg-brand-bronze/10 text-brand-bronze font-medium",
      itemClassName
    ),
    onClick: onClick,
  };

  if (to) {
    return (
      <Link to={to} {...commonProps}>
        {icon}
        <span>{text}</span>
      </Link>
    );
  }

  return (
    <button type="button" {...commonProps}>
      {icon}
      <span>{text}</span>
    </button>
  );
};

interface ProfessionalDashboardLayoutProps {
  children: ReactNode;
}

const ProfessionalDashboardLayout = ({ children }: ProfessionalDashboardLayoutProps) => {
  const location = useLocation();
  const pathname = location.pathname;
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    profileImageUrl: "/placeholder.svg"
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  useEffect(() => {
    fetchProfileData();
  }, []);
  
  const fetchProfileData = async () => {
    try {
      // Get current user
      const session = await auth.getSession();
      if (!session?.user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }
      
      const userId = session.user.id;
      console.log('Fetching profile data for user:', userId);
      
      // Use admin client if available for more reliable access
      const adminClient = supabaseAdmin || supabase;
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await adminClient
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        throw profileError;
      }
      
      // Initialize with default values
      let firstName = profileData?.first_name || "";
      let lastName = profileData?.last_name || "";
      let profileImageUrl = "/placeholder.svg";
      
      // Get the profile image from database
      
      // 1. Check profiles table for profile_photo_url (this is where onboarding stores it)
      try {
        console.log('Fetching profile photo from profiles table');
        const { data: profilePhotoData, error: profilePhotoError } = await adminClient
          .from("profiles")
          .select("profile_photo_url")
          .eq("id", userId)
          .single();
        
        if (!profilePhotoError && profilePhotoData?.profile_photo_url) {
          console.log('Found profile photo in profiles table:', profilePhotoData.profile_photo_url);
          profileImageUrl = profilePhotoData.profile_photo_url;
        }
      } catch (profilePhotoError) {
        console.error('Error fetching profile photo from profiles table:', profilePhotoError);
      }
      
      // 2. Try to get professional data with admin client for better RLS bypass (legacy fallback)
      if (profileImageUrl === "/placeholder.svg" && supabaseAdmin) {
        try {
          console.log('Fetching professional data with admin client');
          const { data: adminProfData, error: adminProfError } = await supabaseAdmin
            .from("professionals")
            .select("image")
            .eq("profile_id", userId)
            .maybeSingle();
          
          if (!adminProfError && adminProfData?.image) {
            console.log('Found image in professional record:', adminProfData.image);
            profileImageUrl = adminProfData.image;
          }
        } catch (adminError) {
          console.error('Error fetching professional data with admin client:', adminError);
        }
      }
      
      // 3. Fallback to regular client if admin approach didn't work (legacy fallback)
      if (profileImageUrl === "/placeholder.svg") {
        try {
          console.log('Fetching professional data with regular client');
          const { data: professionalData, error: professionalError } = await supabase
            .from("professionals")
            .select("image")
            .eq("profile_id", userId)
            .maybeSingle();
          
          if (!professionalError && professionalData?.image) {
            console.log('Found image in professional record (regular client):', professionalData.image);
            profileImageUrl = professionalData.image;
          }
        } catch (regularError) {
          console.error('Error fetching professional data with regular client:', regularError);
        }
      }
      
      console.log('Setting profile data with image URL:', profileImageUrl);
      setProfileData({
        firstName,
        lastName,
        profileImageUrl
      });
    } catch (error) {
      console.error('Error in fetchProfileData:', error);
      console.log('Using empty values for profile data');
      setProfileData({
        firstName: "",
        lastName: "",
        profileImageUrl: "/placeholder.svg"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg border shadow-sm sticky top-24">
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-3 mb-3">
                    {loading ? (
                      <Skeleton className="h-12 w-12 rounded-full" />
                    ) : (
                      <div className="h-12 w-12 rounded-full overflow-hidden border border-gray-200">
                        <img 
                          src={profileData.profileImageUrl} 
                          alt="Profile" 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    )}
                    <div>
                      {loading ? (
                        <>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-20" />
                        </>
                      ) : (
                        <>
                          <h3 className="font-medium text-gray-900">
                            {profileData.firstName} {profileData.lastName}
                          </h3>
                          <Link to="/dashboard/professional/profile" className="text-xs text-brand-bronze hover:underline">
                            View Profile
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <h2 className="font-bold text-lg text-gray-900">Dashboard</h2>
                </div>
                <div className="p-2">
                  <nav className="space-y-1">
                    <SidebarItem 
                      icon={<Calendar size={20} />} 
                      text="Calendar" 
                      to="/dashboard/professional/calendar" 
                      active={pathname.includes("/calendar")}
                    />
                    <SidebarItem 
                      icon={<Users size={20} />} 
                      text="Clients" 
                      to="/dashboard/professional/clients" 
                      active={pathname.includes("/clients")}
                    />
                    <SidebarItem 
                      icon={<Briefcase size={20} />} 
                      text="Services" 
                      to="/dashboard/professional/services" 
                      active={pathname.includes("/services")}
                    />
                    <SidebarItem 
                      icon={<CreditCard size={20} />} 
                      text="Payments" 
                      to="/dashboard/professional/payments" 
                      active={pathname.includes("/payments")}
                    />
                    <SidebarItem 
                      icon={<Image size={20} />} 
                      text="Portfolio" 
                      to="/dashboard/professional/portfolio" 
                      active={pathname.includes("/portfolio")}
                    />
                    <div className="pt-4 mt-4 border-t">
                      <SidebarItem 
                        icon={<User size={20} />} 
                        text="Profile" 
                        to="/dashboard/professional/profile" 
                        active={pathname.includes("/profile")}
                      />
                      <SidebarItem 
                        icon={<Clock size={20} />} 
                        text="Working Hours" 
                        to="/dashboard/professional/settings" 
                        active={pathname.includes("/settings")}
                      />
                      <SidebarItem 
                        icon={<Bell size={20} />} 
                        text="Notifications" 
                        to="/dashboard/professional/notifications" 
                        active={pathname.includes("/notifications")}
                      />
                      <SidebarItem 
                        icon={<Trash2 size={20} />} 
                        text="Delete Account" 
                        to="#delete-account" // Placeholder, will trigger modal
                        active={false} 
                        itemClassName="text-red-600 hover:bg-red-100 hover:text-red-700 focus-visible:text-red-700 w-full text-left"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent any default link behavior if 'to' was still present
                          setIsDeleteModalOpen(true);
                        }}
                      />
                    </div>
                  </nav>
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-grow">
              {children}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default ProfessionalDashboardLayout; 