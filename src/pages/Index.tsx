import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceCard from "@/components/ServiceCard";
import ProCard from "@/components/ProCard";
import { services } from "@/data/services";
import { professionals } from "@/data/professionals";

const Index = () => {
  // Get featured professionals (just the first 3)
  const featuredPros = professionals.slice(0, 3);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      // Set up event listeners
      const handleLoadedData = () => {
        setVideoLoaded(true);
        console.log('Video loaded successfully');
      };
      
      const handleError = (e: Event) => {
        console.error('Video failed to load:', e);
        setVideoError(true);
      };
      
      const handleCanPlay = () => {
        // Attempt to play the video
        video.play().catch(error => {
          console.log('Autoplay prevented:', error);
          // Fallback: show static background
          setVideoError(true);
        });
      };

      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleError);
      video.addEventListener("canplay", handleCanPlay);
      
      // Cleanup
      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        video.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section with Video Background */}
      <section className="relative flex items-center justify-center min-h-screen pt-16 text-white">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden hero-video-container">
          {!videoError ? (
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              loop 
              playsInline
              preload="metadata"
              webkit-playsinline="true"
              crossOrigin="anonymous"
              className={`w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            >
              <source src="https://ik.imagekit.io/pg1g5ievp/Mallory%20Maslynn%20BG%20Video%20(1).mp4?updatedAt=1746492244967" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : null}
          <div className="absolute inset-0 bg-black/40 z-0"></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Services at Your Doorstep</span> 
              <br />Anytime, Anywhere
            </h1>
            <p className="text-lg md:text-xl mb-6 text-gray-200">
              Your Life, Simplified. Tap. Book. Done.
            </p>
            <p className="text-md md:text-lg mb-8 text-gray-300 max-w-2xl mx-auto leading-relaxed">
              We're on a mission to make life easier by connecting you with qualified professionals who bring their services directly to your doorstep, whenever and wherever you need them.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/professionals">
                <Button className="text-lg bg-brand-bronze hover:bg-brand-bronze/80 text-white py-6 px-8">
                  Book Now
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" className="text-lg border-brand-silver bg-white text-black hover:bg-brand-silver/10 hover:text-white py-6 px-8">
                  Explore Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">Our Services</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our range of premium mobile services, delivered by certified professionals directly to you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Book your services in just a few simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 rounded-full bg-brand-bronze flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-medium mb-2">Choose a Service</h3>
              <p className="text-gray-600">Browse our diverse range of services and select what you need.</p>
            </div>
            <div className="text-center p-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 rounded-full bg-brand-bronze flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-medium mb-2">Book a Professional</h3>
              <p className="text-gray-600">Select a certified professional based on availability and ratings.</p>
            </div>
            <div className="text-center p-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <div className="w-16 h-16 rounded-full bg-brand-bronze flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-medium mb-2">Enjoy Your Service</h3>
              <p className="text-gray-600">Relax as your professional comes to you at your preferred time and location.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Professionals */}
      <section className="py-20 bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">Featured Professionals</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Meet our top-rated certified professionals ready to serve you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPros.map((pro) => (
              <ProCard
                key={pro.id}
                id={pro.id}
                name={pro.name}
                services={pro.services}
                rating={pro.rating}
                image={pro.image}
                verified={pro.verified}
              />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/professionals">
              <Button className="bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                View All Professionals
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">Client Testimonials</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See what our clients are saying about their experiences.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-brand-bronze"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "I've been getting my lashes done for years, but Jessica's mobile service is a game-changer. So convenient and professional!"
              </p>
              <div className="font-medium">- Samantha T.</div>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-brand-bronze"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Aisha gives the best spray tans I've ever had, and she comes right to my home. Worth every penny!"
              </p>
              <div className="font-medium">- Michael B.</div>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-brand-bronze/20">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-brand-bronze"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "I was nervous about getting a tattoo, but James made the experience so comfortable. His talent is incredible!"
              </p>
              <div className="font-medium">- Rebecca W.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50 text-gray-900 relative border-t border-b border-gray-200">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-6">Ready to Simplify Your Life?</h2>
            <p className="text-lg mb-8 text-gray-600">
              Book your first appointment today and experience the convenience of mobile services at your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/booking">
                <Button className="bg-brand-bronze hover:bg-brand-bronze/80 text-white">
                  Book Now
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline" className="border-brand-bronze text-black hover:bg-brand-bronze/10">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
