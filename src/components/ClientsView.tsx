import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCog, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { auth, supabase } from '@/lib/supabase';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  totalBookings: number;
  lastBooking: string | null;
  status: 'active' | 'inactive';
  profile_photo_url?: string | null;
};

const ClientsView = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const user = await auth.getUser();
        
        if (!user) {
          setError('User not authenticated');
          return;
        }

        // First get the professional ID
        const { data: professionalData, error: professionalError } = await supabase
          .from('professionals')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (professionalError && professionalError.code !== 'PGRST116') {
          console.error('Error fetching professional:', professionalError);
          setError('Could not retrieve professional information');
          return;
        }

        if (!professionalData) {
          // No professional record found yet - show empty state instead of error
          setClients([]);
          setLoading(false);
          return;
        }

        // Get all bookings for this professional to calculate client statistics
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_date,
            client_id,
            status
          `)
          .eq('professional_id', professionalData.id);

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
          setError('Could not retrieve booking information');
          return;
        }

        // Get unique client IDs from bookings
        const clientIds = [...new Set(bookingsData?.map(booking => booking.client_id) || [])];

        if (clientIds.length === 0) {
          setClients([]);
          setLoading(false);
          return;
        }

        // Get client details from profiles table using client_ids from bookings
        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            type,
            profile_photo_url
          `)
          .in('id', clientIds);

        if (clientsError) {
          console.error('Error fetching clients:', clientsError);
          setError('Could not retrieve client information');
          return;
        }

        // Process clients with booking information
        const processedClients = clientsData?.map(client => {
          const clientBookings = bookingsData.filter(booking => booking.client_id === client.id);
          const lastBookingDate = clientBookings.length > 0 
            ? new Date(Math.max(...clientBookings.map(b => new Date(b.booking_date).getTime())))
            : null;
          
          return {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email,
            phone: client.phone || '',
            totalBookings: clientBookings.length,
            lastBooking: lastBookingDate ? lastBookingDate.toISOString().split('T')[0] : null,
            status: (client.type === 'client' ? 'active' : 'inactive') as 'active' | 'inactive', // Cast to the correct type
            profile_photo_url: client.profile_photo_url
          };
        });

        setClients(processedClients || []);
      } catch (err) {
        console.error('Error in fetchClients:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Filter clients based on search query
  const filteredClients = clients.filter(client => {
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (client.phone && client.phone.includes(searchQuery));
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8 text-brand-bronze" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>Error: {error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>
      
      <Card className="bg-white text-black border border-gray-200">
        <CardHeader className="bg-white p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg text-gray-800 font-semibold">Client List</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search clients..." 
                className="pl-8 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Total Bookings</TableHead>
                <TableHead className="hidden lg:table-cell">Last Booking</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length > 0 ? filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{`${client.first_name} ${client.last_name}`}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell">{client.totalBookings}</TableCell>
                  <TableCell className="hidden lg:table-cell">{client.lastBooking || 'N/A'}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {client.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 sm:h-8 sm:w-8 md:h-10 md:w-10"
                            >
                              <Mail className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-[200px] break-all bg-white text-black p-2 text-sm sm:text-base"
                          >
                            <p>{client.email}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 sm:h-8 sm:w-8 md:h-10 md:w-10"
                            >
                              <Phone className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-[200px] break-all bg-white text-black p-2 text-sm sm:text-base"
                          >
                            <p>{client.phone || 'No phone number'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 sm:h-8 sm:w-8 md:h-10 md:w-10"
                              onClick={() => {
                                setSelectedClient(client);
                                setIsProfileDialogOpen(true);
                              }}
                            >
                              <UserCog className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="bg-white text-black p-2 text-sm sm:text-base"
                          >
                            <p>View Profile</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    {searchQuery ? 'No clients match your search' : 'No clients found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="fixed inset-0 w-full h-full sm:h-auto sm:relative sm:inset-auto sm:max-w-[425px] bg-white p-4 sm:p-6 sm:rounded-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-center sm:text-left">
              {selectedClient?.first_name}'s Bookings
            </DialogTitle>
            <DialogDescription className="text-sm text-center sm:text-left">
              Showing all bookings for this service
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-[500px]">
              <div className="flex flex-col items-center sm:items-start gap-4">
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {selectedClient.first_name} {selectedClient.last_name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {selectedClient.email}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {selectedClient.phone || 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium text-gray-500">Total Bookings</div>
                    <div className="mt-1 text-lg font-semibold">{selectedClient.totalBookings}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium text-gray-500">Last Booking</div>
                    <div className="mt-1 text-lg font-semibold">{selectedClient.lastBooking || 'Never'}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded col-span-2">
                    <div className="font-medium text-gray-500">Status</div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedClient.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedClient.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 sm:mt-4">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setIsProfileDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsView; 