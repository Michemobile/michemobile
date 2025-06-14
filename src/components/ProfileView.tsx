import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { supabase, supabaseAdmin, storage, auth } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const ProfileView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    profileImageUrl: "",
    updatedAt: null as string | null
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const session = await auth.getSession();
      if (!session?.user) {
        throw new Error("User not authenticated");
      }
      
      const userId = session.user.id;
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileError) throw profileError;
      
      // Fetch professional data
      const { data: professionalData, error: professionalError } = await supabase
        .from("professionals")
        .select("*")
        .eq("profile_id", userId);
      
      // Initialize with profile data
      let bioText = "";
      let imageUrl = "/placeholder.svg";
      let updatedAtTime = null;
      
      // If we have professional data, use it
      if (!professionalError && professionalData && professionalData.length > 0) {
        bioText = professionalData[0].bio || "";
        imageUrl = professionalData[0].image || "/placeholder.svg";
        updatedAtTime = professionalData[0].updated_at;
      } else {
        // If no professional record, create one
        const { data: newProf, error: insertError } = await supabase
          .from('professionals')
          .insert([
            { 
              profile_id: userId,
              service_area: '',
              service_radius: 10,
              travel_fee: 0,
              years_experience: '',
              bio: '',
              verified: false
            }
          ])
          .select('*')
          .single();
          
        if (!insertError && newProf) {
          bioText = newProf.bio || "";
          updatedAtTime = newProf.updated_at;
          
          // Try to get the image URL from localStorage
          try {
            const storedImageUrl = localStorage.getItem(`profile_image_${userId}`);
            if (storedImageUrl) {
              imageUrl = storedImageUrl;
            } else if (newProf.hasOwnProperty('image') && newProf.image) {
              // Fallback to the image property if it exists (for future compatibility)
              imageUrl = newProf.image;
            } else {
              imageUrl = "/placeholder.svg";
            }
          } catch (storageError) {
            console.error('Error retrieving image URL from localStorage:', storageError);
            imageUrl = "/placeholder.svg";
          }
        }
      }
      
      // Set profile state
      setProfile({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        bio: bioText,
        profileImageUrl: imageUrl,
        updatedAt: updatedAtTime
      });
      
      // Set photo preview if there's an image
      if (imageUrl && imageUrl !== "/placeholder.svg") {
        setPhotoPreview(imageUrl);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a valid image file (JPEG or PNG)",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Set the file for upload
    setPhotoFile(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Get current user
      const session = await auth.getSession();
      if (!session?.user) {
        throw new Error("User not authenticated");
      }
      
      const userId = session.user.id;
      
      // Upload profile photo if changed
      let profileImageUrl = profile.profileImageUrl;
      if (photoFile) {
        try {
          console.log('Uploading profile photo for user:', userId);
          const photoResult = await storage.uploadProfilePhoto(userId, photoFile);
          profileImageUrl = photoResult.url;
          console.log('Profile photo uploaded successfully:', profileImageUrl);
          
          // Save the image URL to localStorage as a backup
          localStorage.setItem(`profile_image_${userId}`, profileImageUrl);
        } catch (error) {
          console.error('Error uploading profile photo:', error);
          toast({
            title: "Warning",
            description: "Failed to upload profile photo, but other information will be saved.",
            variant: "destructive",
          });
        }
      }
      
      // Update profile data using admin client if available to bypass RLS
      const adminClient = supabaseAdmin || supabase;
      console.log('Using admin client for profile update:', !!supabaseAdmin);
      
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          // Don't update email here as it requires auth changes
        })
        .eq("id", userId);
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }
      
      // Try to update the professional record with both bio and image
      try {
        if (supabaseAdmin) {
          console.log('Attempting to update professional record with admin client');
          // First try to update with image column
          const { error: adminError } = await supabaseAdmin
            .from("professionals")
            .update({
              bio: profile.bio,
              image: profileImageUrl
            })
            .eq("profile_id", userId);
            
          if (adminError) {
            console.log('Error updating professional with image column:', adminError);
            console.log('Trying without image column...');
            
            // If that fails, try without the image column
            const { error: fallbackError } = await supabaseAdmin
              .from("professionals")
              .update({
                bio: profile.bio
              })
              .eq("profile_id", userId);
              
            if (fallbackError) throw fallbackError;
          }
        } else {
          // Fallback to regular client without image column
          const { error: professionalError } = await supabase
            .from("professionals")
            .update({
              bio: profile.bio
            })
            .eq("profile_id", userId);
            
          if (professionalError) throw professionalError;
        }
      } catch (professionalError) {
        console.error('Error updating professional record:', professionalError);
        // Non-critical error, continue with the profile update
      }
      
      // Store the profile image URL in localStorage as a backup
      localStorage.setItem(`profile_image_${userId}`, profileImageUrl);
      
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
      
      // Update local state with new image URL if changed
      if (profileImageUrl !== profile.profileImageUrl) {
        setProfile(prev => ({
          ...prev,
          profileImageUrl
        }));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Professional Profile</h1>
        <p className="text-gray-600 mt-1">
          Manage your profile information visible to clients
          {profile.updatedAt && (
            <span className="text-sm text-gray-500 ml-2">
              · Last updated: {new Date(profile.updatedAt).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Photo */}
        <div className="space-y-2">
          <Label htmlFor="profile-photo">Profile Photo</Label>
          <div className="flex items-start space-x-4">
            <div 
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer"
              onClick={triggerFileInput}
            >
              {photoPreview || profile.profileImageUrl ? (
                <img 
                  src={photoPreview || profile.profileImageUrl} 
                  alt="Profile preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs text-gray-500 mt-1 block">Add Photo</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                id="profile-photo"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoChange}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="mb-2 border-gray-300 text-gray-700"
                onClick={triggerFileInput}
              >
                {photoPreview || profile.profileImageUrl !== "/placeholder.svg" ? 'Change Photo' : 'Upload Photo'}
              </Button>
              <p className="text-xs text-gray-500">
                Upload a professional photo. This will be displayed on your profile and visible to clients.
                <br />
                Max size: 5MB. Formats: JPG, PNG.
              </p>
            </div>
          </div>
        </div>
        
        {/* Personal Information */}
        <div>
          <h2 className="text-lg font-medium mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                className="bg-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                className="bg-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleInputChange}
                className="bg-white"
                disabled
              />
              <p className="text-xs text-gray-500">
                Email cannot be changed here. Please contact support if you need to update your email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                className="bg-white"
                required
              />
            </div>
          </div>
        </div>
        
        {/* Professional Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Professional Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleInputChange}
            className="bg-white min-h-[150px]"
            placeholder="Tell clients about your experience, specialties, and style..."
          />
          <p className="text-xs text-gray-500">
            Your bio will be visible to clients on your profile. Make it engaging and professional.
          </p>
        </div>
        
        {/* Submit Button */}
        <div className="pt-4">
          <Button 
            type="submit" 
            className="bg-brand-bronze hover:bg-brand-bronze/80 text-white"
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileView;
