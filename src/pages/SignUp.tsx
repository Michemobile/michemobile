import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SignUp = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg border border-brand-bronze/20">
            <h1 className="text-2xl font-bold text-center text-black mb-2">Create an Account</h1>
            <p className="text-black text-center mb-8">Join as a client to book mobile services</p>
            
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name" className="text-black">First Name</Label>
                  <Input
                    id="first-name"
                    required
                    className="bg-white border-brand-silver/20 text-black"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last-name" className="text-black">Last Name</Label>
                  <Input
                    id="last-name"
                    required
                    className="bg-white border-brand-silver/20 text-black"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-black">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="bg-white border-brand-silver/20 text-black"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-black">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  className="bg-white border-brand-silver/20 text-black"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-black">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  className="bg-white border-brand-silver/20 text-black"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-black">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  className="bg-white border-brand-silver/20 text-black"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" className="text-brand-bronze border-brand-silver/50" />
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
                  </Link>
                </label>
              </div>
              
              <Button type="submit" className="w-full bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                Create Account
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-black">
              Already have an account?{" "}
              <Link to="/login" className="text-brand-bronze hover:underline">
                Sign in
              </Link>
            </div>
            
            <div className="mt-8 p-4 bg-white rounded-md border border-brand-bronze/10">
              <p className="text-sm text-center text-black">
                Looking to join as a beauty professional?{" "}
                <Link to="/join-as-pro" className="text-brand-bronze hover:underline">
                  Apply here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SignUp;
