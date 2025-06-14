import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Payment } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface ExtendedPayment extends Payment {
  booking_details: {
    service_name: string;
    location: string;
    payment_method: string;
  };
}

const AllPayments: React.FC = () => {
  const [payments, setPayments] = useState<ExtendedPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          clients:client_id(
            first_name,
            last_name
          ),
          professionals:professional_id(
            profiles:profile_id(
              first_name,
              last_name
            )
          ),
          bookings:booking_id(
            services:service_id(name),
            location,
            payment_method
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPayments = data.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        created_at: payment.created_at,
        client_id: payment.client_id,
        professional_id: payment.professional_id,
        booking_id: payment.booking_id,
        client_name: `${payment.clients.first_name} ${payment.clients.last_name}`,
        professional_name: `${payment.professionals.profiles.first_name} ${payment.professionals.profiles.last_name}`,
        booking_details: {
          service_name: payment.bookings.services.name,
          location: payment.bookings.location,
          payment_method: payment.bookings.payment_method
        }
      }));

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mobile card view component
  const MobilePaymentCard: React.FC<{ payment: ExtendedPayment }> = ({ payment }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium">
              ${payment.amount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {payment.booking_details.payment_method}
          </Badge>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="text-sm text-gray-500">Client</div>
            <div>{payment.client_name}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Professional</div>
            <div>{payment.professional_name}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Service</div>
            <div>{payment.booking_details.service_name}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Location</div>
            <div>{payment.booking_details.location}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-4">Loading payments...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">All Payments</h2>
      
      {/* Mobile View */}
      <div className="sm:hidden">
        {payments.map((payment) => (
          <MobilePaymentCard key={payment.id} payment={payment} />
        ))}
        {payments.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No payments found
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>Professional Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
                </TableCell>
                <TableCell>{payment.client_name}</TableCell>
                <TableCell>{payment.professional_name}</TableCell>
                <TableCell>{payment.booking_details.service_name}</TableCell>
                <TableCell>{payment.booking_details.location}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {payment.booking_details.payment_method}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  ${payment.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No payments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AllPayments; 