import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { emailService } from "@/lib/email";

// Define the Professional type
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
  certification: string;
  is_approved: boolean;
  is_onboarding_complete: boolean;
  created_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Booking {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  booking_date: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface Service {
  id: string;
  professional_id: string;
  name: string;
  price: number;
  description: string;
}

const AdminDashboard = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [totals, setTotals] = useState<{ totalBookings: number; totalRevenue: number }>({ totalBookings: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch all clients and their bookings
  const fetchClientsAndBookings = async () => {
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone');
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, client_id, professional_id, service_id, booking_date, status, total_amount, created_at');
      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error fetching clients/bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load clients or bookings.",
        variant: "destructive",
      });
    }
  };

  // Fetch all services
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, professional_id, name, price, description');
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Error",
        description: "Failed to load services.",
        variant: "destructive",
      });
    }
  };

  // Fetch totals for bookings and revenue
  const fetchTotals = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, total_amount');
      if (error) throw error;
      const totalBookings = data ? data.length : 0;
      const totalRevenue = data ? data.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) : 0;
      setTotals({ totalBookings, totalRevenue });
    } catch (error) {
      console.error('Error fetching totals:', error);
      toast({
        title: "Error",
        description: "Failed to load totals.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Check admin session via localStorage
    const isAdmin = localStorage.getItem("isAdmin");
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard.",
        variant: "destructive",
      });
      navigate("/admin/login");
      return;
    }
    // If we get here, the user is authorized
    fetchAllData();
  }, [navigate]);

  // Fetch all dashboard data
  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProfessionals(),
      fetchClientsAndBookings(),
      fetchServices(),
      fetchTotals()
    ]);
    setLoading(false);
  };
  
  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      
      // Get all professionals, ordered by creation date (newest first)
      const { data, error } = await supabase
        .from('professionals')
        .select(`
          id,
          profile_id,
          first_name,
          last_name,
          email,
          phone,
          bio,
          specialty,
          years_experience,
          certification,
          is_approved,
          is_onboarding_complete,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setProfessionals(data || []);
    } catch (error) {
      console.error('Error fetching professionals:', error);
      toast({
        title: "Error",
        description: "Failed to load professionals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (professionalId: string, email: string) => {
    try {
      setApprovingId(professionalId);
      
      // Update the professional's approval status
      const { error } = await supabase
        .from('professionals')
        .update({ is_approved: true })
        .eq('id', professionalId);
      
      if (error) throw error;
      
      // Send approval email to the professional
      await emailService.sendProfessionalApprovalNotification(professionalId, email);
      
      toast({
        title: "Professional Approved",
        description: "The professional has been approved and notified via email.",
        variant: "default",
      });
      
      // Refresh the list
      fetchProfessionals();
    } catch (error) {
      console.error('Error approving professional:', error);
      toast({
        title: "Error",
        description: "Failed to approve professional. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-bronze" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Totals Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Totals</h2>
        <div className="flex space-x-8">
          <div className="bg-white rounded shadow p-4">
            <div className="text-gray-500">Total Bookings</div>
            <div className="text-2xl font-bold">{totals.totalBookings}</div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="text-gray-500">Total Revenue</div>
            <div className="text-2xl font-bold">${totals.totalRevenue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Clients and Bookings Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Clients & Bookings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map(client => (
                <tr key={client.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{client.first_name} {client.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{client.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {bookings.filter(b => b.client_id === client.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Services by Professional Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Services by Professional</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professional</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {professionals.map(prof => (
                services.filter(s => s.professional_id === prof.id).map(service => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{prof.first_name} {prof.last_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{service.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${service.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{service.description}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Professional Approval Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Professionals (Approval)</h2>
        {professionals.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No professional applications found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {professionals.map((professional) => (
                  <tr key={professional.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {professional.first_name} {professional.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{professional.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{professional.specialty || "Not specified"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{professional.years_experience || "Not specified"} years</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(professional.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        professional.is_approved
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {professional.is_approved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/professionals/${professional.id}`)}
                        >
                          View
                        </Button>
                        
                        {!professional.is_approved && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-brand-bronze hover:bg-brand-bronze/80 text-white"
                            onClick={() => handleApprove(professional.id, professional.email)}
                            disabled={approvingId === professional.id}
                          >
                            {approvingId === professional.id ? (
                              <>
                                <Spinner className="h-4 w-4 mr-2" />
                                Approving...
                              </>
                            ) : (
                              "Approve"
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
