import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format, startOfWeek, isSameDay, addHours, startOfDay, addMinutes, isWithinInterval } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { DayContentProps } from "react-day-picker";
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase, auth } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// This defines what an appointment looks like
interface Appointment {
  id: string;
  date: Date;
  duration: number; // in minutes
  client: {
    id: string;
    name: string;
  };
  service: {
    name: string;
  };
  location: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

// Define blocked time slot interface
interface BlockedTimeSlot {
  id: string;
  professional_id: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  reason?: string;
  created_at?: string;
}

// Map status to colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'border-green-500 bg-green-50';
    case 'pending':
      return 'border-yellow-500 bg-yellow-50';
    case 'completed':
      return 'border-blue-500 bg-blue-50';
    case 'cancelled':
      return 'border-red-500 bg-red-50';
    case 'blocked':
      return 'border-gray-500 bg-gray-100';
    default:
      return 'border-gray-200';
  }
};

interface CalendarViewProps {
  appointments: Appointment[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<BlockedTimeSlot[]>([]);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Fetch professional ID when component mounts
  useEffect(() => {
    const fetchProfessionalId = async () => {
      try {
        // Get current user
        const session = await auth.getSession();
        if (!session?.user) return;

        const userId = session.user.id;
        
        // Get professional ID from user profile
        const { data: professionalData, error: professionalError } = await supabase
          .from("professionals")
          .select("id")
          .eq("profile_id", userId)
          .maybeSingle();

        if (professionalError) {
          console.error("Error fetching professional ID:", professionalError);
          return;
        }

        if (professionalData) {
          setProfessionalId(professionalData.id);
        }
      } catch (error) {
        console.error("Error in fetchProfessionalId:", error);
      }
    };

    fetchProfessionalId();
  }, []);
  
  // Fetch blocked time slots when date or professional ID changes
  useEffect(() => {
    if (!professionalId) return;
    
    const fetchBlockedTimeSlots = async () => {
      try {
        setLoading(true);
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        
        try {
          const { data, error } = await supabase
            .from("blocked_time_slots")
            .select("*")
            .eq("professional_id", professionalId)
            // Filter by date range for the selected date
            .gte("start_time", `${formattedDate}T00:00:00`)
            .lt("start_time", `${formattedDate}T23:59:59`);

          if (error) {
            console.error("Error fetching blocked time slots:", error);
            return;
          }

          setBlockedTimeSlots(data || []);
        } catch (tableError) {
          console.error("Error fetching blocked time slots:", tableError);
          setBlockedTimeSlots([]);
        }
      } catch (error) {
        console.error("Error in fetchBlockedTimeSlots:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBlockedTimeSlots();
  }, [professionalId, selectedDate]);

  // Get appointments for the selected date
  const getDayAppointments = (date: Date) => {
    return appointments.filter((appointment) => 
      isSameDay(new Date(appointment.date), date)
    );
  };
  
  // Get appointments for the selected week
  const getWeekAppointments = (date: Date) => {
    const weekStart = startOfWeek(date);
    const daysInWeek = [...Array(7)].map((_, i) => addDays(weekStart, i));
    
    return daysInWeek.map(day => ({
      date: day,
      appointments: getDayAppointments(day)
    }));
  };

  // Generate time slots for the day view (8am - 8pm, 30 min intervals)
  const getDayTimeSlots = () => {
    const slots = [];
    const dayStart = startOfDay(selectedDate);
    const startHour = 8; // 8am
    const endHour = 20; // 8pm
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = addMinutes(addHours(dayStart, hour), minute);
        slots.push(slotTime);
      }
    }
    
    return slots;
  };

  // Find appointments for a specific time slot
  const getAppointmentsForTimeSlot = (timeSlot: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const appointmentHour = appointmentDate.getHours();
      const appointmentMinute = appointmentDate.getMinutes();
      const slotHour = timeSlot.getHours();
      const slotMinute = timeSlot.getMinutes();
      
      return (
        isSameDay(appointmentDate, selectedDate) &&
        appointmentHour === slotHour &&
        appointmentMinute === slotMinute
      );
    });
  };
  
  // Check if a time slot is blocked
  const isTimeSlotBlocked = (timeSlot: Date) => {
    return blockedTimeSlots.some(blockedSlot => {
      const startTime = new Date(blockedSlot.start_time);
      const endTime = new Date(blockedSlot.end_time);
      
      return isWithinInterval(timeSlot, { start: startTime, end: endTime });
    });
  };
  
  // Get blocked time slots for a specific time slot
  const getBlockedTimeSlotsForTimeSlot = (timeSlot: Date) => {
    return blockedTimeSlots.filter(blockedSlot => {
      const startTime = new Date(blockedSlot.start_time);
      const endTime = new Date(blockedSlot.end_time);
      
      return isWithinInterval(timeSlot, { start: startTime, end: endTime });
    });
  };

  // Calendar day render function - highlight days based on booking status
  const renderCalendarDay = (props: DayContentProps) => {
    const { date, displayMonth } = props;
    if (!date) return <div>{format(date, 'd')}</div>;
    
    const dayAppointments = getDayAppointments(date);
    
    // Get the most important status for the day
    let dayStatus = 'available';
    if (dayAppointments.length > 0) {
      if (dayAppointments.some(apt => apt.status === 'confirmed')) {
        dayStatus = 'confirmed';
      } else if (dayAppointments.some(apt => apt.status === 'pending')) {
        dayStatus = 'pending';
      } else if (dayAppointments.some(apt => apt.status === 'completed')) {
        dayStatus = 'completed';
      } else if (dayAppointments.some(apt => apt.status === 'cancelled')) {
        dayStatus = 'cancelled';
      }
    }
    
    // Check if there are blocked time slots for this day
    const formattedDate = format(date, "yyyy-MM-dd");
    const dayBlockedSlots = blockedTimeSlots.filter(slot => {
      const slotDate = new Date(slot.start_time);
      return format(slotDate, "yyyy-MM-dd") === formattedDate;
    });
    const hasBlockedSlots = dayBlockedSlots.length > 0;
    
    // Get the background color class based on status and blocked slots
    const getBackgroundColor = (dayStatus: string, hasBlockedSlots: boolean) => {
      if (hasBlockedSlots) return 'bg-gray-200';
      switch (dayStatus) {
        case 'confirmed':
          return 'bg-green-100';
        case 'pending':
          return 'bg-yellow-100';
        case 'completed':
          return 'bg-blue-100';
        case 'cancelled':
          return 'bg-red-100';
        default:
          return '';
      }
    };
    
    return (
      <div className={cn(
        "relative w-full h-full flex items-center justify-center rounded-md",
        getBackgroundColor(dayStatus, hasBlockedSlots),
        dayAppointments.length > 0 ? 'font-medium' : ''
      )}>
        <div>{format(date, 'd')}</div>
      </div>
    );
  };

  // Render day view with blocked time slots
  const renderDayView = () => {
    const timeSlots = getDayTimeSlots();
    const dayAppointments = getDayAppointments(selectedDate);
    
    return (
      <div className="space-y-4">
        {/* Date header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          <Badge variant="outline">
            {dayAppointments.length} Appointment{dayAppointments.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        {/* Time slots grid */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <ScrollArea className="h-[calc(100vh-300px)] md:h-[600px]">
            <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr]">
              {/* Time column */}
              <div className="border-r bg-gray-50">
                {timeSlots.map((time, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-20 flex items-center justify-center text-sm font-medium text-gray-600 border-b",
                      index === timeSlots.length - 1 ? "border-b-0" : ""
                    )}
                  >
                    {format(time, "h:mm a")}
                  </div>
                ))}
              </div>

              {/* Appointments column */}
              <div>
          {timeSlots.map((timeSlot, index) => {
            const slotAppointments = getAppointmentsForTimeSlot(timeSlot);
                  const isBlocked = isTimeSlotBlocked(timeSlot);
                  const blockedSlot = isBlocked ? getBlockedTimeSlotsForTimeSlot(timeSlot)[0] : null;
            
            return (
              <div 
                key={index} 
                className={cn(
                        "h-20 border-b p-2",
                        isBlocked ? "bg-gray-100" : "",
                        slotAppointments.length > 0 ? "bg-gray-50" : "",
                        isSameDay(timeSlot, new Date()) ? "bg-blue-50/50" : "",
                        index === timeSlots.length - 1 ? "border-b-0" : ""
                      )}
                    >
                      {slotAppointments.map((appointment) => (
                        <div 
                          key={appointment.id}
                          className={cn(
                            "p-2 rounded-md border shadow-sm mb-1 transition-colors",
                            getStatusColor(appointment.status)
                          )}
                          title={`${appointment.service.name} - ${appointment.client.name}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate">
                              {appointment.service.name}
                          </div>
                            <Badge variant="outline" className="ml-2 shrink-0">
                              {format(new Date(appointment.date), "h:mm a")}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 truncate mt-1">
                            {appointment.client.name}
                          </div>
                        </div>
                      ))}

                      {isBlocked && (
                        <div
                          className={cn(
                            "p-2 rounded-md border shadow-sm mb-1",
                            getStatusColor('blocked')
                          )}
                          title={blockedSlot?.reason || "Blocked Time Slot"}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium flex items-center">
                              <Lock className="h-3 w-3 mr-1" />
                              <span>Blocked Time</span>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {format(timeSlot, "h:mm a")}
                            </Badge>
                    </div>
                          {blockedSlot?.reason && (
                            <div className="text-sm text-gray-600 truncate mt-1">
                              {blockedSlot.reason}
                    </div>
                  )}
                </div>
                      )}
              </div>
            );
          })}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Render week view with blocked time slots
  const renderWeekView = () => {
    const timeSlots = getDayTimeSlots();
    const weekAppointments = getWeekAppointments(selectedDate);
    
    return (
      <div className="space-y-4">
        {/* Week header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold">
            Week of {format(weekAppointments[0].date, 'MMMM d, yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week grid */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <ScrollArea className="h-[calc(100vh-300px)] md:h-[600px]">
            <div className="grid grid-cols-[80px_1fr] md:grid-cols-[100px_1fr]">
          {/* Time column */}
              <div className="border-r bg-gray-50">
                <div className="h-12 border-b"></div>
                {timeSlots.map((time, index) => (
                  <div
                    key={index}
                    className="h-20 flex items-center justify-center text-sm font-medium text-gray-600 border-b"
                  >
                    {format(time, "h:mm a")}
              </div>
            ))}
          </div>
          
              {/* Days grid */}
              <div className="grid grid-cols-7">
                {/* Day headers */}
                {weekAppointments.map(({ date }, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-12 flex flex-col items-center justify-center border-b border-l",
                      "first:border-l-0",
                      isSameDay(date, new Date()) ? "bg-blue-50" : "bg-gray-50"
                    )}
                  >
                    <div className="text-sm font-medium">{format(date, "EEE")}</div>
                    <div className="text-xs text-gray-500">{format(date, "MMM d")}</div>
              </div>
                ))}

                {/* Time slots for each day */}
                {weekAppointments.map(({ date }, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      "border-l first:border-l-0",
                      isSameDay(date, new Date()) ? "bg-blue-50/10" : ""
                    )}
                  >
              {timeSlots.map((timeSlot, slotIndex) => {
                      const slotAppointments = appointments.filter((apt) => {
                  const aptTime = new Date(apt.date);
                        return (
                          isSameDay(aptTime, date) &&
                          aptTime.getHours() === timeSlot.getHours() &&
                          aptTime.getMinutes() === timeSlot.getMinutes()
                        );
                });

                      const isBlocked = isTimeSlotBlocked(timeSlot);
                      const blockedSlot = isBlocked ? getBlockedTimeSlotsForTimeSlot(timeSlot)[0] : null;
                
                return (
                  <div 
                    key={slotIndex} 
                    className={cn(
                            "h-20 border-b p-1",
                            isBlocked ? "bg-gray-100" : "",
                      slotAppointments.length > 0 ? "bg-gray-50" : "",
                      isSameDay(date, new Date()) ? "bg-blue-50/50" : ""
                    )}
                  >
                          {slotAppointments.map((appointment) => (
                      <div 
                        key={appointment.id}
                        className={cn(
                                "p-1 rounded-md border shadow-sm mb-1 transition-colors",
                          getStatusColor(appointment.status)
                        )}
                        title={`${appointment.service.name} - ${appointment.client.name}`}
                      >
                              <div className="flex items-center justify-between gap-1">
                                <div className="font-medium text-xs truncate">
                                  {appointment.service.name}
                                </div>
                                <Badge variant="outline" className="text-[10px] px-1">
                                  {format(new Date(appointment.date), "h:mm")}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-gray-600 truncate">
                                {appointment.client.name}
                              </div>
                      </div>
                    ))}
                    
                          {isBlocked && (
                      <div 
                        className={cn(
                                "p-1 rounded-md border shadow-sm mb-1",
                          getStatusColor('blocked')
                        )}
                              title={blockedSlot?.reason || "Blocked Time Slot"}
                      >
                              <div className="flex items-center justify-between gap-1">
                                <div className="font-medium text-xs flex items-center">
                                  <Lock className="h-2 w-2 mr-1" />
                                  <span>Blocked</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] px-1">
                                  {format(timeSlot, "h:mm")}
                                </Badge>
                              </div>
                              {blockedSlot?.reason && (
                                <div className="text-[10px] text-gray-600 truncate">
                                  {blockedSlot.reason}
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "day" ? "week" : "day")}
          >
            {viewMode === "day" ? (
              <>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Week View
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Day View
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, viewMode === "day" ? -1 : -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
                >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(selectedDate, viewMode === "day" ? 1 : 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
              </div>
            </div>
            
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="w-full lg:w-80 bg-white rounded-lg border p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md"
            components={{
              DayContent: (props) => renderCalendarDay(props),
            }}
          />
            </div>
        
        <div className="flex-1 w-full min-w-0">
          {viewMode === "day" ? renderDayView() : renderWeekView()}
        </div>
      </div>
    </div>
  );
};

export default CalendarView; 