
import React from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { services } from "@/data/services";

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  const service = services.find((s) => s.id === id);
  
  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-black no-texture">
        <Navbar />
        <main className="flex-grow pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Service Not Found</h1>
            <p className="mb-6 text-muted-foreground">The service you're looking for doesn't exist.</p>
            <Link to="/services">
              <Button>Back to Services</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // In a real app, you would fetch these details from an API
  const serviceDetails = {
    duration: "60 min",
    price: "$75+",
    description: `Professional ${service.title.toLowerCase()} service delivered to your location by certified beauty professionals. Our experts bring all necessary equipment and products for a complete salon experience in the comfort of your chosen space.`,
    whatToExpect: [
      "Initial consultation to understand your preferences",
      "Professional setup of all equipment",
      "Premium products used for lasting results",
      "Post-service care instructions",
      "Quick cleanup after service completion"
    ]
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black no-texture">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Link to="/services" className="text-sm text-gray-600 hover:text-black mb-8 inline-block">
            ← Back to Services
          </Link>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">{service.title}</h1>
              
              <div className="flex items-center mb-6 text-black">
                <span className="mr-4">{serviceDetails.duration}</span>
                <span>{serviceDetails.price}</span>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-medium mb-3">Service Description</h2>
                <p className="text-gray-600">{serviceDetails.description}</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-medium mb-3">What to Expect</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-600">
                  {serviceDetails.whatToExpect.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div>
              <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-brand-bronze to-brand-silver/70">
                  <span className="text-black text-2xl" dangerouslySetInnerHTML={{ __html: service.icon }} />
                </div>
                
                <h3 className="text-xl text-black font-medium text-center mb-4">{service.title}</h3>
                <p className="text-center text-gray-600 mb-6">{service.description}</p>
                
                <Link to="/booking">
                  <Button className="w-full bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                    Book Now
                  </Button>
                </Link>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-black font-medium mb-2">Available For</h4>
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-secondary text-xs font-medium py-1 px-2 rounded">Home Visits</div>
                    <div className="bg-secondary text-xs font-medium py-1 px-2 rounded">Hotels</div>
                    <div className="bg-secondary text-xs font-medium py-1 px-2 rounded">Events</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ServiceDetail;
