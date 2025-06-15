import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  CreditCard,
  Users,
  Calendar
} from 'lucide-react';

interface PaymentData {
  id: string;
  client_name: string;
  client_email: string;
  date: string;
  status: string;
  service_name: string;
  amount: number;
  payment_method: string;
  booking_date: string;
  location: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalBookings: number;
  completedPayments: number;
  pendingPayments: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
}

const CustomPaymentsDashboard: React.FC = () => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalBookings: 0,
    completedPayments: 0,
    pendingPayments: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Get professional ID
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (profError) {
        throw profError;
      }

      if (!professional) {
        setError('Professional profile not found');
        return;
      }

      // Fetch bookings with related data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          total_amount,
          payment_method,
          location,
          created_at,
          client:profiles!client_id (
            first_name,
            last_name,
            email
          ),
          service:services!service_id (
            name
          )
        `)
        .eq('professional_id', professional.id)
        .order('booking_date', { ascending: false });

      if (bookingsError) {
        throw bookingsError;
      }

      // Transform data
      const transformedPayments: PaymentData[] = bookingsData.map((booking: any) => ({
        id: booking.id,
        client_name: `${booking.client?.first_name || 'Unknown'} ${booking.client?.last_name || 'Client'}`,
        client_email: booking.client?.email || 'No email',
        date: booking.created_at,
        status: booking.status,
        service_name: booking.service?.name || 'Unknown Service',
        amount: booking.total_amount,
        payment_method: booking.payment_method || 'Card',
        booking_date: booking.booking_date,
        location: booking.location || 'Not specified',
      }));

      // Calculate statistics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const totalRevenue = transformedPayments
        .filter(p => p.status === 'completed' || p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0);

      const completedPayments = transformedPayments
        .filter(p => p.status === 'completed' || p.status === 'confirmed').length;

      const pendingPayments = transformedPayments
        .filter(p => p.status === 'pending').length;

      const thisMonthRevenue = transformedPayments
        .filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate >= thisMonth && paymentDate < nextMonth && 
                 (p.status === 'completed' || p.status === 'confirmed');
        })
        .reduce((sum, p) => sum + p.amount, 0);

      const lastMonthRevenue = transformedPayments
        .filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate >= lastMonth && paymentDate < thisMonth && 
                 (p.status === 'completed' || p.status === 'confirmed');
        })
        .reduce((sum, p) => sum + p.amount, 0);

      setPayments(transformedPayments);
      setStats({
        totalRevenue,
        totalBookings: transformedPayments.length,
        completedPayments,
        pendingPayments,
        thisMonthRevenue,
        lastMonthRevenue,
      });

    } catch (err: any) {
      console.error('Error fetching payment data:', err);
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const calculateGrowthPercentage = () => {
    if (stats.lastMonthRevenue === 0) return stats.thisMonthRevenue > 0 ? 100 : 0;
    return ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8 text-brand-bronze" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const growthPercentage = calculateGrowthPercentage();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.completedPayments} completed bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.thisMonthRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPayments} pending payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalBookings > 0 ? ((stats.completedPayments / stats.totalBookings) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No payments found</p>
              <p className="text-sm">Your payment history will appear here once you start receiving bookings.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.client_name}</div>
                          <div className="text-sm text-gray-500">{payment.client_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.service_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.booking_date), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">${payment.amount.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getStatusColor(payment.status)} flex items-center gap-1 w-fit`}
                        >
                          {getStatusIcon(payment.status)}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomPaymentsDashboard; 