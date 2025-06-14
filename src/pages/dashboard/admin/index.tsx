import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AllClients from './AllClients';
import AllProfessionals from './AllProfessionals';
import AllPayments from './AllPayments';
import AllBookings from './AllBookings';
import { Users, Briefcase, CreditCard, Calendar, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto flex items-center gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto w-full gap-4 sm:gap-2">
          <TabsTrigger value="clients" className="flex items-center gap-2 py-4 data-[state=active]:text-primary">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="professionals" className="flex items-center gap-2 py-4 data-[state=active]:text-primary">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Professionals</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 py-4 data-[state=active]:text-primary">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2 py-4 data-[state=active]:text-primary">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4 mt-2">
          <AllClients />
        </TabsContent>

        <TabsContent value="professionals" className="space-y-4 mt-2">
          <AllProfessionals />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 mt-2">
          <AllPayments />
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4 mt-2">
          <AllBookings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard; 