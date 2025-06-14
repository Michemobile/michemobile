import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { type Booking } from "@/lib/supabase";

interface BookingConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: Partial<Booking> & {
    serviceName: string;
    professionalName: string;
    bookingDate: Date;
    bookingTime: string;
  };
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  isOpen,
  onClose,
  bookingData,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500 mb-2" />
            <DialogTitle className="text-2xl font-bold text-center">
              Booking Completed
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Booking Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">{bookingData.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Professional:</span>
                <span className="font-medium">{bookingData.professionalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {format(bookingData.bookingDate, "PPP")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">{bookingData.bookingTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{bookingData.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">${bookingData.total_amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-600">Confirmed</span>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Your booking has been confirmed. You can view all your bookings in your dashboard.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="sm:mr-2 w-full sm:w-auto"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onClose();
              window.location.href = "/dashboard";
            }}
            className="w-full sm:w-auto bg-brand-bronze hover:bg-brand-bronze/80"
          >
            Go to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingConfirmation;
