import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Trash2, ImagePlus, Pencil, X, Check } from "lucide-react";
import { api, storage, supabase } from "@/lib/supabase";

interface WorkPhoto {
  id: string;
  professional_id: string;
  url: string;
  caption: string;
  order_index: number;
}

const PortfolioView = () => {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<WorkPhoto[]>([]);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [draggedItem, setDraggedItem] = useState<WorkPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfessionalData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("No authenticated user found");
        }
        
        // Get professional ID from profile ID
        const { data, error } = await supabase
          .from('professionals')
          .select('id')
          .eq('profile_id', user.id);
        
        let profId;
        
        // If we found a professional record, use it
        if (!error && data && data.length > 0) {
          profId = data[0].id;
          setProfessionalId(profId);
        } else {
          // If no professional record exists, create one
          const { data: newProf, error: insertError } = await supabase
            .from('professionals')
            .insert([
              { 
                profile_id: user.id,
                service_area: '',
                service_radius: 10,
                travel_fee: 0,
                years_experience: '',
                bio: '',
                verified: false
              }
            ])
            .select('id')
            .single();
          
          if (insertError) throw insertError;
          
          profId = newProf.id;
          setProfessionalId(profId);
        }
        
        // Fetch work photos
        await fetchWorkPhotos(profId);
      } catch (error) {
        console.error("Error fetching professional data:", error);
        toast({
          title: "Error",
          description: "Failed to load portfolio data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfessionalData();
  }, []);
  
  const fetchWorkPhotos = async (profId: string) => {
    try {
      const workPhotos = await api.getWorkPhotos(profId);
      setPhotos(workPhotos || []);
    } catch (error) {
      console.error("Error fetching work photos:", error);
      toast({
        title: "Error",
        description: "Failed to load portfolio photos. Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !professionalId) return;
    
    try {
      setUploading(true);
      
      // Upload the work photo
      const result = await storage.uploadWorkPhoto(
        professionalId,
        file,
        newPhotoCaption || "My work"
      );
      
      // Add the work photo to the database
      const newPhoto = await api.addWorkPhoto({
        professional_id: professionalId,
        url: result.url,
        caption: result.caption,
        order_index: photos.length
      });
      
      // Refresh the photos list
      await fetchWorkPhotos(professionalId);
      
      // Reset the form
      setNewPhotoCaption("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      toast({
        title: "Success",
        description: "Photo uploaded successfully!",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeletePhoto = async (photoId: string) => {
    if (!professionalId) return;
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('work_photos')
        .delete()
        .eq('id', photoId);
      
      if (error) throw error;
      
      // Update local state
      setPhotos(photos.filter(photo => photo.id !== photoId));
      
      toast({
        title: "Success",
        description: "Photo deleted successfully!",
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your photo. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const startEditingCaption = (photo: WorkPhoto) => {
    setEditingPhotoId(photo.id);
    setEditedCaption(photo.caption);
  };
  
  const cancelEditingCaption = () => {
    setEditingPhotoId(null);
    setEditedCaption("");
  };
  
  const saveEditedCaption = async (photoId: string) => {
    if (!professionalId) return;
    
    try {
      // Update in database
      const { error } = await supabase
        .from('work_photos')
        .update({ caption: editedCaption })
        .eq('id', photoId);
      
      if (error) throw error;
      
      // Update local state
      setPhotos(photos.map(photo => 
        photo.id === photoId ? { ...photo, caption: editedCaption } : photo
      ));
      
      // Reset editing state
      setEditingPhotoId(null);
      setEditedCaption("");
      
      toast({
        title: "Success",
        description: "Caption updated successfully!",
      });
    } catch (error) {
      console.error("Error updating caption:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the caption. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDragStart = (photo: WorkPhoto) => {
    setDraggedItem(photo);
  };
  
  const handleDragOver = (e: React.DragEvent, targetPhoto: WorkPhoto) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetPhoto.id) return;
    
    // Create a new array with the updated order
    const newPhotos = [...photos];
    const draggedIndex = newPhotos.findIndex(p => p.id === draggedItem.id);
    const targetIndex = newPhotos.findIndex(p => p.id === targetPhoto.id);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove the dragged item
      const [removed] = newPhotos.splice(draggedIndex, 1);
      // Insert it at the target position
      newPhotos.splice(targetIndex, 0, removed);
      
      // Update the order_index for all photos
      const updatedPhotos = newPhotos.map((photo, index) => ({
        ...photo,
        order_index: index
      }));
      
      setPhotos(updatedPhotos);
    }
  };
  
  const handleDragEnd = async () => {
    if (!professionalId || !draggedItem) return;
    setDraggedItem(null);
    
    try {
      // Update the order_index for all photos in the database
      for (const photo of photos) {
        await supabase
          .from('work_photos')
          .update({ order_index: photo.order_index })
          .eq('id', photo.id);
      }
    } catch (error) {
      console.error("Error updating photo order:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the photo order. Please try again.",
        variant: "destructive",
      });
      
      // Refresh the photos to get the original order
      if (professionalId) {
        await fetchWorkPhotos(professionalId);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-brand-bronze" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Portfolio Management</h1>
      </div>
      
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium mb-4 text-gray-800">Upload New Photo</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="photoCaption">Photo Caption</Label>
            <Input
              id="photoCaption"
              placeholder="Describe this work sample..."
              value={newPhotoCaption}
              onChange={(e) => setNewPhotoCaption(e.target.value)}
              className="mt-1 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button 
              onClick={handleFileSelect}
              disabled={uploading}
              className="flex-grow"
            >
              {uploading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Select & Upload Photo
                </>
              )}
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            Upload high-quality images that showcase your best work. Recommended size: 1080x1080px or larger.
            Maximum file size: 5MB per image.
          </p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium mb-4 text-gray-800">Your Portfolio Photos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop photos to reorder them. The first photo will be displayed as your main portfolio image.
        </p>
        
        {photos.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <ImagePlus className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">No portfolio photos yet</p>
            <p className="text-sm text-gray-400">Upload photos to showcase your work</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(photo)}
                onDragOver={(e) => handleDragOver(e, photo)}
                onDragEnd={handleDragEnd}
                className={`relative group border rounded-md overflow-hidden cursor-move ${
                  draggedItem?.id === photo.id ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <div className="aspect-square">
                  <img 
                    src={photo.url} 
                    alt={photo.caption} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-70">
                    {editingPhotoId === photo.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editedCaption}
                          onChange={(e) => setEditedCaption(e.target.value)}
                          className="text-white bg-transparent border-gray-600 text-sm py-1 h-8"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:text-green-400"
                          onClick={() => saveEditedCaption(photo.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:text-red-400"
                          onClick={cancelEditingCaption}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm truncate pr-2">{photo.caption}</p>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-white hover:text-blue-400"
                            onClick={() => startEditingCaption(photo)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-white hover:text-red-400"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioView;
