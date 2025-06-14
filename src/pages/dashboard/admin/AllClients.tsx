import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface ExtendedClient extends Client {
  first_name: string;
  last_name: string;
  username: string;
  profile_photo_url: string | null;
}

const AllClients: React.FC = () => {
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('type', 'client')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedClients = data.map(client => ({
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        phone: client.phone,
        username: client.username,
        role: client.type as 'client' | 'admin',
        created_at: client.created_at,
        profile_photo_url: client.profile_photo_url
      }));

      setClients(formattedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading clients...</div>;
  }

  // Mobile card view component
  const MobileClientCard: React.FC<{ client: ExtendedClient }> = ({ client }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar>
            <AvatarImage src={client.profile_photo_url || undefined} />
            <AvatarFallback>
              {client.first_name?.[0]}{client.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium">{client.name}</div>
            <div className="text-sm text-gray-500">{client.username}</div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email:</span>
            <span>{client.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Phone:</span>
            <span>{client.phone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Role:</span>
            <span className="capitalize">{client.role}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Joined:</span>
            <span>{format(new Date(client.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">All Clients</h2>
      
      {/* Mobile View */}
      <div className="sm:hidden">
        {clients.map((client) => (
          <MobileClientCard key={client.id} client={client} />
        ))}
        {clients.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No clients found
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sign-up Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={client.profile_photo_url || undefined} />
                    <AvatarFallback>
                      {client.first_name?.[0]}{client.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.username}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell className="capitalize">{client.role}</TableCell>
                <TableCell>
                  {format(new Date(client.created_at), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No clients found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AllClients; 