import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/database';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ExtendedBooking extends Booking {
  client_name: string;
  professional_name: string;
  service_name: string;
  service_price: number;
  service_duration: number;
  payment_amount: number;
  payment_method: string;
}

const AllBookings: React.FC = () => {
  const [bookings, setBookings] = useState<ExtendedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
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
          services:service_id(
            name,
            price,
            duration
          ),
          payments(amount)
        `)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const formattedBookings = data.map(booking => ({
        id: booking.id,
        client_id: booking.client_id,
        professional_id: booking.professional_id,
        service_id: booking.service_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        notes: booking.notes,
        location: booking.location,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        client_name: `${booking.clients.first_name} ${booking.clients.last_name}`,
        professional_name: `${booking.professionals.profiles.first_name} ${booking.professionals.profiles.last_name}`,
        service_name: booking.services.name,
        service_price: booking.services.price,
        service_duration: booking.services.duration,
        payment_amount: booking.payments?.[0]?.amount || 0,
        payment_method: booking.payment_method
      }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Mobile card view component
  const MobileBookingCard: React.FC<{ booking: ExtendedBooking }> = ({ booking }) => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium">
              {format(new Date(booking.start_time), 'MMM d, yyyy')}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(booking.status)}>
            {booking.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details">
            <AccordionTrigger>Booking Details</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div>{booking.service_duration} minutes</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Client</div>
                  <div>{booking.client_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Professional</div>
                  <div>{booking.professional_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Service</div>
                  <div>{booking.service_name}</div>
                  <div className="text-sm text-gray-500">${booking.service_price}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div>{booking.location}</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="payment">
            <AccordionTrigger>Payment Information</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Amount</div>
                  <div>${booking.payment_amount.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Payment Method</div>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {booking.payment_method || 'Not specified'}
                  </Badge>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {booking.notes && (
            <AccordionItem value="notes">
              <AccordionTrigger>Notes</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm">{booking.notes}</p>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-4">Loading bookings...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">All Bookings</h2>
      
      {/* Mobile View */}
      <div className="sm:hidden">
        {bookings.map((booking) => (
          <MobileBookingCard key={booking.id} booking={booking} />
        ))}
        {bookings.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No bookings found
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Professional</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <div>
                    {format(new Date(booking.start_time), 'MMM d, yyyy')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                  </div>
                </TableCell>
                <TableCell>
                  {booking.service_duration} minutes
                </TableCell>
                <TableCell>{booking.client_name}</TableCell>
                <TableCell>{booking.professional_name}</TableCell>
                <TableCell>
                  <div>{booking.service_name}</div>
                  <div className="text-sm text-gray-500">
                    ${booking.service_price}
                  </div>
                </TableCell>
                <TableCell>{booking.location}</TableCell>
                <TableCell>
                  <div>${booking.payment_amount.toFixed(2)}</div>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {booking.payment_method || 'Not specified'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {booking.notes && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-sm text-gray-500 underline">
                          View Notes
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{booking.notes}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  No bookings found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AllBookings; 