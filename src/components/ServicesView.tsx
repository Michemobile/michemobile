import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { auth, supabase } from '@/lib/supabase';

// Define service form state type
type ServiceFormState = {
  name: string;
  description: string;
  price: number | null;
  duration: number | null;
};

// Define service type with stripe_price_id
type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  bookings: number;
  stripe_price_id?: string;
};

// Function to create a Stripe price
const createStripePrice = async (serviceData: {
  name: string;
  price: number;
  description: string;
  professionalId: string;
  serviceId: string;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session found');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-price`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(serviceData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create Stripe price');
  }

  return response.json();
};

export default function ServicesView() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<ServiceFormState>({
    name: '',
    description: '',
    price: null,
    duration: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  // State for edit dialog
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // State for delete confirmation
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch professional ID on component mount
  useEffect(() => {
    const fetchProfessionalId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: professional, error } = await supabase
          .from('professionals')
          .select('id')
          .eq('profile_id', user.id)
          .single();

        if (error) throw error;
        if (!professional) throw new Error('No professional profile found');

        setProfessionalId(professional.id);
      } catch (err: any) {
        console.error('Error fetching professional:', err);
        setError(err.message);
      }
    };

    fetchProfessionalId();
  }, []);

  // Fetch professional's services
  const fetchServices = async (profId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          bookings:bookings(count)
        `)
        .eq('professional_id', profId);

      if (servicesError) throw servicesError;

      // Transform the data to match the Service type
      const transformedServices = servicesData.map(service => ({
        ...service,
        bookings: service.bookings?.[0]?.count || 0
      }));

      setServices(transformedServices);
    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load services"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch services when professionalId is available
  useEffect(() => {
    if (professionalId) {
      fetchServices(professionalId);
    }
  }, [professionalId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!professionalId) throw new Error('Professional ID not found');
      if (!formState.price) throw new Error('Price is required');

      // First create the service in your database
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
          name: formState.name,
          description: formState.description,
          price: formState.price,
          duration: formState.duration,
          professional_id: professionalId
        })
        .select()
        .single();

      if (serviceError) throw serviceError;
      if (!service) throw new Error('Failed to create service');

      // Then create the Stripe price
      const { priceId } = await createStripePrice({
        name: formState.name,
        price: formState.price,
        description: formState.description,
        professionalId,
        serviceId: service.id
      });

      // Update the service with the Stripe price ID
      const { error: updateError } = await supabase
        .from('services')
        .update({ stripe_price_id: priceId })
        .eq('id', service.id);

      if (updateError) throw updateError;

      // Add the new service to the list
      setServices(prev => [...prev, { ...service, bookings: 0, stripe_price_id: priceId }]);
      
      // Reset form and close dialog
      setFormState({
        name: '',
        description: '',
        price: null,
        duration: null
      });
      setIsDialogOpen(false);

      toast({
        title: "Success",
        description: "Service created successfully",
      });
    } catch (err: any) {
      console.error('Error creating service:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to create service",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to update service price in Stripe
  const updateStripePrice = async (serviceData: {
    name: string;
    price: number;
    description: string;
    professionalId: string;
    serviceId: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-stripe-price`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(serviceData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update Stripe price');
    }

    return response.json();
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !professionalId) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formState.price) throw new Error('Price is required');

      // Update the service in your database
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .update({
          name: formState.name,
          description: formState.description,
          price: formState.price,
          duration: formState.duration
        })
        .eq('id', editingService.id)
        .select()
        .single();

      if (serviceError) throw serviceError;
      if (!service) throw new Error('Failed to update service');

      // Update the Stripe price if price has changed
      if (service.price !== editingService.price) {
        const { priceId } = await updateStripePrice({
          name: formState.name,
          price: formState.price,
          description: formState.description,
          professionalId,
          serviceId: editingService.id
        });

        // Update the service with new Stripe price ID
        const { error: updateError } = await supabase
          .from('services')
          .update({ stripe_price_id: priceId })
          .eq('id', editingService.id);

        if (updateError) throw updateError;
        service.stripe_price_id = priceId;
      }

      // Update the service in the list
      setServices(prev => prev.map(s => 
        s.id === service.id 
          ? { ...service, bookings: s.bookings } 
          : s
      ));
      
      // Reset form and close dialog
      setFormState({
        name: '',
        description: '',
        price: null,
        duration: null
      });
      setIsEditDialogOpen(false);
      setEditingService(null);

      toast({
        title: "Success",
        description: "Service updated successfully",
      });
    } catch (err: any) {
      console.error('Error updating service:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update service",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to open edit dialog
  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormState({
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration
    });
    setIsEditDialogOpen(true);
  };

  // Function to delete a service from both database and Stripe
  const deleteStripeService = async (serviceData: {
    serviceId: string;
    professionalId: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-stripe-service`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(serviceData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete service');
    }

    return response.json();
  };

  // Handle service deletion
  const handleDelete = async () => {
    if (!deletingService || !professionalId) return;
    
    setIsDeleting(true);
    setError(null);

    try {
      // Delete from both database and Stripe
      await deleteStripeService({
        serviceId: deletingService.id,
        professionalId
      });

      // Remove the service from the local state
      setServices(prev => prev.filter(s => s.id !== deletingService.id));
      
      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setDeletingService(null);

      toast({
        title: "Success",
        description: "Service deleted successfully from both database and Stripe",
      });
    } catch (err: any) {
      console.error('Error deleting service:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete service",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to open delete confirmation dialog
  const handleDeleteClick = (service: Service) => {
    setDeletingService(service);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white text-black border border-gray-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Your Services</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                  <DialogDescription>
                    Add a new service to your profile. This will also create a payment link in your Stripe account.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Service Name</Label>
                      <Input
                        id="name"
                        value={formState.name}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formState.description}
                        onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.price || ''}
                        onChange={(e) => setFormState(prev => ({ ...prev, price: parseFloat(e.target.value) || null }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="0"
                        value={formState.duration || ''}
                        onChange={(e) => setFormState(prev => ({ ...prev, duration: parseInt(e.target.value) || null }))}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Spinner className="mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Service'
                      )}
                    </Button>
                  </DialogFooter>
                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : services.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <p>No services added yet. Click "Add Service" to create your first service.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500">{service.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Tag className="w-4 h-4 mr-1" />
                        ${service.price}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.duration} min
                      </div>
                    </TableCell>
                    <TableCell>{service.bookings}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Service</DialogTitle>
                              <DialogDescription>
                                Update your service details. If you change the price, a new Stripe price will be created.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditSubmit}>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-name">Service Name</Label>
                                  <Input
                                    id="edit-name"
                                    value={formState.name}
                                    onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-description">Description</Label>
                                  <Textarea
                                    id="edit-description"
                                    value={formState.description}
                                    onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-price">Price ($)</Label>
                                  <Input
                                    id="edit-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formState.price || ''}
                                    onChange={(e) => setFormState(prev => ({ ...prev, price: parseFloat(e.target.value) || null }))}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-duration">Duration (minutes)</Label>
                                  <Input
                                    id="edit-duration"
                                    type="number"
                                    min="0"
                                    value={formState.duration || ''}
                                    onChange={(e) => setFormState(prev => ({ ...prev, duration: parseInt(e.target.value) || null }))}
                                    required
                                  />
                                </div>
                              </div>
                              <DialogFooter className="mt-6">
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? (
                                    <>
                                      <Spinner className="mr-2" />
                                      Updating...
                                    </>
                                  ) : (
                                    'Update Service'
                                  )}
                                </Button>
                              </DialogFooter>
                              {error && (
                                <Alert variant="destructive" className="mt-4">
                                  <AlertDescription>{error}</AlertDescription>
                                </Alert>
                              )}
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteClick(service)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Service Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the details of your service. Changes will be reflected in your Stripe account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price || ''}
                  onChange={(e) => setFormState(prev => ({ ...prev, price: parseFloat(e.target.value) || null }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={formState.duration || ''}
                  onChange={(e) => setFormState(prev => ({ ...prev, duration: parseInt(e.target.value) || null }))}
                  required
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Service'
                )}
              </Button>
            </DialogFooter>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingService?.name}"? This will permanently remove the service from both your database and Stripe account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingService(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Service'
              )}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
