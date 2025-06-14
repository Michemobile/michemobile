import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { auth, api, supabase, supabaseAdmin } from "@/lib/supabase";
import ProfessionalDashboardLayout from "@/components/ProfessionalDashboardLayout";
import CalendarView from "@/components/CalendarView";
import ClientsView from "@/components/ClientsView";
import ServicesView from "@/components/ServicesView";
import PaymentsView from "@/components/PaymentsView";
import ProfileView from "@/components/ProfileView";
import PortfolioView from "@/components/PortfolioView";
import WorkingHoursView from "@/components/WorkingHoursView";
import NotificationSettings from "./professional/NotificationSettings";
import PaymentsDashboard from "./professional/PaymentsDashboard";

// Define types for better type safety
type Booking = {
  id: string;
  booking_date: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
  };
  service: {
    name: string;
  };
  location: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  total_amount: number;
  notes?: string;
};

// Define Appointment type for calendar
type Appointment = {
  id: string;
  date: Date;
  duration: number;
  client: {
    id: string;
    name: string;
  };
  service: {
    name: string;
  };
  location: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
};

// Empty initial data for when no real data is available
const INITIAL_DATA = {
  bookings: [] as Booking[],
  totalRevenue: 0,
  totalClients: 0,
  professionalName: ""
};

// Format appointments for the calendar view
const formatAppointmentsForCalendar = (bookings: Booking[]): Appointment[] => {
  return bookings.map(booking => ({
    id: booking.id,
    date: new Date(booking.booking_date),
    duration: 60, // Assuming 60 minutes default duration
    client: {
      id: booking.client.id,
      name: `${booking.client.first_name} ${booking.client.last_name}`
    },
    service: {
      name: booking.service.name
    },
    location: booking.location,
    status: booking.status
  }));
};

const ProfessionalDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [professionalName, setProfessionalName] = useState("");
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    
    // Check for Stripe return parameter
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('stripe_return') === 'success') {
      toast({
        title: "Stripe Connected Successfully!",
        description: "Your payment account has been set up. You can now start accepting payments from clients.",
        variant: "default",
        duration: 5000,
      });
      
      // Clean up the URL parameter
      navigate('/dashboard/professional', { replace: true });
    }
  }, [location.search]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Get current user
      const user = await auth.getUser();
      
      if (!user) {
        console.log("No authenticated user found");
        setLoading(false);
        navigate('/login');
        return;
      }
      
      // Get user profile
      const profile = await api.getUserProfile(user.id);
      if (profile) {
        setProfessionalName(`${profile.first_name} ${profile.last_name}`);
        
        // Get professional ID from profile
        const { data: professionalData, error: professionalError } = await supabase
          .from('professionals')
          .select('id')
          .eq('profile_id', user.id)
          .single();
        
        if (professionalError) {
          console.error("Error fetching professional ID:", professionalError);
          return;
        }
        
        if (professionalData) {
          const professionalId = professionalData.id;
          setProfessionalId(professionalId);

          // Get professional bookings with more detailed information
          try {
            const { data: bookingsData, error: bookingsError } = await supabase
              .from('bookings')
              .select(`
                id,
                booking_date,
                status,
                location,
                total_amount,
                notes,
                client:client_id (
                  id,
                  first_name,
                  last_name
                ),
                service:service_id (
                  id,
                  name,
                  price
                )
              `)
              .eq('professional_id', professionalId)
              .order('booking_date', { ascending: false });
            
            if (bookingsError) {
              console.error("Error fetching bookings:", bookingsError);
            } else if (bookingsData && bookingsData.length > 0) {
              // Transform the data to match our Booking type
              const formattedBookings = bookingsData.map(booking => ({
                id: booking.id,
                booking_date: booking.booking_date,
                client: {
                  id: booking.client?.id || 'unknown',
                  first_name: booking.client?.first_name || 'Unknown',
                  last_name: booking.client?.last_name || 'Client'
                },
                service: {
                  name: booking.service?.name || 'Unknown Service'
                },
                location: booking.location,
                status: booking.status,
                total_amount: booking.total_amount,
                notes: booking.notes
              }));
              
              setBookings(formattedBookings);
              
              // Calculate total revenue
              const total = formattedBookings
                .filter(booking => booking.status === "completed")
                .reduce((sum, booking) => sum + booking.total_amount, 0);
              setTotalRevenue(total);
              
              // Count unique clients
              const uniqueClientIds = new Set(
                formattedBookings.map(booking => booking.client.id)
              );
              setTotalClients(uniqueClientIds.size);
            } else {
              console.log("No bookings found for professional");
              setBookings([]);
              setTotalRevenue(0);
              setTotalClients(0);
            }
          } catch (error) {
            console.error("Error processing bookings:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchDashboardData:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to get professional ID from profile ID
  const getProfessionalId = async (profileId: string): Promise<string | null> => {
    try {
      // Use admin client if available for more reliable access
      const adminClient = supabaseAdmin || supabase;
      
      const { data: professionalRecord, error } = await adminClient
        .from('professionals')
        .select('id') // Select only the id column
        .eq('profile_id', profileId) // Filter by profile_id
        .single(); // Expect a single record or null
      
      if (error) {
        console.error("Error in getProfessionalId:", error);
        return null;
      }
      
      if (!professionalRecord) {
        console.log("No professional record found for profile ID:", profileId);
        return null;
      }
      
      return professionalRecord.id;
    } catch (error) {
      console.error("Error in getProfessionalId catch block:", error);
      return null;
    }
  };

  // Define props for DashboardOverview
  interface DashboardOverviewProps {
    totalRevenue: number;
    totalClients: number;
    bookings: Booking[];
    navigate: ReturnType<typeof useNavigate>;
    loading: boolean;
  }

  // Create a dashboard overview component when the URL is just /dashboard/professional
  const DashboardOverview = ({ totalRevenue, totalClients, bookings, navigate, loading }: DashboardOverviewProps) => {
    if (loading) {
      return <Spinner />;
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-brand-bronze">${totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">From completed bookings</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Total Clients</h3>
            <p className="text-3xl font-bold text-brand-bronze">{totalClients}</p>
            <p className="text-sm text-gray-500 mt-1">Unique clients served</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Upcoming Bookings</h3>
            <p className="text-3xl font-bold text-brand-bronze">{bookings.filter(b => b.status === "confirmed").length}</p>
            <p className="text-sm text-gray-500 mt-1">Confirmed appointments</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Recent Bookings</h3>
          {bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.slice(0, 5).map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{`${booking.client.first_name} ${booking.client.last_name}`}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.service.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(booking.booking_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                          'bg-red-100 text-red-800'}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No bookings found.</p>
          )}
          {bookings.length > 5 && (
            <div className="mt-4 text-right">
              <button 
                onClick={() => navigate("/dashboard/professional/calendar")} 
                className="text-brand-bronze hover:text-brand-bronze-dark text-sm font-medium"
              >
                View All Bookings →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Prepare appointments for calendar only after bookings data is available and not loading
  const appointments = !loading && bookings ? formatAppointmentsForCalendar(bookings) : [];

  return (
    <ProfessionalDashboardLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Welcome, {professionalName}!</h1>
      </div>
      <Routes>
        <Route index element={<DashboardOverview 
                                totalRevenue={totalRevenue} 
                                totalClients={totalClients} 
                                bookings={bookings} 
                                navigate={navigate} 
                                loading={loading} 
                              />} 
        />
        {/* Ensure appointments are passed to CalendarView */}
        <Route path="calendar" element={<CalendarView appointments={appointments} />} />
        <Route path="clients" element={<ClientsView />} />
        <Route path="services" element={<ServicesView />} />
        <Route path="payments" element={<PaymentsDashboard />} />
        <Route path="portfolio" element={<PortfolioView />} />
        <Route path="profile" element={<ProfileView />} />
        <Route path="settings" element={<WorkingHoursView />} />
          <Route path="notifications" element={<NotificationSettings />} />
      </Routes>
    </ProfessionalDashboardLayout>
  );
};

export default ProfessionalDashboard;
