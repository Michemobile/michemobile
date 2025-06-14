import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Professional, Service } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ExtendedProfessional extends Professional {
  first_name: string;
  last_name: string;
  username: string;
  profile_photo_url: string | null;
  service_area: string;
  service_radius: number;
  travel_fee: number | null;
  years_experience: string;
  bio: string;
  verified: boolean;
  is_approved: boolean;
  is_onboarding_complete: boolean;
  image: string | null;
  created_at: string;
  updated_at: string;
}

const AllProfessionals: React.FC = () => {
  const [professionals, setProfessionals] = useState<ExtendedProfessional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const { data: profsData, error: profsError } = await supabase
        .from('professionals')
        .select(`
          *,
          profiles:profile_id(*)
        `);

      if (profsError) throw profsError;

      // Get services for each professional
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .in('professional_id', profsData.map(p => p.id));

      if (servicesError) throw servicesError;

      // Combine the data
      const combinedData = profsData.map(prof => {
        const profile = prof.profiles;
        const services = servicesData.filter(s => s.professional_id === prof.id);
        
        return {
          id: prof.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          phone: profile.phone,
          username: profile.username,
          profile_photo_url: profile.profile_photo_url,
          location: prof.service_area,
          service_area: prof.service_area,
          service_radius: prof.service_radius,
          travel_fee: prof.travel_fee,
          years_experience: prof.years_experience,
          bio: prof.bio,
          verified: prof.verified,
          is_approved: prof.is_approved,
          is_onboarding_complete: prof.is_onboarding_complete,
          image: prof.image,
          services: services,
          stripe_account_id: prof.stripe_account_id,
          created_at: prof.created_at,
          updated_at: prof.updated_at
        };
      });

      setProfessionals(combinedData);
    } catch (error) {
      console.error('Error fetching professionals:', error);
    } finally {
      setLoading(false);
    }
  };

  const ServicesList: React.FC<{ services: Service[] }> = ({ services }) => {
    if (services.length === 0) return <span>No services</span>;

    return (
      <div className="space-y-2">
        {services.map((service) => (
          <div key={service.id} className="flex justify-between items-center">
            <div>
              <div className="font-medium">{service.name}</div>
              <div className="text-sm text-gray-500">{service.description}</div>
            </div>
            <div className="text-sm">
              ${service.price} - {service.duration}min
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Mobile card view component
  const MobileProfessionalCard: React.FC<{ professional: ExtendedProfessional }> = ({ professional }) => (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={professional.profile_photo_url || professional.image || undefined} />
            <AvatarFallback>
              {professional.first_name?.[0]}{professional.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{professional.name}</CardTitle>
            <div className="text-sm text-gray-500">{professional.username}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="contact">
            <AccordionTrigger>Contact Information</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email:</span>
                  <span>{professional.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phone:</span>
                  <span>{professional.phone}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="location">
            <AccordionTrigger>Location & Coverage</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Area:</span>
                  <span>{professional.service_area}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Coverage:</span>
                  <span>{professional.service_radius}mi radius</span>
                </div>
                {professional.travel_fee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Travel Fee:</span>
                    <span>${professional.travel_fee}</span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="services">
            <AccordionTrigger>Services ({professional.services.length})</AccordionTrigger>
            <AccordionContent>
              <ServicesList services={professional.services} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-wrap gap-2">
          {professional.verified && (
            <Badge variant="secondary">Verified</Badge>
          )}
          {professional.is_approved ? (
            <Badge variant="secondary">Approved</Badge>
          ) : (
            <Badge variant="destructive">Pending Approval</Badge>
          )}
          {professional.is_onboarding_complete ? (
            <Badge variant="outline">Onboarding Complete</Badge>
          ) : (
            <Badge variant="outline">Incomplete Onboarding</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-4">Loading professionals...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">All Professionals</h2>
      
      {/* Mobile View */}
      <div className="sm:hidden">
        {professionals.map((professional) => (
          <MobileProfessionalCard key={professional.id} professional={professional} />
        ))}
        {professionals.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No professionals found
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
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Services</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professionals.map((professional) => (
              <TableRow key={professional.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={professional.profile_photo_url || professional.image || undefined} />
                    <AvatarFallback>
                      {professional.first_name?.[0]}{professional.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div>{professional.name}</div>
                  <div className="text-sm text-gray-500">{professional.username}</div>
                </TableCell>
                <TableCell>
                  <div>{professional.email}</div>
                  <div className="text-sm text-gray-500">{professional.phone}</div>
                </TableCell>
                <TableCell>
                  <div>{professional.service_area}</div>
                  <div className="text-sm text-gray-500">
                    {professional.service_radius}mi radius
                    {professional.travel_fee && ` • $${professional.travel_fee} travel fee`}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{professional.years_experience}</div>
                  {professional.verified && (
                    <Badge variant="secondary" className="mt-1">Verified</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {professional.is_approved ? (
                      <Badge variant="secondary">Approved</Badge>
                    ) : (
                      <Badge variant="destructive">Pending Approval</Badge>
                    )}
                    {professional.is_onboarding_complete ? (
                      <Badge variant="outline" className="ml-1">Onboarding Complete</Badge>
                    ) : (
                      <Badge variant="outline" className="ml-1">Incomplete Onboarding</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {professional.services.length} Services
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <ServicesList services={professional.services} />
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
            {professionals.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No professionals found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AllProfessionals; 