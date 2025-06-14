import React, { useState, useEffect } from 'react';
import { Download, ArrowUpDown, Calendar, DollarSign, CreditCard, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { auth, supabase } from '@/lib/supabase';

// Payment type definition
type Payment = {
  id: string;
  date: Date;
  client: string;
  client_id?: string;
  service: string;
  service_id?: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  location?: string;
  notes?: string;
};

type PaymentFilter = 'all' | 'completed' | 'pending';
type TimeFilter = 'all-time' | 'this-month' | 'last-month' | 'this-year';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const PaymentsView = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [completedPaymentsCount, setCompletedPaymentsCount] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
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
          setPayments([]);
          setTotalRevenue(0);
          setPendingRevenue(0);
          setCompletedPaymentsCount(0);
          setLoading(false);
          return;
        }

        // Get bookings for this professional - without nested queries first
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_date,
            client_id,
            service_id,
            status,
            total_amount,
            payment_method,
            location,
            notes
          `)
          .eq('professional_id', professionalData.id);

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
          setError('Could not retrieve booking information');
          return;
        }

        // If we have bookings, fetch client and service details separately
        let clientsMap: Record<string, { first_name: string; last_name: string }> = {};
        let servicesMap: Record<string, { name: string }> = {};
        
        if (bookingsData && bookingsData.length > 0) {
          // Get unique client IDs
          const clientIds = [...new Set(bookingsData.map(b => b.client_id).filter(Boolean))];
          if (clientIds.length > 0) {
            const { data: clientsData } = await supabase
              .from('clients')
              .select('id, first_name, last_name')
              .in('id', clientIds);
              
            if (clientsData) {
              clientsMap = clientsData.reduce((acc, client) => {
                acc[client.id] = { first_name: client.first_name, last_name: client.last_name };
                return acc;
              }, {} as Record<string, { first_name: string; last_name: string }>);
            }
          }
          
          // Get unique service IDs
          const serviceIds = [...new Set(bookingsData.map(b => b.service_id).filter(Boolean))];
          if (serviceIds.length > 0) {
            const { data: servicesData } = await supabase
              .from('services')
              .select('id, name')
              .in('id', serviceIds);
              
            if (servicesData) {
              servicesMap = servicesData.reduce((acc, service) => {
                acc[service.id] = { name: service.name };
                return acc;
              }, {} as Record<string, { name: string }>);
            }
          }
        }
        
        // Transform bookings into payments
        const formattedPayments: Payment[] = bookingsData.map(booking => {
          const client = clientsMap[booking.client_id] || { first_name: 'Unknown', last_name: 'Client' };
          const service = servicesMap[booking.service_id] || { name: 'Unknown Service' };
          
          return {
            id: booking.id,
            date: new Date(booking.booking_date),
            client: `${client.first_name} ${client.last_name}`,
            client_id: booking.client_id,
            service: service.name,
            service_id: booking.service_id,
            amount: booking.total_amount,
            status: booking.status === 'completed' ? 'completed' : 
                   booking.status === 'confirmed' ? 'pending' : 'failed',
            // Handle case where payment_method column might not exist in the database
            paymentMethod: booking.payment_method !== undefined ? booking.payment_method : 'Card',
            location: booking.location || 'N/A',
            notes: booking.notes || ''
          };
        });

        // Calculate summary statistics
        const total = formattedPayments
          .filter(payment => payment.status === 'completed')
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        const pending = formattedPayments
          .filter(payment => payment.status === 'pending')
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        setPayments(formattedPayments);
        setTotalRevenue(total);
        setPendingRevenue(pending);
        setCompletedPaymentsCount(formattedPayments.filter(p => p.status === 'completed').length);
      } catch (err) {
        console.error('Error in fetchPayments:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Filter payments based on selected filters
  const getFilteredPayments = () => {
    let filtered = [...payments];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }
    
    // Apply time filter
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    
    if (timeFilter === 'this-month') {
      filtered = filtered.filter(payment => payment.date >= thisMonth);
    } else if (timeFilter === 'last-month') {
      filtered = filtered.filter(payment => 
        payment.date >= lastMonth && payment.date < thisMonth
      );
    } else if (timeFilter === 'this-year') {
      filtered = filtered.filter(payment => payment.date >= thisYear);
    }
    
    return filtered;
  };

  const filteredPayments = getFilteredPayments();

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
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white text-black border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-700">For all completed payments</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white text-black border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">Pending</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">${pendingRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-700">Awaiting payment confirmation</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white text-black border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">Transactions</CardTitle>
            <User className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{completedPaymentsCount}</div>
            <p className="text-xs text-gray-700">Total completed transactions</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white text-black border border-gray-200">
        <CardHeader className="bg-white p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg text-gray-800 font-semibold">Payment History</CardTitle>
            <div className="flex gap-2">
              <div className="w-[150px]">
                <Select 
                  defaultValue="all" 
                  value={statusFilter} 
                  onValueChange={(value) => setStatusFilter(value as PaymentFilter)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <Select 
                  defaultValue="all-time" 
                  value={timeFilter} 
                  onValueChange={(value) => setTimeFilter(value as TimeFilter)}
                >
                  <SelectTrigger className="bg-white">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-time">All Time</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Amount
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden lg:table-cell">Payment Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length > 0 ? filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(payment.date, 'MMM d, yyyy')}
                    <div className="text-xs text-gray-500">{format(payment.date, 'h:mm a')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{payment.client}</div>
                    {payment.client_id && (
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={payment.client_id}>ID: {payment.client_id}</div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{payment.service}</TableCell>
                  <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{payment.location}</TableCell>
                  <TableCell className="hidden lg:table-cell">{payment.paymentMethod}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    No payments found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsView; 