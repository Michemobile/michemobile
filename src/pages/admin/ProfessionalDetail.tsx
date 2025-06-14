import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { emailService } from "@/lib/email";

// Define types for professional data
interface Professional {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  specialty: string;
  years_experience: number;
  service_area: string;
  service_radius: number;
  travel_fee: number;
  certifications: any[];
  insurance: any;
  image: string;
  is_approved: boolean;
  is_onboarding_complete: boolean;
  created_at: string;
}

interface Service {
  id: string;
  professional_id: string;
  name: string;
  price: number;
  description: string;
  is_custom: boolean;
}

interface WorkPhoto {
  id: string;
  professional_id: string;
  url: string;
  caption: string;
  order_index: number;
}

const ProfessionalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [workPhotos, setWorkPhotos] = useState<WorkPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is admin
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }
      
      // For this example, we'll use a simple check - in a real app you'd have a proper admin role system
      if (user.email !== "contact@michemobile.online") {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin dashboard.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      
      // If we get here, the user is authorized
      if (id) {
        fetchProfessionalDetails(id);
      }
    };
    
    checkAdminAccess();
  }, [id, navigate]);
  
  const fetchProfessionalDetails = async (professionalId: string) => {
    try {
      setLoading(true);
      
      // Get professional details
      const { data: professionalData, error: professionalError } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', professionalId)
        .single();
      
      if (professionalError) throw professionalError;
      
      setProfessional(professionalData);
      
      // Get services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', professionalId);
      
      if (servicesError) throw servicesError;
      
      setServices(servicesData || []);
      
      // Get work photos
      const { data: photosData, error: photosError } = await supabase
        .from('work_photos')
        .select('*')
        .eq('professional_id', professionalId)
        .order('order_index', { ascending: true });
      
      if (photosError) throw photosError;
      
      setWorkPhotos(photosData || []);
      
    } catch (error) {
      console.error('Error fetching professional details:', error);
      toast({
        title: "Error",
        description: "Failed to load professional details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async () => {
    if (!professional) return;
    
    try {
      setApproving(true);
      
      // Update the professional's approval status
      const { error } = await supabase
        .from('professionals')
        .update({ is_approved: true })
        .eq('id', professional.id);
      
      if (error) throw error;
      
      // Send approval email to the professional
      await emailService.sendProfessionalApprovalNotification(professional.id, professional.email);
      
      // Update local state
      setProfessional({
        ...professional,
        is_approved: true
      });
      
      toast({
        title: "Professional Approved",
        description: "The professional has been approved and notified via email.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error approving professional:', error);
      toast({
        title: "Error",
        description: "Failed to approve professional. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-bronze" />
      </div>
    );
  }
  
  if (!professional) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800">Professional Not Found</h2>
          <p className="mt-2 text-gray-600">The professional you're looking for doesn't exist or has been removed.</p>
          <Button 
            className="mt-6"
            onClick={() => navigate('/admin')}
          >
            Back to Admin Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Professional Details</h1>
        <div className="flex space-x-4">
          <Button 
            variant="outline"
            onClick={() => navigate('/admin')}
          >
            Back to Dashboard
          </Button>
          
          {!professional.is_approved && (
            <Button 
              className="bg-brand-bronze hover:bg-brand-bronze/80 text-white"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Approving...
                </>
              ) : (
                "Approve Professional"
              )}
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/4 mb-4 md:mb-0">
              <img 
                src={professional.image || '/placeholder.svg'} 
                alt={`${professional.first_name} ${professional.last_name}`}
                className="w-32 h-32 rounded-full object-cover mx-auto"
              />
            </div>
            <div className="md:w-3/4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{professional.first_name} {professional.last_name}</h2>
                  <p className="text-gray-600">{professional.specialty || "Beauty Professional"}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  professional.is_approved
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {professional.is_approved ? "Approved" : "Pending Approval"}
                </span>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{professional.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p>{professional.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Experience</p>
                  <p>{professional.years_experience || "Not specified"} years</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service Area</p>
                  <p>{professional.service_area || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service Radius</p>
                  <p>{professional.service_radius || 0} miles</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Travel Fee</p>
                  <p>${professional.travel_fee?.toFixed(2) || "0.00"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Application Date</p>
                  <p>{new Date(professional.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-2">Bio</h3>
          <p className="text-gray-700 whitespace-pre-line">{professional.bio || "No bio provided."}</p>
        </div>
        
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Services</h3>
          {services.length === 0 ? (
            <p className="text-gray-500">No services listed.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <div key={service.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{service.name}</h4>
                    <span className="font-semibold">${service.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{service.description || "No description provided."}</p>
                  {service.is_custom && (
                    <span className="text-xs bg-brand-bronze/10 text-brand-bronze px-2 py-1 rounded mt-2 inline-block">
                      Custom Service
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Certifications</h3>
          {!professional.certifications || professional.certifications.length === 0 ? (
            <p className="text-gray-500">No certifications uploaded.</p>
          ) : (
            <div className="space-y-3">
              {professional.certifications.map((cert, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-bronze" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span>{cert.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Portfolio</h3>
          {workPhotos.length === 0 ? (
            <p className="text-gray-500">No portfolio photos uploaded.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {workPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img 
                    src={photo.url} 
                    alt={photo.caption || "Portfolio image"} 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm rounded-b-lg">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDetail;
