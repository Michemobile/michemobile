import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks for development and debugging
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

// Log environment variables for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Missing')
  console.log('Supabase Service Key:', supabaseServiceKey ? 'Set' : 'Missing')
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

// Regular client for most operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client with service role for operations that need to bypass RLS
// This should be used carefully and only for specific operations
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Types for database tables
export type Profile = {
  id: string
  created_at?: string
  first_name: string
  last_name: string
  email: string
  phone: string
  username: string
  type: 'client' | 'professional'
}

export type CertificationDocument = {
  path: string
  name: string
  type: string
  size: number
}

export type WorkPhoto = {
  id: string
  professional_id: string
  url: string
  caption: string
  order_index: number
  pending_upload?: boolean
}

export type Professional = {
  id: string
  profile_id: string
  created_at?: string
  service_area: string
  service_radius: number
  travel_fee: number | null
  years_experience: string
  bio: string
  verified: boolean
  certifications?: CertificationDocument[]
  insurance?: CertificationDocument | null
  work_photos?: WorkPhoto[]
}

export type Service = {
  id: string
  professional_id: string
  name: string
  price: number
  description: string
  is_custom: boolean
}

export type Booking = {
  id: string
  created_at?: string
  client_id: string
  professional_id: string
  service_id: string
  booking_date: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  location: string
  notes?: string
  total_amount: number
}

// Initialize storage bucket for professional documents
const initializeStorage = async () => {
  try {
    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error checking storage buckets:', listError);
      return false;
    }
    
    // Check for both professional-documents and profiles buckets
    const professionalBucketExists = buckets.some(bucket => bucket.name === 'professional-documents');
    const profilesBucketExists = buckets.some(bucket => bucket.name === 'profiles');
    
    // Create the professional-documents bucket if it doesn't exist
    if (!professionalBucketExists && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin.storage.createBucket('professional-documents', {
          public: true, // Make it public to allow easier access to documents
          fileSizeLimit: 20971520, // 20MB
          allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        });
        
        // Set public access policy for the bucket
        // Note: setPublic is not available in the current version of Supabase JS client
        // The bucket is already set to public during creation
        
        console.log('Created professional-documents storage bucket');
      } catch (bucketError: any) {
        // If the error is just that the bucket already exists, this is fine
        if (bucketError.message && bucketError.message.includes('already exists')) {
          console.log('professional-documents bucket already exists, continuing...');
          // Note: The bucket should already be public from creation
          console.log('Bucket should be public from creation');
        } else {
          console.error('Error creating professional-documents bucket:', bucketError);
        }
      }
    }
    
    // Create the profiles bucket if it doesn't exist
    if (!profilesBucketExists && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin.storage.createBucket('profiles', {
          public: true, // Make it public to allow easier access to profile photos
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg']
        });
        
        // Set public access policy for the bucket
        // Note: setPublic is not available in the current version of Supabase JS client
        // The bucket is already set to public during creation
        
        console.log('Created profiles storage bucket');
      } catch (bucketError: any) {
        // If the error is just that the bucket already exists, this is fine
        if (bucketError.message && bucketError.message.includes('already exists')) {
          console.log('profiles bucket already exists, continuing...');
          // Note: The bucket should already be public from creation
          console.log('Bucket should be public from creation');
        } else {
          console.error('Error creating profiles bucket:', bucketError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Storage initialization error:', error);
    return false;
  }
};

// Try to initialize storage on app load
initializeStorage().catch(console.error);

// Database API functions
export const api = {
  // Client profile functions
  createClientProfile: async (profile: Omit<Profile, 'id' | 'created_at' | 'type'>) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ ...profile, type: 'client' }])
      .select()
    
    if (error) throw error
    return data?.[0] as Profile
  },

  // Professional profile functions
  createProfessionalProfile: async (
    profile: Omit<Profile, 'id' | 'created_at' | 'type'>,
    professionalInfo: Omit<Professional, 'id' | 'profile_id' | 'created_at'>
  ) => {
    try {
      // Get the current user session to ensure we have auth context
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      if (!session) {
        console.error('No active session found when creating professional profile');
      }
      
      // Check if a profile with this email already exists
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('profiles')
        .select('id, type')
        .eq('email', profile.email)
        .maybeSingle();
      
      if (existingProfileError) {
        console.error('Error checking for existing profile:', existingProfileError);
      }
      
      // If profile exists, check if it's already a professional
      if (existingProfile) {
        console.log('Found existing profile with email:', profile.email);
        
        // Check if there's already a professional record for this profile
        const { data: existingProfessional, error: existingProfessionalError } = await supabase
          .from('professionals')
          .select('id')
          .eq('profile_id', existingProfile.id)
          .maybeSingle();
        
        if (existingProfessionalError) {
          console.error('Error checking for existing professional:', existingProfessionalError);
        }
        
        if (existingProfessional) {
          console.log('Professional record already exists for this profile');
          // Return the existing professional record
          return {
            profile_id: existingProfile.id,
            professional_id: existingProfessional.id
          };
        }
        
        // Update the existing profile to be a professional if it's not already
        if (existingProfile.type !== 'professional') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ type: 'professional' })
            .eq('id', existingProfile.id);
          
          if (updateError) {
            console.error('Error updating profile type:', updateError);
            // Try with admin client if available
            if (supabaseAdmin) {
              const { error: adminUpdateError } = await supabaseAdmin
                .from('profiles')
                .update({ type: 'professional' })
                .eq('id', existingProfile.id);
              
              if (adminUpdateError) {
                console.error('Admin client also failed to update profile type:', adminUpdateError);
              }
            }
          }
        }
        
        // Create a new professional record linked to the existing profile
        const { data: newProfessional, error: newProfessionalError } = await supabase
          .from('professionals')
          .insert([{
            ...professionalInfo,
            profile_id: existingProfile.id
          }])
          .select();
        
        if (newProfessionalError) {
          console.error('Error creating professional with regular client:', newProfessionalError);
          // Try with admin client if available
          if (supabaseAdmin) {
            console.log('Using admin client to create professional record');
            const { data: adminProfessional, error: adminProfessionalError } = await supabaseAdmin
              .from('professionals')
              .insert([{
                ...professionalInfo,
                profile_id: existingProfile.id
              }])
              .select();
            
            if (adminProfessionalError) {
              console.error('Admin client also failed:', adminProfessionalError);
              throw adminProfessionalError;
            }
            
            console.log('Successfully created professional with admin client');
            return {
              profile_id: existingProfile.id,
              professional_id: adminProfessional[0].id
            };
          } else {
            throw newProfessionalError;
          }
        }
        
        console.log('Successfully created professional with regular client');
        return {
          profile_id: existingProfile.id,
          professional_id: newProfessional[0].id
        };
      }
      
      // No existing profile, create a new one with admin client if available
      if (supabaseAdmin) {
        try {
          console.log('Using admin client to create new professional profile');
          
          // Get the current user's auth ID if available
          const authId = session?.user?.id;
          
          // 1. Create profile
          const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert([{ 
              ...profile, 
              type: 'professional',
              id: authId // Link to auth ID if available
            }])
            .select();
            
          if (profileError) {
            console.error('Admin client failed to create profile:', profileError);
            throw profileError;
          }
          
          const profileId = profileData[0].id;
          console.log('Created profile with ID:', profileId);
          
          // 2. Create professional record
          const { data: professionalData, error: professionalError } = await supabaseAdmin
            .from('professionals')
            .insert([{ 
              ...professionalInfo, 
              profile_id: profileId 
            }])
            .select();
            
          if (professionalError) {
            console.error('Admin client failed to create professional:', professionalError);
            throw professionalError;
          }
          
          console.log('Created professional with ID:', professionalData[0].id);
          return { 
            profile_id: profileId,
            professional_id: professionalData[0].id
          };
        } catch (adminError) {
          console.error('Admin client failed, trying regular client:', adminError);
          // Fall through to regular client approach
        }
      }
      
      // Try with regular client as a fallback or if admin client is not available
      console.log('Using regular client to create professional profile');
      
      // First try direct inserts if we have an authenticated user
      if (session?.user?.id) {
        try {
          // 1. Create profile directly
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert([{ 
              ...profile, 
              type: 'professional',
              id: session.user.id // Use the authenticated user ID
            }])
            .select();
            
          if (profileError) {
            console.error('Regular client failed to create profile directly:', profileError);
            // Continue to RPC approach
          } else {
            const profileId = profileData[0].id;
            console.log('Created profile directly with ID:', profileId);
            
            // 2. Create professional record
            const { data: professionalData, error: professionalError } = await supabase
              .from('professionals')
              .insert([{ 
                ...professionalInfo, 
                profile_id: profileId 
              }])
              .select();
              
            if (professionalError) {
              console.error('Regular client failed to create professional directly:', professionalError);
              // Continue to RPC approach
            } else {
              console.log('Created professional directly with ID:', professionalData[0].id);
              return { 
                profile_id: profileId,
                professional_id: professionalData[0].id
              };
            }
          }
        } catch (directError) {
          console.error('Direct insert approach failed:', directError);
          // Continue to RPC approach
        }
      }
      
      // Fall back to RPC approach
      console.log('Falling back to RPC approach for creating professional profile');
      const { data, error } = await supabase.rpc('create_professional', {
        profile_data: { ...profile, type: 'professional' },
        professional_data: professionalInfo
      });

      if (error) {
        console.error('RPC approach failed:', error);
        throw error;
      }
      
      console.log('Successfully created professional with RPC approach:', data);
      return data;
    } catch (error) {
      console.error('Error creating professional profile:', error);
      throw error;
    }
  },

  addService: async (service: Omit<Service, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
    
    if (error) throw error
    return data?.[0] as Service
  },

  getProfessionals: async () => {
    const { data, error } = await supabase
      .from('professionals')
      .select(`
        *,
        profiles:profile_id(*)
      `)
      .eq('verified', true)
    
    if (error) throw error
    return data
  },

  getProfessionalServices: async (professionalId: string) => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', professionalId)
    
    if (error) throw error
    return data as Service[]
  },

  getUserProfile: async (userId: string) => {
    try {
      console.log('Fetching user profile for ID:', userId);
      
      // Fix for 406 errors - ensure proper filters and headers
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Better handling of single or no results
      
      if (error) {
        console.error('Profile fetch error:', error)
        
        // Fallback approach if the first attempt fails
        if (error.code === '406' || error.code === '403') {
          console.log('Attempting alternative profile fetch approach')
          const { data: altData, error: altError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone, username, type')
            .eq('id', userId)
            .maybeSingle()
          
          if (altError) throw altError
          return altData as Profile
        }
        
        throw error
      }
      
      // If running in demo mode, return mock data
      if (window.location.search.includes('demo=true')) {
        return {
          id: userId,
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          phone: '555-123-4567',
          username: 'demouser',
          type: window.location.pathname.includes('/professional') ? 'professional' : 'client'
        } as Profile
      }
      
      // If we have a profile but no type is set, check if there's a professional record
      if (data && (!data.type || data.type === '')) {
        console.log('Profile found but no type set, checking for professional record');
        const { data: professionalData, error: professionalError } = await supabase
          .from('professionals')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();
        
        if (!professionalError && professionalData) {
          console.log('Professional record found, setting type to professional');
          // Update the profile with the correct type
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ type: 'professional' })
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating profile type:', updateError);
          }
          
          // Return the profile with the correct type
          return { ...data, type: 'professional' } as Profile;
        }
      }
      
      console.log('Profile data found:', data);
      return data as Profile
    } catch (error) {
      console.error('Final profile fetch error:', error)
      throw error
    }
  },

  // Function to trigger the booking webhook
  triggerBookingWebhook: async (bookingId: string) => {
    try {
      console.log('Triggering booking webhook for booking ID:', bookingId);
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'booking_notification',
          bookingId: bookingId
        }
      });
      
      if (error) {
        console.error('Error triggering booking webhook:', error);
        throw error;
      }
      
      console.log('Booking webhook triggered successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to trigger booking webhook:', error);
      throw error;
    }
  },

  createBooking: async (booking: Omit<Booking, 'id' | 'created_at'>) => {
    // First try with regular client
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
    
    // If successful, return the data and trigger webhook
    if (!error) {
      const savedBooking = data?.[0] as Booking;
      // Trigger the webhook in the background
      api.triggerBookingWebhook(savedBooking.id).catch(webhookError => {
        console.error('Failed to trigger booking webhook:', webhookError);
      });
      return savedBooking;
    }
    
    // If failed due to RLS and we have admin client, try with admin privileges
    if (supabaseAdmin && (error.code === '42501' || error.message.includes('policy'))) {
      console.log('Using admin client to bypass RLS for booking creation')
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('bookings')
        .insert([booking])
        .select()
      
      if (adminError) {
        console.error('Admin client also failed:', adminError)
        throw adminError
      }
      
      const savedBooking = adminData?.[0] as Booking;
      // Trigger the webhook in the background
      api.triggerBookingWebhook(savedBooking.id).catch(webhookError => {
        console.error('Failed to trigger booking webhook:', webhookError);
      });
      return savedBooking;
    }
    
    // If no admin client or other error, throw the original error
    throw error
  },
  


  getClientBookings: async (clientId: string) => {
    console.log('API: Fetching bookings for client ID:', clientId);
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        professional:professional_id(
          id,
          profile:profile_id(
            id,
            first_name,
            last_name,
            email
          )
        ),
        service:service_id(
          id,
          name,
          price,
          description
        )
      `)
      .eq('client_id', clientId)
      .order('booking_date', { ascending: false });
    
    if (error) {
      console.error('API: Error fetching client bookings:', error);
      throw error;
    }
    
    console.log('API: Found bookings:', data?.length || 0);
    console.log('API: Bookings data:', data);
    
    return data || [];
  },

  getProfessionalBookings: async (professionalId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:client_id(
          *
        ),
        service:service_id(*)
      `)
      .eq('professional_id', professionalId)
    
    if (error) throw error
    return data
  },

  updateBookingStatus: async (bookingId: string, status: Booking['status']) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .select();
      
      if (error) throw error;
      return data?.[0] as Booking;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },
  
  // Add work photos for a professional
  addWorkPhoto: async (workPhoto: Omit<WorkPhoto, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('work_photos')
        .insert(workPhoto)
        .select('id');
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error adding work photo:', error);
      throw error;
    }
  },
  
  // Get work photos for a professional
  getWorkPhotos: async (professionalId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_photos')
        .select('*')
        .eq('professional_id', professionalId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting work photos:', error);
      return [];
    }
  }
};

// Storage functions
export const storage = {
  // Upload a profile photo to the profiles bucket
  uploadProfilePhoto: async (userId: string, file: File) => {
    try {
      // Ensure we have a valid user ID
      if (!userId) {
        console.error('No user ID provided for profile photo upload');
        return {
          path: 'placeholder',
          url: '/placeholder.svg'
        };
      }

      // Log the current user and file details
      console.log('Uploading profile photo:', {
        userId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Generate a unique file path under the user's folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      console.log('Generated file path:', filePath);
      
      // First try to get the current session to verify authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw sessionError;
      }
      
      if (!session) {
        console.error('No active session found');
        throw new Error('User must be authenticated to upload photos');
      }
      
      console.log('User is authenticated, proceeding with upload');
      
      // Try with admin client first (most reliable method)
      if (supabaseAdmin) {
        try {
          console.log('Using admin client for profile photo upload');
          
          // Attempt the upload with admin client
          const { data: adminData, error: adminError } = await supabaseAdmin.storage
            .from('profiles')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type // Explicitly set content type
            });
          
          if (adminError) {
            console.error('Admin upload failed:', adminError);
            throw adminError;
          }
          
          console.log('Admin upload successful');
          
          // Get the public URL for the file
          const { data: urlData } = supabaseAdmin.storage
            .from('profiles')
            .getPublicUrl(filePath);
          
          const imageUrl = urlData.publicUrl;
          console.log('Generated public URL:', imageUrl);
          
          // Update both profile and professional records with the image URL
          try {
            // Update profile record
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .update({ profile_photo_url: imageUrl })
              .eq('id', userId);
              
            if (profileError) {
              console.error('Could not update profile record with image URL:', profileError);
            }
            
            // Update professional record
            const { error: professionalError } = await supabaseAdmin
              .from('professionals')
              .update({ image: imageUrl })
              .eq('profile_id', userId);
              
            if (professionalError) {
              console.error('Could not update professional record with image URL:', professionalError);
            }
          } catch (updateError) {
            console.error('Error updating records with image URL:', updateError);
          }
          
          // Store the URL in localStorage as a backup
          try {
            localStorage.setItem(`profile_image_${userId}`, imageUrl);
          } catch (storageError) {
            console.log('Could not save to localStorage:', storageError);
          }
          
          return {
            path: filePath,
            url: imageUrl
          };
        } catch (adminUploadError) {
          console.error('Admin upload failed completely:', adminUploadError);
          throw adminUploadError;
        }
      }
      
      // Fallback to regular client if admin client isn't available
      console.log('Admin client not available, using regular client');
      
      // First check if the bucket exists and is accessible
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
          console.error('Error listing buckets:', bucketsError);
        } else {
          console.log('Available buckets:', buckets);
        }
      } catch (bucketsError) {
        console.error('Error checking buckets:', bucketsError);
      }
      
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type // Explicitly set content type
        });
      
      if (error) {
        console.error('Regular client upload failed:', error);
        throw error;
      }
      
      console.log('Regular upload successful');
      
      // Get the public URL for the file
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      const imageUrl = urlData.publicUrl;
      console.log('Generated public URL:', imageUrl);
      
      // Update both profile and professional records with the image URL
      try {
        // Update profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ profile_photo_url: imageUrl })
          .eq('id', userId);
          
        if (profileError) {
          console.error('Could not update profile record with image URL:', profileError);
        }
        
        // Update professional record
        const { error: professionalError } = await supabase
          .from('professionals')
          .update({ image: imageUrl })
          .eq('profile_id', userId);
          
        if (professionalError) {
          console.error('Could not update professional record with image URL:', professionalError);
        }
      } catch (updateError) {
        console.error('Error updating records with image URL:', updateError);
      }
      
      // Store the URL in localStorage as a backup
      try {
        localStorage.setItem(`profile_image_${userId}`, imageUrl);
      } catch (storageError) {
        console.log('Could not save to localStorage:', storageError);
      }
      
      return {
        path: filePath,
        url: imageUrl
      };
    } catch (error) {
      console.error('Unhandled error in profile photo upload:', error);
      // Return placeholder instead of throwing to prevent cascading errors
      return {
        path: 'placeholder',
        url: '/placeholder.svg'
      };
    }
  },
  // Upload a file to the professional-documents bucket
  uploadProfessionalDocument: async (filePath: string, file: File) => {
    try {
      // Use the standard client to upload the document.
      // The bucket ('professional-documents') must exist and have appropriate
      // RLS policies in place to allow uploads by authenticated users.
      const { data, error } = await supabase.storage
        .from('professional-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if a file with the same name exists.
        });

      if (error) {
        console.error('Error uploading professional document:', error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
      }

      // Get the public URL for the uploaded file.
      const { data: urlData } = supabase.storage
        .from('professional-documents')
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('An unexpected error occurred during document upload:', error instanceof Error ? error.message : JSON.stringify(error));
      throw error;
    }
  },
  
  // Delete a file from the professional-documents bucket
  deleteProfessionalDocument: async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('professional-documents')
        .remove([filePath]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },
  
  // Get a temporary URL for a private file
  getSignedUrl: async (filePath: string, expiresIn = 60) => {
    try {
      const { data, error } = await supabase.storage
        .from('professional-documents')
        .createSignedUrl(filePath, expiresIn);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  },

  // Upload a work photo to the work-photos bucket
  uploadWorkPhoto: async (professionalId: string, file: File, caption: string) => {
    try {
      // Add a guard clause to ensure the file and its name are valid
      if (!file || !file.name) {
        console.error('uploadWorkPhoto called with invalid file object.');
        // Return a default or error state that can be handled by the caller
        throw new Error('Invalid file provided for work photo upload.');
      }

      // Generate a unique file path to avoid overwriting files.
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${professionalId}/${fileName}`;

      // Use the standard client to upload the work photo.
      // The bucket ('work-photos') must exist and have appropriate RLS policies
      // in place to allow uploads by the professional.
      const { data, error } = await supabase.storage
        .from('work-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't upsert since we generate a unique name.
        });

      if (error) {
        console.error('Error uploading work photo:', error);
        throw error;
      }

      // Get the public URL for the uploaded file.
      const { data: urlData } = supabase.storage
        .from('work-photos')
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: urlData.publicUrl,
        caption,
      };
    } catch (error) {
      console.error('An unexpected error occurred during work photo upload:', error);
      throw error;
    }
  }
};

// Auth functions
export const auth = {
  // Sign up with email and password
  signUpWithEmail: async (email: string, password: string, redirectTo?: string) => {
    // The Supabase client returns an object with `data` and `error` properties.
    // This function is being updated to consistently return that same structure.
    try {
      console.log('Starting email signup process for:', email);

      // Attempt to sign up the new user directly.
      // The `signUp` method handles cases where the user might already exist,
      // so checking separately with `signIn` is not necessary.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Use the provided redirectTo URL, or fall back to the production URL.
          emailRedirectTo: redirectTo || 'https://michemobile.online/auth/callback',
        },
      });

      if (error) {
        // If there's an error, we'll log it and return it.
        console.error('Error during signup:', error);
        return { data: null, error };
      }

      // If signup is successful, but the user object is null (e.g., email confirmation required),
      // we still return the successful response.
      if (!data.user) {
        console.log('Signup initiated, user needs to confirm their email.');
      } else {
        console.log('Signup successful, user data:', data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unhandled error in signUpWithEmail:', error);
      return { data: null, error: error as Error };
    }
  },

  // Sign in with email and password
  signInWithEmail: async (email: string, password: string) => {
    // This function is updated to return a consistent { data, error } object
    // to align with signUpWithEmail and improve error handling.
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error during sign-in:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unhandled error in signInWithEmail:', error);
      return { data: null, error: error as Error };
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    // FORCE using localhost during development to prevent michemobile.online redirects
    let redirectUrl;
    
    // Use production domain
    redirectUrl = 'https://michemobile.online/auth/callback';
    console.log('Using michemobile.online redirect URL');
    
    console.log('Google sign-in redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    if (error) throw error
    return data
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  }
}


export default supabase 