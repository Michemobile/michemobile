import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { supabase, supabaseAdmin, auth } from "@/lib/supabase";
import { format, parse, addMinutes } from "date-fns";
import { Trash2 } from "lucide-react";

// Define the blocked time slot type
interface BlockedTimeSlot {
  id: string;
  professional_id: string;
  start_time: string; // This is a timestamptz in the database
  end_time: string;   // This is a timestamptz in the database
  reason?: string;
  created_at?: string;
}

const BlockedTimeSlotsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<BlockedTimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfessionalId();
  }, []);

  useEffect(() => {
    if (professionalId) {
      fetchBlockedTimeSlots();
    }
  }, [professionalId, selectedDate]);

  const fetchProfessionalId = async () => {
    try {
      // Get current user
      const session = await auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      console.log("Fetching professional ID for user:", userId);

      // Use admin client if available for more reliable access
      const adminClient = supabaseAdmin || supabase;

      // Get professional ID from user profile
      const { data: professionalData, error: professionalError } = await adminClient
        .from("professionals")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      if (professionalError) {
        console.error("Error fetching professional ID:", professionalError);
        toast({
          title: "Error",
          description: "Could not fetch your professional profile. Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (professionalData) {
        console.log("Found professional ID:", professionalData.id);
        setProfessionalId(professionalData.id);
      } else {
        console.error("No professional record found for this user");
        toast({
          title: "Profile Incomplete",
          description: "Your professional profile is not set up. Please complete your profile first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in fetchProfessionalId:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedTimeSlots = async () => {
    if (!professionalId || !selectedDate) return;

    try {
      setLoading(true);
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      
      // Use admin client if available
      const adminClient = supabaseAdmin || supabase;
      
      // Check if the blocked_time_slots table exists
      try {
        const { data, error } = await adminClient
          .from("blocked_time_slots")
          .select("*")
          .eq("professional_id", professionalId)
          // Filter by date range for the selected date
          .gte("start_time", `${formattedDate}T00:00:00`)
          .lt("start_time", `${formattedDate}T23:59:59`);

        if (error) {
          console.error("Error fetching blocked time slots:", error);
          toast({
            title: "Error",
            description: "Failed to load your blocked time slots. Please try again.",
            variant: "destructive",
          });
          return;
        }

        setBlockedTimeSlots(data || []);
      } catch (tableError) {
        console.error("Error fetching blocked time slots:", tableError);
        // Table might not exist yet, set empty array
        setBlockedTimeSlots([]);
      }
    } catch (error) {
      console.error("Error in fetchBlockedTimeSlots:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedTimeSlot = async () => {
    if (!professionalId || !selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first.",
        variant: "destructive",
      });
      return;
    }

    if (!startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please select both start and end times.",
        variant: "destructive",
      });
      return;
    }

    // Validate that end time is after start time
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const startDateTime = parse(`${formattedDate} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
    const endDateTime = parse(`${formattedDate} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());
    
    if (endDateTime <= startDateTime) {
      toast({
        title: "Error",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Check for overlapping blocked time slots
      const overlappingSlots = blockedTimeSlots.filter(slot => {
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slot.end_time);
        
        // Check if the new slot overlaps with an existing slot
        return (
          (startDateTime >= slotStart && startDateTime < slotEnd) || // New start time is within existing slot
          (endDateTime > slotStart && endDateTime <= slotEnd) || // New end time is within existing slot
          (startDateTime <= slotStart && endDateTime >= slotEnd) // New slot completely contains existing slot
        );
      });
      
      if (overlappingSlots.length > 0) {
        toast({
          title: "Overlapping Time Slots",
          description: "This time slot overlaps with an existing blocked time slot.",
          variant: "destructive",
        });
        return;
      }
      
      // Use admin client if available
      const adminClient = supabaseAdmin || supabase;
      
      try {
        // Format dates as ISO strings for the database
        const startTimeISO = startDateTime.toISOString();
        const endTimeISO = endDateTime.toISOString();
        
        const { error } = await adminClient
          .from("blocked_time_slots")
          .insert({
            professional_id: professionalId,
            start_time: startTimeISO,
            end_time: endTimeISO,
            reason: reason.trim() || null,
          });

        if (error) {
          console.error("Error adding blocked time slot:", error);
          toast({
            title: "Error",
            description: "Failed to block this time slot. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Clear form and refresh data
        setReason("");
        fetchBlockedTimeSlots();
        
        toast({
          title: "Success",
          description: "Time slot blocked successfully.",
        });
      } catch (tableError) {
        console.error("Error adding blocked time slot:", tableError);
        toast({
          title: "Database Error",
          description: "The blocked time slots feature is not available yet. Please run the database update script first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleAddBlockedTimeSlot:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlockedTimeSlot = async (id: string) => {
    try {
      // Use admin client if available
      const adminClient = supabaseAdmin || supabase;
      
      try {
        const { error } = await adminClient
          .from("blocked_time_slots")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Error deleting blocked time slot:", error);
          toast({
            title: "Error",
            description: "Failed to remove this blocked time slot. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Refresh data
        setBlockedTimeSlots(blockedTimeSlots.filter(slot => slot.id !== id));
        
        toast({
          title: "Success",
          description: "Blocked time slot removed successfully.",
        });
      } catch (tableError) {
        console.error("Error deleting blocked time slot:", tableError);
        toast({
          title: "Database Error",
          description: "The blocked time slots feature is not available yet. Please run the database update script first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleDeleteBlockedTimeSlot:", error);
    }
  };

  const formatTimeDisplay = (time: string) => {
    try {
      // Parse ISO timestamp and format it to a more readable format
      const date = new Date(time);
      return format(date, "h:mm a"); // e.g., "9:00 AM"
    } catch (error) {
      return time; // Fallback to original format
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Block Unavailable Time Slots</CardTitle>
          <CardDescription>
            Mark times when you're not available for appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="date">Select Date</Label>
              <div className="mt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="border rounded-md"
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Why you're unavailable"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <Button 
                onClick={handleAddBlockedTimeSlot} 
                disabled={saving || !selectedDate}
                className="w-full mt-4"
              >
                {saving ? <Spinner className="mr-2" /> : null}
                Block This Time Slot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Blocked Time Slots for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            {blockedTimeSlots.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No blocked time slots for this date
              </p>
            ) : (
              <div className="space-y-3">
                {blockedTimeSlots.map((slot) => (
                  <div 
                    key={slot.id} 
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">
                        {formatTimeDisplay(slot.start_time)} - {formatTimeDisplay(slot.end_time)}
                      </p>
                      {slot.reason && <p className="text-sm text-gray-500">{slot.reason}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBlockedTimeSlot(slot.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlockedTimeSlotsManager;
