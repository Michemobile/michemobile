import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-6">How Míche Mobile Works</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform connects clients with certified mobile professionals across multiple service categories.
              Here's everything you need to know about using our service.
            </p>
          </div>
          
          {/* For Clients */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">For Clients</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-bronze flex items-center justify-center mb-4">
                  <span className="text-white text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Create an Account</h3>
                <p className="text-gray-600">
                  Sign up with your email and complete your profile. Let us know your service preferences
                  through our onboarding questionnaire.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-bronze flex items-center justify-center mb-4">
                  <span className="text-white text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Browse Services & Professionals</h3>
                <p className="text-gray-600">
                  Explore our range of services from beauty to auto care, tech support, pet services and more. 
                  Find certified professionals in your area by filtering for service type, rating, and availability.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-bronze flex items-center justify-center mb-4">
                  <span className="text-white text-xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Book Your Appointment</h3>
                <p className="text-gray-600">
                  Select a date and time that works for you. Your booking request will be sent to the
                  professional for confirmation.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-bronze flex items-center justify-center mb-4">
                  <span className="text-white text-xl font-bold">4</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Enjoy & Pay</h3>
                <p className="text-gray-600">
                  The professional will come to your location with all necessary equipment.
                  After the service is complete, payment is processed automatically.
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <Link to="/signup">
                <Button className="bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                  Sign Up as a Client
                </Button>
              </Link>
            </div>
          </div>
          
          {/* For Professionals */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">For Service Professionals</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-silver flex items-center justify-center mb-4">
                  <span className="text-black text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Apply to Join</h3>
                <p className="text-gray-600">
                  Create a professional account and complete our onboarding questionnaire. You'll need to upload
                  your certification documents and relevant qualifications for verification.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-silver flex items-center justify-center mb-4">
                  <span className="text-black text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Get Verified</h3>
                <p className="text-gray-600">
                  Our team will review your certifications and background. Once approved, you'll receive
                  the verified badge on your profile.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-silver flex items-center justify-center mb-4">
                  <span className="text-black text-xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Accept Bookings</h3>
                <p className="text-gray-600">
                  Receive booking requests from clients and manage your schedule. You have the flexibility
                  to accept appointments that work with your availability.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <div className="w-12 h-12 rounded-full bg-brand-silver flex items-center justify-center mb-4">
                  <span className="text-black text-xl font-bold">4</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Provide Services & Get Paid</h3>
                <p className="text-gray-600">
                  Deliver exceptional services to clients at their location. Once the service is complete,
                  you'll receive instant payment (minus the 10% platform fee).
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <Link to="/join-as-pro">
                <Button className="bg-brand-silver hover:bg-brand-silver/80 text-black">
                  Apply as a Professional
                </Button>
              </Link>
            </div>
          </div>
          
          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold gradient-text mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <h3 className="text-lg font-medium text-gray-900 mb-2">What areas do you serve?</h3>
                <p className="text-gray-600">
                  Our mobile professionals operate in major metropolitan areas. During the booking process,
                  you can verify if service is available at your location.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <h3 className="text-lg font-medium text-gray-900 mb-2">What types of services do you offer?</h3>
                <p className="text-gray-600">
                  We offer a wide range of services including beauty and wellness, auto care, pet services, food trucks,
                  home services, tech support, and eco-friendly services—all available on-demand at your location.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <h3 className="text-lg font-medium text-gray-900 mb-2">How does the payment process work?</h3>
                <p className="text-gray-600">
                  We handle all payments through our secure platform. Clients pay through the app after service completion,
                  and professionals receive instant payouts (minus the 10% platform fee).
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <h3 className="text-lg font-medium text-gray-900 mb-2">What if I need to cancel my appointment?</h3>
                <p className="text-gray-600">
                  You can cancel appointments up to 24 hours before the scheduled time without any charge.
                  Late cancellations may incur a fee.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <h3 className="text-lg font-medium text-gray-900 mb-2">How are professionals vetted?</h3>
                <p className="text-gray-600">
                  All professionals must provide certification documents, proof of insurance, and complete
                  our onboarding process. We verify credentials and backgrounds before approving profiles.
                </p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Can I request the same professional again?</h3>
                <p className="text-gray-600">
                  Yes! You can save professionals as favorites and request them directly for future appointments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default HowItWorks;
