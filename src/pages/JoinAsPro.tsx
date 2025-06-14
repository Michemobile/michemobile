import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectValue, SelectTrigger, SelectItem, SelectContent, Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { services } from "@/data/services";
import { CheckCircle2 } from "lucide-react";
import { api, auth, supabase, storage } from "@/lib/supabase";
import { emailService } from "@/lib/email";

// Helper to convert a File to a base64 string for localStorage
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Helper to convert a base64 string back to a File object
const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error('Invalid base64 string format. Mime type not found.');
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

// Prepares form data for localStorage by converting all File objects to base64
const prepareDataForStorage = async (data: any) => {
  const storableData = JSON.parse(JSON.stringify(data)); // Deep copy

  if (data.profilePhoto instanceof File) {
    storableData.profilePhoto = {
      base64: await fileToBase64(data.profilePhoto),
      name: data.profilePhoto.name,
    };
  }

  if (data.insuranceFile?.file instanceof File) {
    storableData.insuranceFile = {
      ...data.insuranceFile,
      file: {
        base64: await fileToBase64(data.insuranceFile.file),
        name: data.insuranceFile.file.name,
      },
    };
  }

  if (data.certifications?.length > 0) {
    storableData.certifications = await Promise.all(
      data.certifications.map(async (cert: any) => {
        if (cert.file instanceof File) {
          return {
            ...cert,
            file: {
              base64: await fileToBase64(cert.file),
              name: cert.file.name,
            },
          };
        }
        return cert;
      })
    );
  }

  if (data.workPhotos?.length > 0) {
    storableData.workPhotos = await Promise.all(
      data.workPhotos.map(async (photo: any) => {
        if (photo.file instanceof File) {
          return {
            ...photo,
            file: {
              base64: await fileToBase64(photo.file),
              name: photo.file.name,
            },
          };
        }
        return photo;
      })
    );
  }

  return storableData;
};

// Restores File objects from base64 strings after retrieving from localStorage
const restoreFilesFromStoredData = (data: any) => {
  const restoredData = { ...data };

  if (data.profilePhoto?.base64) {
    restoredData.profilePhoto = base64ToFile(data.profilePhoto.base64, data.profilePhoto.name);
  }

  if (data.insuranceFile?.file?.base64) {
    restoredData.insuranceFile = {
      ...data.insuranceFile,
      file: base64ToFile(data.insuranceFile.file.base64, data.insuranceFile.file.name),
    };
  }

  if (data.certifications?.length > 0) {
    restoredData.certifications = data.certifications.map((cert: any) => {
      if (cert.file?.base64) {
        return {
          ...cert,
          file: base64ToFile(cert.file.base64, cert.file.name),
        };
      }
      return cert;
    });
  }

  if (data.workPhotos?.length > 0) {
    restoredData.workPhotos = data.workPhotos.map((photo: any) => {
      if (photo.file?.base64) {
        return {
          ...photo,
          file: base64ToFile(photo.file.base64, photo.file.name),
        };
      }
      return photo;
    });
  }

  return restoredData;
};

// Google Maps Component
const MapWithRadius = ({ center, radius }) => {
  const mapRef = useRef(null);
  const circleRef = useRef(null);
  
  useEffect(() => {
    // This is a placeholder for Google Maps integration
    // In a real implementation, you would:
    // 1. Load the Google Maps JavaScript API
    // 2. Initialize the map when the API is loaded
    // 3. Create a circle overlay with the specified radius
    
    // Mock implementation for UI demonstration
    if (mapRef.current) {
      const mapElement = mapRef.current;
      mapElement.innerHTML = '';
      
      const mapInfo = document.createElement('div');
      mapInfo.className = 'text-center p-4';
      mapInfo.innerHTML = `
        <p class="text-gray-700 font-medium mb-2">Service Radius Visualization</p>
        <p class="text-sm text-gray-600">
          This map would show a ${radius} mile radius around your service location.
        </p>
        <p class="text-xs text-gray-500 mt-4">
          Note: In the production version, this will use the Google Maps API to 
          display a real map with your selected radius.
        </p>
      `;
      
      mapElement.appendChild(mapInfo);
    }
  }, [center, radius]);
  
  return (
    <div 
      ref={mapRef} 
      className="h-full bg-gray-100 flex items-center justify-center"
    >
      <div className="text-center p-4">
        <p className="text-gray-600 mb-2">Google Maps will display here</p>
        <p className="text-sm text-gray-500">
          This will show a {radius} mile radius around your service location
        </p>
      </div>
    </div>
  );
};

const JoinAsPro = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    serviceArea: '',
    profilePhoto: null,
    
    // Professional experience
    selectedServices: [],
    serviceDetails: {},
    servicePrices: {},
    customServices: [],
    yearsExperience: '',
    bio: '',
    travelFee: '',
    serviceRadius: 10,
    serviceLocation: '',
    workPhotos: [], // Array of work photo files with captions
    
    // Certifications
    certifications: [], // Will contain objects with file info and upload status
    insuranceFile: null, // Will contain file info and upload status for insurance
    
    // Account
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreeMarketing: false
  });
  const totalSteps = 4;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Check for existing user session and saved data on component mount
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Check if user is already signed in
        const user = await auth.getUser();
        
        // If user is signed in and there's saved data, complete the profile creation
        if (user && localStorage.getItem('professionalOnboardingData')) {
          const savedData = localStorage.getItem('professionalOnboardingData');
          const parsedData = JSON.parse(savedData);
          const restoredFormData = restoreFilesFromStoredData(parsedData);
          
          console.log("Found existing user session and saved data, completing profile creation...");
          await completeProfileCreation(restoredFormData, user);
          localStorage.removeItem('professionalOnboardingData');
          return;
        }
        
        // If there's saved data but no user, restore the form data
        if (localStorage.getItem('professionalOnboardingData')) {
          const savedData = localStorage.getItem('professionalOnboardingData');
          const parsedData = JSON.parse(savedData);
          const restoredFormData = restoreFilesFromStoredData(parsedData);
          
          console.log("Restoring saved form data...");
          setFormData(restoredFormData);
          setCurrentStep(4); // Go to account setup step since data is already filled
        }
      } catch (error) {
        console.error("Error during component initialization:", error);
      } finally {
        setInitialDataLoaded(true);
      }
    };
    
    initializeComponent();
  }, []);

  // This effect runs on component mount to handle all authentication-related flows,
  // including returns from Google OAuth and email confirmation links.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Check for a sign-in event AND the presence of our saved form data
        if (event === "SIGNED_IN" && localStorage.getItem('professionalOnboardingData')) {
          const savedData = localStorage.getItem('professionalOnboardingData');
          if (!savedData || !session?.user) {
            console.log("Missing saved data or user session");
            return;
          }

          console.log("User signed in via OAuth, restoring form data and proceeding with profile creation...");
          console.log("User ID:", session.user.id);
          console.log("User email:", session.user.email);
          
          try {
          const parsedData = JSON.parse(savedData);
          
          // Restore File objects from base64 strings
          const restoredFormData = restoreFilesFromStoredData(parsedData);
            console.log("Form data restored successfully");

          // Pass the restored data and user object to complete the profile
          await completeProfileCreation(restoredFormData, session.user);

          // Clean up the stored data
          localStorage.removeItem('professionalOnboardingData');
            console.log("Profile creation completed and data cleaned up");
          } catch (error) {
            console.error("Error processing OAuth sign-in:", error);
            toast({
              title: "Profile Creation Error",
              description: "There was an issue creating your profile. Please try again.",
              variant: "destructive",
            });
            localStorage.removeItem('professionalOnboardingData');
          }
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleGoogleSignUp = async () => {
    try {
      // Validate required fields before proceeding
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'username', 'serviceArea'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        toast({
          title: "Missing Information",
          description: `Please fill in all required fields: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

    // Convert files to base64 before storing
    const storableData = await prepareDataForStorage(formData);
    localStorage.setItem('professionalOnboardingData', JSON.stringify(storableData));
      
      toast({
        title: "Redirecting to Google",
        description: "Please complete the Google sign-in process to continue.",
        variant: "default",
      });
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      },
    });

    if (error) {
        console.error("Google OAuth error:", error);
      toast({
        title: "Google Sign-In Failed",
          description: error.message || "Unable to connect to Google. Please try again.",
          variant: "destructive",
        });
        localStorage.removeItem('professionalOnboardingData');
      }
    } catch (error) {
      console.error("Error in handleGoogleSignUp:", error);
      toast({
        title: "Sign-In Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      localStorage.removeItem('professionalOnboardingData');
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // This function will be called by the auth listener after the user confirms their email.
  const completeProfileCreation = async (formData, user) => {
    const userId = user.id;
    console.log("Starting profile creation for user:", userId);
    
    try {
      // 1. Handle file uploads first since they're not part of the transaction
      let profilePhotoUrl = null;
      if (formData.profilePhoto?.file) {
        const result = await storage.uploadProfilePhoto(userId, formData.profilePhoto.file);
        profilePhotoUrl = result.url;
      }

      let uploadedCertifications = [];
      if (formData.certifications && formData.certifications.length > 0) {
        const certUploads = await Promise.all(
          formData.certifications.map(async (cert) => {
            if (!cert.file) return null;
            const result = await storage.uploadProfessionalDocument(userId, cert.file);
            return {
              file_path: result.path,
              type: cert.type || 'general'
            };
          })
        );
        uploadedCertifications = certUploads.filter(Boolean);
      }

      let uploadedInsurance = null;
      if (formData.insuranceFile?.file) {
        const file = formData.insuranceFile.file;
        const filePath = `${userId}/insurance/${Date.now()}-${file.name}`;
        const { path } = await storage.uploadProfessionalDocument(filePath, file);
        uploadedInsurance = {
          file_path: path,
          type: formData.insuranceFile.type || 'general'
        };
      }

      // 3. Call the complete_professional_profile stored procedure
      const { data: result, error } = await supabase.rpc('complete_professional_profile', {
        profile_data: {
        id: userId,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: user.email,
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
          profile_photo_url: profilePhotoUrl
        },
        professional_data: {
        service_area: formData.serviceArea.trim(),
        service_radius: parseInt(formData.serviceRadius) || 10,
        travel_fee: parseFloat(formData.travelFee) || 0,
        years_experience: formData.yearsExperience || '0',
          bio: formData.bio?.trim() || ''
        },
        certifications: uploadedCertifications,
        insurance: uploadedInsurance
          });

      if (error) {
        throw error;
        }

      console.log("Profile creation completed successfully");
      toast({
        title: "Application Submitted!",
        description: "Your professional profile has been created. Setting up your payment account...",
        variant: "default",
      });

      // Navigate to Stripe onboarding after a short delay
      setTimeout(() => {
        navigate('/pro-onboarding-complete');
      }, 1500);

    } catch (error) {
      console.error("Error during profile completion:", error);
      
      // Clean up any partial data
      localStorage.removeItem('professionalOnboardingData');
      
      let errorTitle = "Submission Failed";
      let errorMessage = "An unexpected error occurred during profile completion.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes('profile')) {
          errorTitle = "Profile Creation Failed";
          errorMessage = "There was an issue creating your profile. Please check your information and try again.";
        } else if (error.message.includes('professional')) {
          errorTitle = "Professional Account Failed";
          errorMessage = "Your profile was created, but there was an issue setting up your professional account. Please contact support.";
        } else if (error.message.includes('upload')) {
          errorTitle = "File Upload Failed";
          errorMessage = "There was an issue uploading your files. Please check your internet connection and try again.";
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // This function now only handles the initial sign-up.
  const submitForm = async () => {
    // Check if user is already authenticated via Google
    try {
      const currentUser = await auth.getUser();
      if (currentUser) {
        // User is already signed in, proceed directly to profile creation
        await completeProfileCreation(formData, currentUser);
        return;
      }
    } catch (error) {
      console.log("No current user session, proceeding with email/password signup");
    }

    // Validate email/password signup
    if (!formData.password || !formData.confirmPassword) {
      toast({ 
        title: "Missing Password", 
        description: "Please enter a password or sign in with Google.",
        variant: "destructive" 
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ 
        title: "Passwords do not match", 
        description: "Please ensure both password fields are identical.",
        variant: "destructive" 
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({ 
        title: "Password too short", 
        description: "Password must be at least 8 characters long.",
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Convert files to base64 and save the form data to local storage.
      const storableData = await prepareDataForStorage(formData);
      localStorage.setItem('professionalOnboardingData', JSON.stringify(storableData));

      // 2. Sign up the user, providing the current URL for the email confirmation redirect.
      const { error: signUpError } = await auth.signUpWithEmail(formData.email, formData.password, window.location.href);

      if (signUpError) {
        // Clear local storage if sign-up fails
        localStorage.removeItem('professionalOnboardingData');
        if (signUpError.message.includes("User already registered")) {
          toast({
            title: "Email Already Registered",
            description: "This email is already in use. Please sign in or use a different email.",
            variant: "destructive",
          });
        } else {
          throw new Error(`Sign up failed: ${signUpError.message}`);
        }
        return; // Stop execution
      }

      // 3. Show a success message asking the user to confirm their email.
      toast({
        title: "Confirm Your Email",
        description: "We've sent a confirmation link to your email. Please click it to complete your registration.",
        variant: "default",
        duration: 9000, // Keep the toast longer
      });

      // Optionally, you could disable the form here or change the view.
      // For now, we just leave it as is, and the auth listener will take over.

    } catch (error) {
      localStorage.removeItem('professionalOnboardingData'); // Clean up on error
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof Error) errorMessage = error.message;
      toast({ title: "Submission Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep 
          formData={formData} 
          updateFormData={updateFormData} 
          onNext={nextStep} 
        />;
      case 2:
        return <ProfessionalExperienceStep 
          formData={formData} 
          updateFormData={updateFormData} 
          onNext={nextStep} 
          onBack={prevStep} 
        />;
      case 3:
        return <CertificationStep 
          formData={formData} 
          updateFormData={updateFormData} 
          onNext={nextStep} 
          onBack={prevStep} 
        />;
      case 4:
        return <AccountSetupStep 
          formData={formData} 
          updateFormData={updateFormData} 
          onBack={prevStep}
          onSubmit={submitForm}
          isSubmitting={isSubmitting}
          onGoogleSignIn={handleGoogleSignUp}
        />;
      default:
        return <BasicInfoStep 
          formData={formData} 
          updateFormData={updateFormData} 
          onNext={nextStep} 
        />;
    }
  };

  // Show loading state while initializing
  if (!initialDataLoaded) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-grow pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-brand-bronze rounded-full border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">Join as a Professional</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Apply to join our network of certified mobile professionals and grow your business.
            </p>
          </div>
          
          {/* Progress Indicator */}
          <div className="max-w-4xl mx-auto mb-10">
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 -z-10"></div>
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors z-10
                    ${step < currentStep ? 'bg-brand-bronze text-white' 
                      : step === currentStep ? 'bg-white border-2 border-brand-bronze text-brand-bronze' 
                      : 'bg-white border-2 border-gray-300 text-gray-400'}`}
                  >
                    {step < currentStep ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <span className="font-medium">{step}</span>
                    )}
                  </div>
                  <span className={`text-sm mt-2 font-medium ${
                    step <= currentStep ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step === 1 && 'Basic Info'}
                    {step === 2 && 'Experience'}
                    {step === 3 && 'Certifications'}
                    {step === 4 && 'Account Setup'}
                  </span>
                      </div>
                    ))}
                  </div>
                </div>
                
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Main Form Container */}
            <div className="lg:col-span-2 bg-gray-50 p-8 rounded-lg border border-brand-bronze/20">
              <h2 className="text-2xl font-bold text-black mb-6">
                {currentStep === 1 && 'Personal Information'}
                {currentStep === 2 && 'Professional Experience'}
                {currentStep === 3 && 'Certification Upload'}
                {currentStep === 4 && 'Account Setup'}
              </h2>
              
              {renderStep()}
            </div>
            
            {/* Info Sidebar */}
            <div>
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20 sticky top-24">
                <h3 className="text-xl font-medium text-gray-900 mb-4">Benefits of Joining</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-brand-bronze mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Expand your client base with our platform's visibility</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-brand-bronze mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Set your own schedule and service area</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-brand-bronze mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Receive instant payouts after services are completed</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-brand-bronze mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Verified badge increases trust and bookings</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-brand-bronze mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Simple 10% commission structure - no hidden fees</span>
                  </li>
                </ul>
                
                <h3 className="text-xl font-medium text-gray-900 mt-8 mb-4">Onboarding Process</h3>
                <ol className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <div className={`rounded-full h-5 w-5 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 ${currentStep >= 1 ? 'bg-brand-bronze' : 'bg-gray-300'}`}>1</div>
                    <span className={currentStep >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Basic information</span>
                  </li>
                  <li className="flex items-start">
                    <div className={`rounded-full h-5 w-5 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 ${currentStep >= 2 ? 'bg-brand-bronze' : 'bg-gray-300'}`}>2</div>
                    <span className={currentStep >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Professional experience & services</span>
                  </li>
                  <li className="flex items-start">
                    <div className={`rounded-full h-5 w-5 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 ${currentStep >= 3 ? 'bg-brand-bronze' : 'bg-gray-300'}`}>3</div>
                    <span className={currentStep >= 3 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Certification verification</span>
                  </li>
                  <li className="flex items-start">
                    <div className={`rounded-full h-5 w-5 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 ${currentStep >= 4 ? 'bg-brand-bronze' : 'bg-gray-300'}`}>4</div>
                    <span className={currentStep >= 4 ? 'text-gray-900 font-medium' : 'text-gray-500'}>Create your account</span>
                  </li>
                </ol>
                
                <div className="mt-8 bg-white p-4 rounded-md border border-gray-200">
                  <h4 className="text-brand-bronze font-medium mb-2">Have questions?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    We're here to help with your application process.
                  </p>
                  <Link to="/contact">
                    <Button variant="outline" className="w-full border-brand-bronze text-brand-bronze hover:bg-brand-bronze/10">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Step 1: Basic Information
const BasicInfoStep = ({ formData, updateFormData, onNext }) => {
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Simulate checking username availability
  const checkUsernameAvailability = (value) => {
    if (!value.trim()) {
      setIsUsernameAvailable(null);
      return;
    }
    
    setIsCheckingUsername(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Mock check - in production this would be an API call
      const available = !['taken', 'admin', 'beauty', 'maslynn'].includes(value.toLowerCase());
      setIsUsernameAvailable(available);
      setIsCheckingUsername(false);
    }, 600);
  };
  
  // Handle profile photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG or PNG)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }
    
    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // Update form data
    updateFormData('profilePhoto', file);
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <div className="space-y-1">
        <p className="text-sm text-black mb-4">Tell us about yourself</p>
      </div>
      
      {/* Profile Photo Upload */}
      <div className="space-y-2">
        <Label htmlFor="profile-photo" className="text-black">Profile Photo</Label>
        <div className="flex items-start space-x-4">
          <div 
            className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center overflow-hidden bg-gray-50"
            onClick={triggerFileInput}
          >
            {photoPreview ? (
              <img 
                src={photoPreview} 
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
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
            </Button>
            <p className="text-xs text-gray-500">
              Upload a professional photo. This will be displayed on your profile and visible to clients.
              <br />
              Max size: 5MB. Formats: JPG, PNG.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name" className="text-black">First Name*</Label>
          <Input
            id="first-name"
            required
            className="bg-white border-gray-300 text-black"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="last-name" className="text-black">Last Name*</Label>
          <Input
            id="last-name"
            required
            className="bg-white border-gray-300 text-black"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="username" className="text-black">Username*</Label>
        <div className="relative">
          <Input
            id="username"
            required
            className={`bg-white border-gray-300 text-black ${
              isUsernameAvailable === true ? 'border-green-500 pr-10' : 
              isUsernameAvailable === false ? 'border-red-500 pr-10' : ''
            }`}
            value={formData.username}
            onChange={(e) => {
              updateFormData('username', e.target.value);
              checkUsernameAvailability(e.target.value);
            }}
          />
          {isCheckingUsername && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-brand-bronze rounded-full border-t-transparent"></div>
            </div>
          )}
          {isUsernameAvailable === true && !isCheckingUsername && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {isUsernameAvailable === false && !isCheckingUsername && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <p className="text-xs text-black mt-1">
          This will be your unique identifier on our platform and visible to clients
          {isUsernameAvailable === false && (
            <span className="text-red-500 ml-1">- This username is already taken</span>
          )}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-black">Email Address*</Label>
          <Input
            id="email"
            type="email"
            required
            className="bg-white border-gray-300 text-black"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-black">Phone Number*</Label>
          <Input
            id="phone"
            type="tel"
            required
            className="bg-white border-gray-300 text-black"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="location" className="text-black">Service Area*</Label>
        <div className="space-y-3">
          <Input
            id="location"
            required
            placeholder="City, Country (e.g., Paris, France)"
            className="bg-white border-gray-300 text-black"
            value={formData.serviceArea}
            onChange={(e) => updateFormData('serviceArea', e.target.value)}
          />
          <div className="flex items-start">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 w-full">
              <p className="font-medium">International Service Areas</p>
              <p className="mt-1">
                You can enter any city and country worldwide. Our platform supports international professionals.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-black mt-1">Enter the primary city or country where you'll provide services</p>
      </div>
      
      <div className="pt-6 flex justify-end">
        <Button 
          type="submit" 
          className="px-8 bg-brand-bronze hover:bg-brand-bronze/80 text-white"
        >
          Continue
        </Button>
      </div>
    </form>
  );
};

// Step 2: Professional Experience
const ProfessionalExperienceStep = ({ formData, updateFormData, onNext, onBack }) => {
  return (
    <div className="space-y-8">
    <div>
      <h2 className="text-2xl font-bold mb-6 text-black">Professional Experience</h2>
      
        {/* Years of Experience */}
          <div className="mb-6">
          <Label htmlFor="yearsExperience" className="text-black">Years of Experience</Label>
            <Input 
            id="yearsExperience"
                          type="number"
            min="0"
            placeholder="Enter years of experience"
            value={formData.yearsExperience}
            onChange={(e) => updateFormData('yearsExperience', e.target.value)}
            className="bg-white"
                        />
                    </div>
                    
        {/* Bio */}
        <div className="mb-6">
          <Label htmlFor="bio" className="text-black">Professional Bio</Label>
                      <Textarea
            id="bio"
            placeholder="Tell clients about yourself, your experience, and what makes your services unique..."
            value={formData.bio}
            onChange={(e) => updateFormData('bio', e.target.value)}
            className="h-32 bg-white"
                      />
                    </div>
        
        {/* Service Area */}
        <div className="mb-6">
          <Label htmlFor="serviceArea" className="text-black">Service Area</Label>
                <Input
            id="serviceArea"
            placeholder="Enter your service area (e.g., Los Angeles, CA)"
            value={formData.serviceArea}
            onChange={(e) => updateFormData('serviceArea', e.target.value)}
            className="bg-white"
                />
              </div>
              
        {/* Service Radius */}
        <div className="mb-6">
          <Label htmlFor="serviceRadius" className="text-black">Service Radius (miles)</Label>
              <Input
            id="serviceRadius"
                type="number"
            min="0"
            placeholder="How far are you willing to travel?"
            value={formData.serviceRadius}
            onChange={(e) => updateFormData('serviceRadius', e.target.value)}
            className="bg-white"
              />
            </div>
            
        {/* Travel Fee */}
        <div className="mb-6">
          <Label htmlFor="travelFee" className="text-black">Travel Fee (per mile)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="travelFee"
                type="number"
              min="0"
              step="0.01"
                placeholder="0.00"
                value={formData.travelFee}
                onChange={(e) => updateFormData('travelFee', e.target.value)}
              className="pl-8 bg-white"
                />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
};

// Step 3: Certification Upload
const CertificationStep = ({ formData, updateFormData, onNext, onBack }) => {
  const [certificationFiles, setCertificationFiles] = useState<File[]>([]);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const certificationInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  
  const handleCertificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const validSize = file.size <= 10 * 1024 * 1024; // 10MB
      return validTypes.includes(file.type) && validSize;
    });
    
    if (validFiles.length !== newFiles.length) {
      setUploadError('Some files were rejected. Please ensure all files are PDF, JPG, or PNG and under 10MB.');
    } else {
      setUploadError(null);
    }
    
    setCertificationFiles(prev => [...prev, ...validFiles]);
    updateFormData('certifications', [...formData.certifications, ...validFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploaded: false,
      path: null
    }))]);
  };
  
  const handleInsuranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const validSize = file.size <= 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type) || !validSize) {
      setUploadError('Invalid file. Please ensure it is a PDF, JPG, or PNG and under 10MB.');
      return;
    }
    
    setUploadError(null);
    setInsuranceFile(file);
    updateFormData('insuranceFile', {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploaded: false,
      path: null
    });
  };
  
  const removeCertification = (index: number) => {
    const updatedFiles = [...certificationFiles];
    updatedFiles.splice(index, 1);
    setCertificationFiles(updatedFiles);
    
    const updatedCertifications = [...formData.certifications];
    updatedCertifications.splice(index, 1);
    updateFormData('certifications', updatedCertifications);
  };
  
  const removeInsurance = () => {
    setInsuranceFile(null);
    updateFormData('insuranceFile', null);
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const handleContinue = () => {
    if (certificationFiles.length === 0) {
      setUploadError('Please upload at least one certification document.');
      return;
    }
    
    setUploadError(null);
    onNext();
  };
  
  return (
    <form className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-black mb-4">
          To ensure quality service for our clients, we require verification of your professional certifications
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="certifications" className="text-black">Certification Upload*</Label>
        <div className="bg-white border border-dashed border-gray-300 rounded-md p-8 text-center">
          <input 
            type="file" 
            id="certifications" 
            ref={certificationInputRef}
            multiple 
            accept=".pdf,.jpg,.jpeg,.png" 
            className="hidden" 
            onChange={handleCertificationChange}
          />
          <p className="text-black mb-4">
            Upload your certifications and licenses (.pdf, .jpg, .png)
          </p>
          <Button 
            type="button"
            variant="outline" 
            className="border-brand-bronze text-brand-bronze hover:bg-brand-bronze/10"
            onClick={() => certificationInputRef.current?.click()}
          >
            Select Files
          </Button>
          <p className="text-xs text-black mt-2">
            Max file size: 10MB. You can upload multiple files.
          </p>
        </div>
        
        {certificationFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-black mb-2">Selected Files:</h4>
            <ul className="space-y-2">
              {certificationFiles.map((file, index) => (
                <li key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                  <div className="flex items-center">
                    <span className="text-sm text-black truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
                  </div>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    className="text-red-500 hover:text-red-700 p-1 h-8 w-8"
                    onClick={() => removeCertification(index)}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <p className="text-xs text-black mt-3">
          Acceptable documents include: cosmetology license, esthetician license, specialized training certificates, etc.
        </p>
      </div>
      
      <div className="space-y-2 pt-4">
        <Label htmlFor="insurance" className="text-black">Liability Insurance (Optional)</Label>
        <div className="bg-white border border-dashed border-gray-300 rounded-md p-8 text-center">
          <input 
            type="file" 
            id="insurance" 
            ref={insuranceInputRef}
            accept=".pdf,.jpg,.jpeg,.png" 
            className="hidden" 
            onChange={handleInsuranceChange}
          />
          <p className="text-black mb-4">
            Upload proof of liability insurance if you have it
          </p>
          <Button 
            type="button"
            variant="outline" 
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={() => insuranceInputRef.current?.click()}
          >
            Select File
          </Button>
        </div>
        
        {insuranceFile && (
          <div className="mt-4">
            <div className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
              <div className="flex items-center">
                <span className="text-sm text-black truncate max-w-[200px]">{insuranceFile.name}</span>
                <span className="text-xs text-gray-500 ml-2">({formatFileSize(insuranceFile.size)})</span>
              </div>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                className="text-red-500 hover:text-red-700 p-1 h-8 w-8"
                onClick={removeInsurance}
              >
                ✕
              </Button>
            </div>
          </div>
        )}
        
        <p className="text-xs text-black mt-1">
          While not required, having liability insurance gives clients extra peace of mind
        </p>
      </div>
      
      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {uploadError}
        </div>
      )}
      
      <div className="pt-6 flex justify-between">
        <Button 
          type="button"
          onClick={onBack} 
          variant="outline"
          className="px-8 border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Back
        </Button>
        <Button 
          type="button"
          onClick={handleContinue} 
          className="px-8 bg-brand-bronze hover:bg-brand-bronze/80 text-white"
          disabled={certificationFiles.length === 0}
        >
          Continue
        </Button>
      </div>
    </form>
  );
};

// Step 4: Account Setup
const AccountSetupStep = ({ formData, updateFormData, onBack, onSubmit, isSubmitting, onGoogleSignIn }) => {
  const [user, setUser] = useState(null);
  
  // Check if user is signed in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await auth.getUser();
        setUser(currentUser);
    } catch (error) {
        setUser(null);
      }
    };
    
    checkUser();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Setup</h2>
      <p className="text-gray-600 mb-6">Create your professional account to complete your application</p>
      
      {!user ? (
        // Show sign-in options if user is not authenticated
        <>
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={onGoogleSignIn}
          disabled={isSubmitting}
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#EA4335" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
              <path fill="#4285F4" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
              <path fill="#34A853" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
            </g>
          </svg>
              Sign in with Google to Continue
        </Button>

        <div className="relative flex items-center">
          <span className="flex-grow border-t border-gray-300"></span>
          <span className="px-3 text-sm text-black">or</span>
          <span className="flex-grow border-t border-gray-300"></span>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-black">Password*</Label>
        <Input
          id="password"
          type="password"
          required
          className="bg-white border-gray-300 text-black"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
        />
        <p className="text-xs text-black mt-1">
          Must be at least 8 characters with a mix of letters, numbers, and symbols
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-black">Confirm Password*</Label>
        <Input
          id="confirm-password"
          type="password"
          required
          className="bg-white border-gray-300 text-black"
          value={formData.confirmPassword}
          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
        />
        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>
        </>
      ) : (
        // Show confirmation if user is authenticated
        <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-6">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-green-800 font-medium">Google Account Connected</p>
              <p className="text-green-700 text-sm">Signed in as: {user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4 pt-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="marketing" 
            className="text-brand-bronze border-gray-300"
            checked={formData.agreeMarketing}
            onCheckedChange={(checked) => updateFormData('agreeMarketing', checked)}
          />
          <label
            htmlFor="marketing"
            className="text-sm text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I'd like to receive marketing emails about tips, promotions, and platform updates
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="terms" 
            className="text-brand-bronze border-gray-300" 
            required
            checked={formData.agreeTerms}
            onCheckedChange={(checked) => updateFormData('agreeTerms', checked)}
          />
          <label
            htmlFor="terms"
            className="text-sm text-black leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I agree to the{" "}
            <Link to="/terms" className="text-brand-bronze hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-brand-bronze hover:underline">
              Privacy Policy
            </Link>*
          </label>
        </div>
      </div>
      
      <div className="bg-brand-bronze/10 border border-brand-bronze/20 p-4 rounded-md mt-4">
        <p className="text-sm text-black">
          <strong>Note:</strong> After submitting, our team will review your application and certifications. 
          This process typically takes 1-2 business days. You'll receive an email notification when your account is approved.
        </p>
      </div>
      
      <div className="pt-6 flex justify-between">
        <Button 
          onClick={onBack} 
          type="button"
          variant="outline"
          className="px-8 border-gray-300 text-gray-700 hover:bg-gray-100"
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button 
          type="submit"
          className="px-8 bg-brand-silver hover:bg-brand-silver/80 text-black"
          disabled={isSubmitting || 
            (!user && (!formData.password || formData.password !== formData.confirmPassword)) || 
            !formData.agreeTerms}
        >
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
              Submitting...
            </>
          ) : (
            user ? 'Submit Application' : 'Create Account & Submit'
          )}
        </Button>
      </div>
    </form>
  );
};

export default JoinAsPro;
