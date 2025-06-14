import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { auth, supabase, supabaseAdmin } from '@/lib/supabase';
import { Clock, Save, Plus, Trash2, Calendar, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BlockedTimeSlotsManager from './BlockedTimeSlotsManager';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

// Define types for working hours
type WorkingDay = {
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
};

type ServiceTime = {
  id: string;
  service_id: string;
  name: string;
  duration: number;
  buffer_time: number;
};

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const DEFAULT_WORKING_HOURS: WorkingDay[] = DAYS_OF_WEEK.map(day => ({
  day,
  isWorking: day !== 'Saturday' && day !== 'Sunday',
  startTime: '09:00',
  endTime: '17:00'
}));

const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      times.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return times;
};

const WorkingHoursView = () => {
  const [workingHours, setWorkingHours] = useState<WorkingDay[]>(DEFAULT_WORKING_HOURS);
  const [serviceTimes, setServiceTimes] = useState<ServiceTime[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('weekly');
  const { toast } = useToast();

  useEffect(() => {
    fetchProfessionalId().then(() => {
      fetchWorkingHours();
      fetchServices();
    });
  }, []);
  
  const fetchProfessionalId = async () => {
    try {
      // Get current user
      const session = await auth.getSession();
      if (!session?.user) return;
      
      const userId = session.user.id;
      
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
        return;
      }
      
      if (professionalData) {
        console.log("Found professional ID:", professionalData.id);
        setProfessionalId(professionalData.id);
      }
    } catch (error) {
      console.error("Error in fetchProfessionalId:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWorkingHours = async () => {
    try {
      if (!professionalId) return;
      
      setLoading(true);
      
      // Fetch working hours if they exist
      const { data: hoursData, error: hoursError } = await supabase
        .from('professional_hours')
        .select('*')
        .eq('professional_id', professionalId);

      if (hoursError) {
        console.error('Error fetching working hours:', hoursError);
        toast({
          title: "Error",
          description: "Failed to load your working hours. Please try again.",
          variant: "destructive",
        });
      } else if (hoursData && hoursData.length > 0) {
        // Transform data to our format
        const formattedHours = DAYS_OF_WEEK.map(day => {
          const dayData = hoursData.find(h => h.day.toLowerCase() === day.toLowerCase());
          return {
            day,
            isWorking: dayData ? dayData.is_working : day !== 'Saturday' && day !== 'Sunday',
            startTime: dayData ? dayData.start_time : '09:00',
            endTime: dayData ? dayData.end_time : '17:00'
          };
        });
        setWorkingHours(formattedHours);
      }
    } catch (error) {
      console.error('Error in fetchWorkingHours:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchServices = async () => {
    try {
      if (!professionalId) return;
      
      setLoading(true);
      
      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', professionalId);
      
      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        toast({
          title: "Error",
          description: "Failed to load your services. Please try again.",
          variant: "destructive",
        });
      } else {
        setServices(servicesData || []);
      }
      
      // Fetch service times
      const { data: serviceTimesData, error: serviceTimesError } = await supabase
        .from('service_times')
        .select('*, services(name)')
        .eq('professional_id', professionalId);
      
      if (serviceTimesError) {
        console.error('Error fetching service times:', serviceTimesError);
      } else if (serviceTimesData) {
        const formattedServiceTimes = serviceTimesData.map(st => ({
          id: st.id,
          service_id: st.service_id,
          name: st.services?.name || 'Unknown Service',
          duration: st.duration || 60,
          buffer_time: st.buffer_time || 0
        }));
        setServiceTimes(formattedServiceTimes);
      }
    } catch (error) {
      console.error('Error in fetchServices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkingDayToggle = (index: number, isWorking: boolean) => {
    const updatedHours = [...workingHours];
    updatedHours[index].isWorking = isWorking;
    setWorkingHours(updatedHours);
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const updatedHours = [...workingHours];
    updatedHours[index][field] = value;
    setWorkingHours(updatedHours);
  };

  const handleServiceTimeChange = (index: number, field: 'duration' | 'buffer_time', value: number) => {
    const updatedServiceTimes = [...serviceTimes];
    updatedServiceTimes[index][field] = value;
    setServiceTimes(updatedServiceTimes);
  };

  const handleRemoveServiceTime = (id: string) => {
    setServiceTimes(serviceTimes.filter(st => st.id !== id));
  };

  const handleAddServiceTime = (serviceId: string | null) => {
    if (!serviceId) return;
    
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    const newServiceTime: ServiceTime = {
      id: `temp-${Date.now()}`,
      service_id: service.id,
      name: service.name,
      duration: 60,
      buffer_time: 15
    };
    
    setServiceTimes([...serviceTimes, newServiceTime]);
  };

  const saveWorkingHours = async () => {
    if (!professionalId) {
      toast({
        title: "Error",
        description: "Professional profile not found. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Use admin client if available
      const adminClient = supabaseAdmin || supabase;
      
      // First, delete existing hours
      const { error: deleteError } = await adminClient
        .from('professional_hours')
        .delete()
        .eq('professional_id', professionalId);
      
      if (deleteError) {
        console.error('Error deleting existing hours:', deleteError);
        throw deleteError;
      }
      
      // Then insert new hours
      const hoursToInsert = workingHours.map(day => ({
        professional_id: professionalId,
        day: day.day,
        is_working: day.isWorking,
        start_time: day.startTime,
        end_time: day.endTime
      }));
      
      const { error: insertError } = await adminClient
        .from('professional_hours')
        .insert(hoursToInsert);
      
      if (insertError) {
        console.error('Error inserting hours:', insertError);
        throw insertError;
      }
      
      toast({
        title: "Success",
        description: "Your working hours have been saved.",
      });
    } catch (error) {
      console.error('Error saving working hours:', error);
      toast({
        title: "Error",
        description: "Failed to save your working hours. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveServiceTimes = async () => {
    if (!professionalId) {
      toast({
        title: "Error",
        description: "Professional profile not found. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Use admin client if available
      const adminClient = supabaseAdmin || supabase;
      
      // First, delete existing service times
      const { error: deleteError } = await adminClient
        .from('service_times')
        .delete()
        .eq('professional_id', professionalId);
      
      if (deleteError) {
        console.error('Error deleting existing service times:', deleteError);
        throw deleteError;
      }
      
      // Then insert new service times
      const timesToInsert = serviceTimes.map(st => ({
        professional_id: professionalId,
        service_id: st.service_id,
        duration: st.duration,
        buffer_time: st.buffer_time
      }));
      
      const { error: insertError } = await adminClient
        .from('service_times')
        .insert(timesToInsert);
      
      if (insertError) {
        console.error('Error inserting service times:', insertError);
        throw insertError;
      }
      
      toast({
        title: "Success",
        description: "Your service times have been saved.",
      });
    } catch (error) {
      console.error('Error saving service times:', error);
      toast({
        title: "Error",
        description: "Failed to save your service times. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="weekly" className="flex-col sm:flex-row p-2 sm:p-3">
            <Clock className="h-4 w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Weekly Hours</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex-col sm:flex-row p-2 sm:p-3">
            <Calendar className="h-4 w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Service Times</span>
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex-col sm:flex-row p-2 sm:p-3">
            <X className="h-4 w-4 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-xs sm:text-sm">Block Time Slots</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Set Your Weekly Working Hours</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {workingHours.map((day, index) => (
                      <div key={day.day} className="p-4 border rounded-lg space-y-3 sm:space-y-0">
                        {/* Mobile Layout: Stacked */}
                        <div className="flex flex-col sm:hidden space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{day.day}</div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={day.isWorking}
                                onCheckedChange={(checked) => handleWorkingDayToggle(index, checked)}
                              />
                              <span className="text-sm text-gray-500">
                                {day.isWorking ? 'Working' : 'Not Working'}
                              </span>
                            </div>
                          </div>
                          
                          {day.isWorking && (
                            <div className="flex items-center space-x-2">
                              <Select
                                value={day.startTime}
                                onValueChange={(value) => handleTimeChange(index, 'startTime', value)}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Start" />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map(time => (
                                    <SelectItem key={`start-${day.day}-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <span className="text-gray-500 px-2">to</span>
                              
                              <Select
                                value={day.endTime}
                                onValueChange={(value) => handleTimeChange(index, 'endTime', value)}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="End" />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map(time => (
                                    <SelectItem key={`end-${day.day}-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Desktop Layout: Side by side */}
                        <div className="hidden sm:flex sm:items-center sm:justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="font-medium w-28">{day.day}</div>
                            <Switch
                              checked={day.isWorking}
                              onCheckedChange={(checked) => handleWorkingDayToggle(index, checked)}
                            />
                            <span className="text-sm text-gray-500">
                              {day.isWorking ? 'Working' : 'Not Working'}
                            </span>
                          </div>
                          
                          {day.isWorking && (
                            <div className="flex items-center space-x-2">
                              <Select
                                value={day.startTime}
                                onValueChange={(value) => handleTimeChange(index, 'startTime', value)}
                              >
                                <SelectTrigger className="w-[110px]">
                                  <SelectValue placeholder="Start" />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map(time => (
                                    <SelectItem key={`start-${day.day}-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <span className="text-gray-500">to</span>
                              
                              <Select
                                value={day.endTime}
                                onValueChange={(value) => handleTimeChange(index, 'endTime', value)}
                              >
                                <SelectTrigger className="w-[110px]">
                                  <SelectValue placeholder="End" />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeOptions().map(time => (
                                    <SelectItem key={`end-${day.day}-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full mt-4 sm:mt-6 h-12 sm:h-10" 
                    onClick={saveWorkingHours}
                    disabled={saving}
                  >
                    {saving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    <span className="text-sm sm:text-base">Save Working Hours</span>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="services" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Service Duration & Buffer Times</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {serviceTimes.map((service, index) => (
                      <div key={service.id} className="p-4 border rounded-lg space-y-3 sm:space-y-0">
                        {/* Mobile Layout: Stacked */}
                        <div className="flex flex-col sm:hidden space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{service.name}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveServiceTime(service.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`duration-${service.id}`} className="text-sm text-gray-500">
                                Duration (min)
                              </Label>
                              <Input
                                id={`duration-${service.id}`}
                                type="number"
                                value={service.duration}
                                onChange={(e) => handleServiceTimeChange(index, 'duration', parseInt(e.target.value))}
                                className="w-full mt-1"
                                min={15}
                                step={15}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`buffer-${service.id}`} className="text-sm text-gray-500">
                                Buffer (min)
                              </Label>
                              <Input
                                id={`buffer-${service.id}`}
                                type="number"
                                value={service.buffer_time}
                                onChange={(e) => handleServiceTimeChange(index, 'buffer_time', parseInt(e.target.value))}
                                className="w-full mt-1"
                                min={0}
                                step={5}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout: Side by side */}
                        <div className="hidden sm:flex sm:items-center sm:justify-between">
                          <div className="font-medium">{service.name}</div>
                          <div className="flex items-center space-x-4">
                            <div>
                              <Label htmlFor={`duration-${service.id}`} className="text-sm text-gray-500">
                                Duration (min)
                              </Label>
                              <Input
                                id={`duration-${service.id}`}
                                type="number"
                                value={service.duration}
                                onChange={(e) => handleServiceTimeChange(index, 'duration', parseInt(e.target.value))}
                                className="w-20"
                                min={15}
                                step={15}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`buffer-${service.id}`} className="text-sm text-gray-500">
                                Buffer (min)
                              </Label>
                              <Input
                                id={`buffer-${service.id}`}
                                type="number"
                                value={service.buffer_time}
                                onChange={(e) => handleServiceTimeChange(index, 'buffer_time', parseInt(e.target.value))}
                                className="w-20"
                                min={0}
                                step={5}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveServiceTime(service.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {services.length > 0 && services.length !== serviceTimes.length && (
                      <div className="mt-4">
                        <Label htmlFor="add-service">Add Service Time</Label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-1">
                          <Select onValueChange={handleAddServiceTime}>
                            <SelectTrigger id="add-service" className="w-full">
                              <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                            <SelectContent>
                              {services
                                .filter(s => !serviceTimes.some(st => st.service_id === s.id))
                                .map(service => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            onClick={() => handleAddServiceTime(null)}
                            className="w-full sm:w-auto"
                          >
                            <Plus className="h-4 w-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Add Service</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full mt-4 sm:mt-6 h-12 sm:h-10" 
                    onClick={saveServiceTimes}
                    disabled={saving}
                  >
                    {saving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    <span className="text-sm sm:text-base">Save Service Times</span>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="blocked" className="mt-4 sm:mt-6">
          <BlockedTimeSlotsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkingHoursView;
