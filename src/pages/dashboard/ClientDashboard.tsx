import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, api, supabase, type Booking } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";

// Mock data for development and preview
const MOCK_DATA = {
  userName: "Jessica Smith",
  totalSpent: 845.75,
  bookings: [
    {
      id: "b1",
      booking_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      service: { name: "Full Face Makeup Application" },
      professional: { profile: { first_name: "Michelle", last_name: "Johnson" } },
      location: "Client's Home, Brooklyn",
      status: "confirmed",
      total_amount: 125.00
    },
    {
      id: "b2",
      booking_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      service: { name: "Eyelash Extensions - Full Set" },
      professional: { profile: { first_name: "Sarah", last_name: "Williams" } },
      location: "Client's Office, Manhattan",
      status: "completed",
      total_amount: 220.50
    },
    {
      id: "b3",
      booking_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
      service: { name: "Hair Styling - Special Occasion" },
      professional: { profile: { first_name: "Alex", last_name: "Chen" } },
      location: "Client's Home, Manhattan",
      status: "completed",
      total_amount: 180.25
    },
    {
      id: "b4",
      booking_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      service: { name: "Manicure & Pedicure" },
      professional: { profile: { first_name: "Olivia", last_name: "Garcia" } },
      location: "Client's Home, Queens",
      status: "confirmed",
      total_amount: 95.00
    },
    {
      id: "b5",
      booking_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      service: { name: "Bridal Makeup Trial" },
      professional: { profile: { first_name: "Michelle", last_name: "Johnson" } },
      location: "Client's Home, Brooklyn",
      status: "completed",
      total_amount: 225.00
    }
  ]
};

const ClientDashboard = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [showBookingAlert, setShowBookingAlert] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'success' | 'cancelled' | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [userName, setUserName] = useState("");
  const [useMockData, setUseMockData] = useState(false);

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-amber-600';
      case 'cancelled':
        return 'text-red-600';
      case 'completed':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check if we're in demo mode (from URL parameter)
        const urlParams = new URLSearchParams(window.location.search);
        const demoMode = urlParams.get('demo') === 'true';
        
        if (demoMode) {
          console.log("Demo mode detected, using mock data");
          setUseMockData(true);
          setUserName(MOCK_DATA.userName);
          setBookings(MOCK_DATA.bookings);
          setTotalSpent(MOCK_DATA.totalSpent);
          setLoading(false);
          return;
        }
        
        // Get the current user
        const user = await auth.getUser();
        
        if (!user) {
          console.log("No user found, redirecting to login");
          window.location.href = '/login';
          return;
        }
        
        // Get user profile
        const profile = await api.getUserProfile(user.id);
        if (profile) {
          // Ensure we have a proper name to display
          if (profile.first_name && profile.last_name) {
            setUserName(`${profile.first_name} ${profile.last_name}`);
          } else if (profile.first_name) {
            setUserName(profile.first_name);
          } else if (user.email) {
            // If no name is available, use the email username part
            setUserName(user.email.split('@')[0]);
          } else {
            setUserName("Client"); // Fallback to something better than "new user"
          }
          
          // Get client bookings
          try {
            console.log('Fetching bookings for client ID:', user.id);
            
            // First, let's check if there are any bookings in the database at all
            const { data: allBookings, error: allBookingsError } = await supabase
              .from('bookings')
              .select('id, client_id, professional_id, service_id, booking_date, status')
              .limit(10);
            
            console.log('All bookings in database (first 10):', allBookings);
            if (allBookingsError) {
              console.error('Error fetching all bookings:', allBookingsError);
            }
            
            const clientBookings = await api.getClientBookings(user.id);
            console.log('Raw bookings data:', clientBookings);
            
            if (clientBookings && clientBookings.length > 0) {
              console.log('Found bookings:', clientBookings.length);
              setBookings(clientBookings);
              
              // Calculate total spent
              const total = clientBookings.reduce((sum, booking) => sum + booking.total_amount, 0);
              setTotalSpent(total);
              setUseMockData(false);
            } else {
              // No bookings found, use empty array
              console.log("No bookings found for user:", user.id);
              setBookings([]);
              setTotalSpent(0);
              setUseMockData(false);
            }
          } catch (bookingError) {
            console.error("Error fetching client bookings:", bookingError);
            // Show empty state instead of mock data
            setBookings([]);
            setTotalSpent(0);
            setUseMockData(false);
          }
        } else {
          // No profile found, show empty state
          console.log("No profile found for user");
          setBookings([]);
          setTotalSpent(0);
          setUseMockData(false);
        }
      } catch (error) {
        console.error("Error setting up dashboard:", error);
        // Show empty state instead of mock data
        setBookings([]);
        setTotalSpent(0);
        setUseMockData(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Check for booking success/cancel parameters
    const bookingSuccess = searchParams.get('booking_success');
    const bookingCancelled = searchParams.get('booking_cancelled');
    const bookingId = searchParams.get('booking_id');
    const sessionId = searchParams.get('session_id');

    if (bookingSuccess === 'true' && bookingId) {
      setShowBookingAlert(true);
      setBookingStatus('success');
      // Show success toast
      toast({
        title: "Booking Successful!",
        description: "Your booking has been confirmed and payment processed.",
      });
    } else if (bookingCancelled === 'true' && bookingId) {
      setShowBookingAlert(true);
      setBookingStatus('cancelled');
      // Show cancelled toast
      toast({
        variant: "destructive",
        title: "Booking Cancelled",
        description: "Your booking has been cancelled and no payment was processed.",
      });
    }

    // Clear the URL parameters after showing the message
    if (bookingSuccess || bookingCancelled) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('booking_success');
      newSearchParams.delete('booking_cancelled');
      newSearchParams.delete('booking_id');
      newSearchParams.delete('session_id');
      window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
    }
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-8 w-8 text-brand-bronze" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Welcome, {userName}</h1>
                  <p className="text-gray-600 mt-1">Here's what's happening with your appointments</p>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button asChild>
                    <Link to="/professionals">Book New Service</Link>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white text-black border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-black">Total Spent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-black">${totalSpent.toFixed(2)}</div>
                    <p className="text-sm text-gray-700 mt-1">Across all your bookings</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-white text-black border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-black">Upcoming Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-black">
                      {bookings.filter(booking => 
                        new Date(booking.booking_date) > new Date() && 
                        booking.status.toLowerCase() !== 'cancelled'
                      ).length}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">Scheduled services</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-white text-black border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-black">Your Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead className="hidden sm:table-cell">Professional</TableHead>
                            <TableHead className="hidden lg:table-cell">Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookings.map(booking => (
                            <TableRow key={booking.id}>
                              <TableCell>
                                {format(new Date(booking.booking_date), "MMM d, yyyy")}
                                <div className="text-xs text-gray-500">
                                  {format(new Date(booking.booking_date), "h:mm a")}
                                </div>
                              </TableCell>
                              <TableCell>
                                {booking.service.name}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {booking.professional.profile.first_name} {booking.professional.profile.last_name}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {booking.location}
                              </TableCell>
                              <TableCell>
                                <span className={`font-medium ${getStatusColor(booking.status)}`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${parseFloat(booking.total_amount.toString()).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500 mb-4">You don't have any bookings yet.</p>
                      <Button asChild>
                        <Link to="/services">Book Your First Service</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Mobile Booking Details Section */}
              <div className="sm:hidden space-y-4">
                <h3 className="font-medium text-lg">Booking Details</h3>
                {bookings.map(booking => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardHeader className="py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{booking.service.name}</CardTitle>
                          <p className="text-sm text-gray-500">
                            with {booking.professional.profile.first_name} {booking.professional.profile.last_name}
                          </p>
                        </div>
                        <span className={`text-sm font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3 border-t border-gray-100">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Date & Time</span>
                          <span className="text-sm">
                            {format(new Date(booking.booking_date), "MMM d, yyyy")} at {format(new Date(booking.booking_date), "h:mm a")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Location</span>
                          <span className="text-sm">{booking.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Amount</span>
                          <span className="text-sm font-medium">${parseFloat(booking.total_amount.toString()).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientDashboard;
