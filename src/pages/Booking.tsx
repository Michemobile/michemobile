import React, { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, api, supabase } from "@/lib/supabase";
import BookingConfirmation from "@/components/BookingConfirmation";
import type { Professional } from "@/data/professionals";
import { useToast } from "@/components/ui/use-toast";

// Define blocked time slot interface
interface BlockedTimeSlot {
  id: string;
  professional_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

const timeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"
];

const Booking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [selectedService, setSelectedService] = useState<string | undefined>(undefined);
  const [selectedPro, setSelectedPro] = useState<string | undefined>(undefined);
  const [preSelectedProName, setPreSelectedProName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [servicePrice, setServicePrice] = useState<number | undefined>(undefined);
  const [serviceName, setServiceName] = useState<string | undefined>(undefined);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<BlockedTimeSlot[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(timeSlots);

  useEffect(() => {
    // Get professional ID from URL parameters
    const proId = searchParams.get('pro');
    const proName = searchParams.get('name');
    
    if (proId) {
      setSelectedPro(proId);
      setPreSelectedProName(proName ? decodeURIComponent(proName) : undefined);
    }
    
    // Fetch professionals from the database
    const fetchProfessionals = async () => {
      try {
        setLoadingProfessionals(true);
        // Fix the query to use the correct relationship (profile_id is in professionals table)
        const { data, error } = await supabase
          .from('professionals')
          .select(`
            id,
            profile_id,
            image
          `);
          
        // If successful, get the profiles in a separate query
        let profilesData = [];
        if (!error && data && data.length > 0) {
          const profileIds = data.map(pro => pro.profile_id);
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', profileIds);
            
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          } else {
            profilesData = profiles || [];
          }
        }
          
        if (error) {
          console.error('Error fetching professionals:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // Transform the data to match the Professional interface
          const formattedPros: Professional[] = data.map((pro: any) => {
            // Find the matching profile for this professional
            const profile = profilesData.find((p: any) => p.id === pro.profile_id);
            
            return {
              id: pro.id,
              name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Professional',
              services: [],
              rating: 0,
              image: pro.image || '/placeholder.svg',
              bio: '',
              location: '',
              availability: [],
              verified: false
            };
          });
          
          setProfessionals(formattedPros);
        }
      } catch (err) {
        console.error('Error fetching professionals:', err);
      } finally {
        setLoadingProfessionals(false);
      }
    };
    
    fetchProfessionals();
  }, [searchParams]);
  
  // Fetch services when a professional is selected
  useEffect(() => {
    if (selectedPro) {
      fetchProfessionalServices(selectedPro);
    } else {
      // Clear services if no professional is selected
      setServices([]);
    }
  }, [selectedPro]);

  // Fetch services for a specific professional
  const fetchProfessionalServices = async (professionalId: string) => {
    try {
      setLoadingServices(true);
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          price,
          description,
          professional_id
        `)
        .eq('professional_id', professionalId);

      if (servicesError) {
        console.error('Error fetching professional services:', servicesError);
        return;
      }

      if (servicesData && servicesData.length > 0) {
        console.log('Professional services:', servicesData);
        setServices(servicesData);
      } else {
        console.log('No services found for this professional');
        setServices([]);
      }
    } catch (err) {
      console.error('Error fetching professional services:', err);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Set service price and name when service is selected
  useEffect(() => {
    if (selectedService && services.length > 0) {
      // Find the selected service in our services array
      const service = services.find(s => s.id === selectedService);
      if (service) {
        setServicePrice(service.price);
        setServiceName(service.name);
      }
    }
  }, [selectedService, services]);
  
  // Fetch blocked time slots when date or professional changes
  useEffect(() => {
    if (!selectedDate || !selectedPro) {
      setAvailableTimeSlots(timeSlots);
      return;
    }

    const fetchBlockedTimeSlots = async () => {
      try {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        
        const { data, error } = await supabase
          .from("blocked_time_slots")
          .select("*")
          .eq("professional_id", selectedPro)
          .gte("start_time", `${formattedDate}T00:00:00`)
          .lt("start_time", `${formattedDate}T23:59:59`);

        if (error) {
          console.error("Error fetching blocked time slots:", error);
          return;
        }

        setBlockedTimeSlots(data || []);
        
        // Filter available time slots
        const available = timeSlots.filter(timeSlot => {
          const slotDateTime = parse(
            `${formattedDate} ${timeSlot}`, 
            "yyyy-MM-dd h:mm aa", 
            new Date()
          );
          
          // Check if this time slot falls within any blocked period
          return !data?.some(blockedSlot => {
            const startTime = new Date(blockedSlot.start_time);
            const endTime = new Date(blockedSlot.end_time);
            return slotDateTime >= startTime && slotDateTime <= endTime;
          });
        });
        
        setAvailableTimeSlots(available);
      } catch (error) {
        console.error("Error in fetchBlockedTimeSlots:", error);
      }
    };

    fetchBlockedTimeSlots();
  }, [selectedDate, selectedPro]);
  
  // Generate a proper UUID v4 for testing purposes
  const generateUUID = () => {
    // Implementation of RFC4122 version 4 compliant UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // For demo/testing purposes - create valid UUIDs for service and professional
  const getMockServiceId = () => generateUUID();
  const getMockProfessionalId = () => generateUUID();

  // Function to create Stripe checkout session
  const createCheckoutSession = async (bookingDetails: {
    serviceId: string;
    professionalId: string;
    clientId: string;
    bookingDate: string;
    location: string;
  }) => {
    try {
      // Validate input data
      if (!bookingDetails.serviceId) throw new Error('Service ID is required');
      if (!bookingDetails.professionalId) throw new Error('Professional ID is required');
      if (!bookingDetails.clientId) throw new Error('Client ID is required');
      if (!bookingDetails.bookingDate) throw new Error('Booking date is required');
      if (!bookingDetails.location) throw new Error('Location is required');

      console.log('Creating checkout session with details:', {
        serviceId: bookingDetails.serviceId,
        professionalId: bookingDetails.professionalId,
        clientId: bookingDetails.clientId,
        bookingDate: bookingDetails.bookingDate,
        location: bookingDetails.location
      });

      // First, verify the service exists and has a Stripe price ID
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*, professionals:professional_id(stripe_account_id)')
        .eq('id', bookingDetails.serviceId)
        .single();

      if (serviceError) {
        console.error('Service fetch error:', serviceError);
        throw new Error(`Service error: ${serviceError.message}`);
      }

      if (!service) {
        throw new Error('Service not found');
      }

      console.log('Service details:', {
        id: service.id,
        hasStripePrice: !!service.stripe_price_id,
        professional: service.professionals ? {
          id: service.professionals.id,
          hasStripeAccount: !!service.professionals.stripe_account_id
        } : null
      });

      if (!service.stripe_price_id) {
        throw new Error('Service does not have a Stripe price configured');
      }

      if (!service.professionals?.stripe_account_id) {
        throw new Error('Professional does not have a connected Stripe account');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;
      console.log('Calling function URL:', functionUrl);

      // Log the complete request details
      console.log('Creating checkout session with:', {
        url: functionUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token?.slice(0, 10)}...`, // Only log first 10 chars of token
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10)}...`,
        },
        body: bookingDetails
      });

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(bookingDetails),
        mode: 'cors'
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to create checkout session';
        try {
          const errorData = JSON.parse(responseText);
          console.log('Detailed error response:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          
          if (errorData.details) {
            console.error('Error details:', errorData.details);
            if (errorData.details.type === 'stripe') {
              errorMessage = `Stripe error: ${errorMessage}`;
            } else if (errorData.details.type === 'database') {
              errorMessage = `Database error: ${errorMessage}`;
            }
          }

          // Log the request data that caused the error
          if (errorData.requestData) {
            console.log('Request data that caused error:', errorData.requestData);
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = `${errorMessage}: ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
        throw new Error('Invalid response format from server');
      }

      console.log('Parsed response data:', responseData);

      if (!responseData.checkoutUrl) {
        throw new Error('No checkout URL received in response');
      }

      // Redirect to Stripe Checkout
      window.location.href = responseData.checkoutUrl;
    } catch (error: any) {
      console.error('Checkout error:', {
        message: error.message,
        stack: error.stack,
        details: error
      });
      throw error; // Re-throw to be handled by the calling function
    }
  };

  // Modified handleBooking function
  const handleBooking = async () => {
    setIsLoading(true);
    try {
      // Validate all required fields
      if (!selectedService) throw new Error('Please select a service');
      if (!selectedPro) throw new Error('Please select a professional');
      if (!selectedDate) throw new Error('Please select a date');
      if (!selectedTime) throw new Error('Please select a time');

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Log the selected values for debugging
      console.log('Selected booking values:', {
        service: selectedService,
        professional: selectedPro,
        date: selectedDate,
        time: selectedTime,
        userId: user.id
      });

      // Create booking date string in ISO format
      const selectedDateTime = parse(selectedTime, 'h:mm a', selectedDate);
      const bookingDate = format(selectedDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX");

      // Prepare booking details
      const bookingDetails = {
        serviceId: selectedService,
        professionalId: selectedPro,
        clientId: user.id,
        bookingDate,
        location: 'client_location'
      };

      // Log the complete booking details
      console.log('Prepared booking details:', {
        ...bookingDetails,
        rawDate: selectedDate,
        rawTime: selectedTime,
        parsedDateTime: selectedDateTime,
        formattedBookingDate: bookingDate
      });

      // Verify the data is properly formatted
      if (!bookingDetails.serviceId || bookingDetails.serviceId === 'undefined') {
        throw new Error('Invalid service ID');
      }
      if (!bookingDetails.professionalId || bookingDetails.professionalId === 'undefined') {
        throw new Error('Invalid professional ID');
      }
      if (!bookingDetails.clientId || bookingDetails.clientId === 'undefined') {
        throw new Error('Invalid client ID');
      }
      if (!bookingDetails.bookingDate || bookingDetails.bookingDate === 'Invalid Date') {
        throw new Error('Invalid booking date');
      }

      console.log('Starting checkout process with:', {
        serviceId: selectedService,
        professionalId: selectedPro,
        clientId: user.id,
        bookingDate,
        location: 'client_location'
      });

      // Validate service and professional before creating checkout session
      const { data: service } = await supabase
        .from('services')
        .select('*, professionals:professional_id(stripe_account_id)')
        .eq('id', selectedService)
        .single();

      if (!service) {
        throw new Error('Service not found');
      }

      if (!service.stripe_price_id) {
        throw new Error('Service does not have a Stripe price configured');
      }

      if (!service.professionals?.stripe_account_id) {
        throw new Error('Professional does not have a connected Stripe account');
      }

      console.log('Validated service and professional:', {
        serviceId: service.id,
        hasStripePrice: !!service.stripe_price_id,
        professionalId: service.professional_id,
        hasStripeAccount: !!service.professionals.stripe_account_id
      });

      // Create checkout session with booking details
      await createCheckoutSession({
        serviceId: selectedService,
        professionalId: selectedPro,
        clientId: user.id,
        bookingDate,
        location: 'client_location'
      });

    } catch (error: any) {
      console.error('Booking error:', {
        message: error.message,
        stack: error.stack,
        details: error
      });
      // Try to extract the most useful error message
      let errorMessage = error.message || "Failed to create booking";
      try {
        if (error.details?.message) {
          errorMessage = error.details.message;
        } else if (typeof error.details === 'string') {
          errorMessage = error.details;
        }
      } catch (e) {
        console.error('Error parsing error details:', e);
      }

      toast({
        variant: "destructive",
        title: "Booking Error",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-6">Book Your Appointment</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Schedule your mobile beauty service with just a few clicks.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-6 shadow-md">
              <div className="space-y-6">
                <div>
                  <label className="block text-foreground font-medium mb-2">Select Professional</label>
                  <Select value={selectedPro} onValueChange={setSelectedPro}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingProfessionals ? "Loading professionals..." : preSelectedProName || "Choose a professional"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingProfessionals ? (
                        <SelectItem value="loading" disabled>Loading professionals...</SelectItem>
                      ) : professionals.length > 0 ? (
                        professionals.map(pro => (
                          <SelectItem key={pro.id} value={pro.id}>
                            {pro.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No professionals available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {preSelectedProName && (
                    <p className="text-sm text-brand-bronze mt-1">
                      You selected {preSelectedProName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-foreground font-medium mb-2">Select Service</label>
                  <Select onValueChange={setSelectedService} disabled={!selectedPro || loadingServices}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={!selectedPro ? "Select a professional first" : loadingServices ? "Loading services..." : "Choose a service"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingServices ? (
                        <SelectItem value="loading" disabled>Loading services...</SelectItem>
                      ) : services.length > 0 ? (
                        services.map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - ${service.price.toFixed(2)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No services available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedService && servicePrice && (
                    <p className="text-sm text-brand-bronze mt-1">
                      Service price: ${servicePrice.toFixed(2)}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-foreground font-medium mb-2">Select Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        disabled={(date) => {
                          // Disable past dates and dates more than 3 months in the future
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const maxDate = new Date();
                          maxDate.setMonth(maxDate.getMonth() + 3);
                          return date < today || date > maxDate;
                        }}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <label className="block text-foreground font-medium mb-2">Select Time</label>
                  <Select 
                    onValueChange={setSelectedTime} 
                    disabled={!selectedDate || availableTimeSlots.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue 
                        placeholder={
                          !selectedDate 
                            ? "Select a date first" 
                            : availableTimeSlots.length === 0 
                              ? "No available times" 
                              : "Choose a time"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{time}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {timeSlots
                        .filter(time => !availableTimeSlots.includes(time))
                        .map((time) => (
                          <SelectItem key={time} value={time} disabled>
                            <div className="flex items-center text-gray-400">
                              <Lock className="h-4 w-4 mr-2" />
                              <span>{time} (Unavailable)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleBooking}
                  className="w-full bg-brand-bronze hover:bg-brand-bronze/80 text-white mt-4"
                  disabled={!selectedDate || !selectedTime || !selectedService || !selectedPro || isLoading}
                >
                  {isLoading ? "Processing..." : "Book Appointment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Booking Confirmation Dialog */}
      {showConfirmation && bookingData && (
        <BookingConfirmation
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          bookingData={bookingData}
        />
      )}
    </div>
  );
};

export default Booking;
