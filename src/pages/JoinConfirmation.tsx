import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";

const JoinConfirmation = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 bg-brand-cream">
        <div className="container max-w-3xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            
            <h1 className="text-3xl font-bold text-black mb-4">
              Application Submitted Successfully!
            </h1>
            
            <div className="space-y-4 text-black mb-8">
              <p>
                Thank you for applying to join Miche Mobile as a mobile professional. 
                We've received your application and certifications.
              </p>
              
              <p>
                Our team will review your credentials and verify your professional status.
                This process typically takes 1-3 business days.
              </p>
              
              <p>
                You'll receive an email notification once your account has been verified,
                at which point you can start accepting bookings from clients.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-md mt-6 border border-gray-200">
                <h3 className="font-medium text-black mb-2">What happens next?</h3>
                <ol className="list-decimal list-inside text-left space-y-2 text-black">
                  <li>Our team reviews your professional certifications</li>
                  <li>Your account is verified (typically within 1-3 business days)</li>
                  <li>You receive a confirmation email</li>
                  <li>You can log in and start accepting bookings</li>
                </ol>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Link to="/">
                  Return to Home
                </Link>
              </Button>
              
              <Button asChild className="bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                <Link to="/login">
                  Go to Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default JoinConfirmation;
