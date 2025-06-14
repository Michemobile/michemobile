import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Star, Clock, CheckCircle2, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";

// Define types
interface Professional {
  id: string;
  name: string;
  image: string;
  bio: string;
  location: string;
  verified: boolean;
  rating: number;
  services: Service[];
  workPhotos: WorkPhoto[];
  yearsExperience: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface WorkPhoto {
  id: string;
  url: string;
  caption: string;
}

const ProfessionalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("about");

  useEffect(() => {
    const fetchProfessionalDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch professional data
        const { data: professionalData, error: professionalError } = await supabase
          .from('professionals')
          .select(`
            id,
            profile_id,
            bio,
            service_area,
            service_radius,
            travel_fee,
            years_experience,
            verified,
            image,
            profiles:profile_id(id, first_name, last_name, email, phone, username)
          `)
          .eq('id', id)
          .single();
        
        if (professionalError) {
          throw professionalError;
        }
        
        if (!professionalData) {
          throw new Error('Professional not found');
        }
        
        // Fetch services for this professional
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('professional_id', id);
        
        if (servicesError) {
          throw servicesError;
        }
        
        // Fetch work photos for this professional
        const { data: workPhotosData, error: workPhotosError } = await supabase
          .from('work_photos')
          .select('*')
          .eq('professional_id', id);
        
        // If the work_photos table doesn't exist yet, we'll just use an empty array
        let workPhotos = [];
        if (!workPhotosError) {
          workPhotos = workPhotosData || [];
        } else {
          console.log('Work photos table may not exist yet:', workPhotosError);
        }
        
        // Format the professional data
        const profile = professionalData.profiles || {};
        // Type assertion to handle potential undefined properties
        const profileData = profile as { first_name?: string; last_name?: string };
        const fullName = profileData.first_name && profileData.last_name
          ? `${profileData.first_name} ${profileData.last_name}`
          : 'Professional';
        
        // Try to get the image from the professional record if it exists
        let imageUrl = '/placeholder.svg';
        if ('image' in professionalData && professionalData.image) {
          // If the image is a full URL, use it directly
          if (professionalData.image.startsWith('http')) {
            imageUrl = professionalData.image;
          } else {
            // If it's a storage path, construct the full URL
            const { data } = supabase.storage
              .from('profiles')
              .getPublicUrl(professionalData.image);
            
            if (data && data.publicUrl) {
              imageUrl = data.publicUrl;
            }
          }
        }
        
        // Format services data
        const services = servicesData.map(service => ({
          id: service.id,
          name: service.name,
          price: service.price,
          description: service.description || ''
        }));
        
        // Format work photos data
        const formattedWorkPhotos = workPhotos.map(photo => ({
          id: photo.id,
          url: photo.url,
          caption: photo.caption || ''
        }));
        
        // If we don't have any work photos yet, create some placeholder ones
        const finalWorkPhotos = formattedWorkPhotos.length > 0 ? formattedWorkPhotos : [
          { id: '1', url: imageUrl, caption: 'Professional Profile' }
        ];
        
        // Create the professional object
        const professionalObj: Professional = {
          id: professionalData.id,
          name: fullName,
          image: imageUrl,
          bio: professionalData.bio || 'No bio available',
          location: professionalData.service_area || 'Location not specified',
          verified: professionalData.verified || false,
          rating: 4.5, // Default rating or fetch from reviews
          services: services,
          workPhotos: finalWorkPhotos,
          yearsExperience: professionalData.years_experience || '1'
        };
        
        setProfessional(professionalObj);
      } catch (error) {
        console.error('Error fetching professional details:', error);
        setError('Failed to load professional details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchProfessionalDetails();
    }
  }, [id]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-8 pb-16 flex items-center justify-center">
          <Spinner className="h-12 w-12 text-brand-bronze" />
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !professional) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-8 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Professional Not Found</h1>
            <p className="text-gray-600 mb-8">{error || "We couldn't find the professional you're looking for."}</p>
            <Link to="/professionals">
              <Button className="bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                Back to Professionals
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-8 pb-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-brand-bronze/10 to-brand-silver/10 rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <div className="relative rounded-lg overflow-hidden border border-brand-silver/20 shadow-md">
                <img 
                  src={professional.image} 
                  alt={professional.name} 
                  className="w-full h-80 object-cover"
                />
                {professional.verified && (
                  <Badge className="absolute top-4 right-4 bg-brand-bronze text-white">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Verified
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="md:w-2/3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{professional.name}</h1>
                {professional.verified && (
                  <Badge className="bg-brand-bronze text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center mb-4">
                <div className="flex mr-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < professional.rating ? "fill-brand-bronze text-brand-bronze" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">({professional.rating})</span>
              </div>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-1 text-brand-bronze" />
                  <span>{professional.location}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-1 text-brand-bronze" />
                  <span>{professional.yearsExperience} {parseInt(professional.yearsExperience) === 1 ? 'year' : 'years'} of experience</span>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6 line-clamp-3">{professional.bio}</p>
              
              <Link to={`/booking?pro=${professional.id}&name=${encodeURIComponent(professional.name)}`}>
                <Button className="bg-brand-bronze hover:bg-brand-bronze/80 text-white px-8 py-2">
                  <Calendar className="h-5 w-5 mr-2" /> Book Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Tabs Section */}
        <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="about" className="text-lg">About</TabsTrigger>
            <TabsTrigger value="services" className="text-lg">Services</TabsTrigger>
            <TabsTrigger value="portfolio" className="text-lg">Portfolio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="about" className="p-4 bg-white rounded-lg border border-brand-silver/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About {professional.name}</h2>
            <div className="prose max-w-none text-gray-700">
              <p className="mb-4">{professional.bio}</p>
              
              <div className="bg-brand-bronze/5 p-6 rounded-lg border border-brand-bronze/10 mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-brand-bronze" /> 
                  Experience & Expertise
                </h3>
                <p className="mb-2">
                  <strong>Years of Experience:</strong> {professional.yearsExperience}
                </p>
                <p className="mb-2">
                  <strong>Service Area:</strong> {professional.location}
                </p>
                <div className="mt-4">
                  <strong className="block mb-2">Specializes in:</strong>
                  <div className="flex flex-wrap gap-2">
                    {professional.services.slice(0, 5).map(service => (
                      <Badge key={service.id} className="bg-brand-bronze/10 text-gray-800 border-brand-bronze">
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="services" className="p-4 bg-white rounded-lg border border-brand-silver/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Services Offered</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {professional.services.map(service => (
                <div 
                  key={service.id} 
                  className="p-6 rounded-lg border border-brand-silver/20 hover:border-brand-bronze/30 transition-all"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-brand-bronze font-medium text-lg mb-3">${service.price.toFixed(2)}</p>
                  <p className="text-gray-600 mb-4">{service.description || "No description available"}</p>
                  <Link to={`/booking?pro=${professional.id}&service=${service.id}&name=${encodeURIComponent(professional.name)}`}>
                    <Button className="w-full bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                      Book This Service
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
            
            {professional.services.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No services listed yet.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="portfolio" className="p-4 bg-white rounded-lg border border-brand-silver/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio & Work</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {professional.workPhotos.map(photo => (
                <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-brand-silver/20">
                  <img 
                    src={photo.url} 
                    alt={photo.caption} 
                    className="w-full h-64 object-cover transition-transform group-hover:scale-105"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                      <p className="text-sm">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {professional.workPhotos.length <= 1 && (
              <div className="text-center py-8 mt-4">
                <p className="text-gray-600">More portfolio items coming soon!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Call to Action */}
        <div className="bg-gradient-to-r from-brand-bronze to-brand-silver rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to Book with {professional.name}?</h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Book your appointment now and experience professional service tailored to your needs.
          </p>
          <Link to={`/booking?pro=${professional.id}&name=${encodeURIComponent(professional.name)}`}>
            <Button className="bg-white text-brand-bronze hover:bg-gray-100 px-8 py-2">
              <Calendar className="h-5 w-5 mr-2" /> Book Appointment
            </Button>
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProfessionalDetail;
