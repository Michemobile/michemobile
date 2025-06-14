import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceCard from "@/components/ServiceCard";
import { services } from "@/data/services";
import { categorizedServices } from "@/data/categorizedServices";

const Services = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-6">Our Services</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We offer a wide range of mobile services, all delivered by certified professionals
              at your preferred location and time.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                id={service.id}
                title={service.title}
                icon={service.icon}
                description={service.description}
                price={service.price}
                duration={service.duration}
              />
            ))}
          </div>
          
          {/* Categorized Services */}
          <div className="mt-16">
            <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-10 text-center">Services Our Professionals Provide</h2>
            
            {Object.entries(categorizedServices).map(([category, categoryServices]) => (
              <div key={category} className="mb-16">
                <h3 className="text-xl md:text-2xl font-semibold mb-6 text-gray-800 border-b border-gray-200 pb-2">{category}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryServices.map((service, index) => {
                    const serviceId = `${category.toLowerCase().replace(/\s+/g, '-')}-${service.title.toLowerCase().replace(/\s+/g, '-')}`;
                    return (
                      <div
                        key={index}
                        className={`bg-white p-5 rounded-lg border border-gray-200 hover:shadow-md hover:border-brand-bronze/50 transition-all cursor-pointer`}
                        onClick={() => navigate(`/professionals?serviceId=${encodeURIComponent(serviceId)}&serviceTitle=${encodeURIComponent(service.title)}`)}
                      >
                        <h4 className="text-lg font-medium text-gray-900 mb-2">{service.title}</h4>
                        <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                        {service.price && <p className="text-sm font-semibold text-brand-bronze mb-1">{service.price}</p>}
                        {service.duration && <p className="text-xs text-gray-500 mb-2">{service.duration}</p>}
                        {service.stats && (
                          <p className="text-xs text-gray-500 italic">{service.stats}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16 bg-white p-8 rounded-lg border border-border">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold gradient-text mb-4">How Our Services Work</h2>
              <p className="text-gray-600">
                Getting services at your convenience has never been easier.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-bronze flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Book Your Service</h3>
                <p className="text-gray-600">
                  Choose a service and select a certified professional based on their portfolio and reviews.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-bronze flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Confirm Your Booking</h3>
                <p className="text-gray-600">
                  Once your professional accepts your booking, you'll receive a confirmation with all the details.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-bronze flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Enjoy Your Service</h3>
                <p className="text-gray-600">
                  Your professional will arrive at your location at the scheduled time with all necessary equipment.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold gradient-text mb-6">Explore Our Offerings or Join Our Team</h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Click on any service above to find professionals, or if you're a service provider, join our growing network!
            </p>
            <div className="flex justify-center">
              <Link to="/join-as-pro">
                <Button variant="outline" className="border-brand-bronze text-brand-bronze hover:bg-brand-bronze/10 font-medium py-3 px-8 rounded-md transition-colors">
                  Join as a Professional
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Services;
