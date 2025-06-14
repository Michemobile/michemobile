export interface Service {
  id: string;
  title: string;
  icon: string;
  description: string;
  link: string;
  price?: string;
  duration?: string;
}

export const services: Service[] = [
  {
    id: "beauty-wellness",
    title: "Beauty & Wellness",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-makeup"><path d="M8 8c.5-1 2.5-1 2.5-1"/><path d="M11 2c0 3 1.5 5 3 5"/><path d="m11 2-1 1"/><path d="M11.5 14.5a3 3 0 0 0-3 3h9a3 3 0 0 0-3-3h-3z"/><path d="M16 20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2h8v2z"/><path d="M16.5 13.5c.83 0 1.5-.67 1.5-1.5v-1c0-1.1-.9-2-2-2h-8c-1.1 0-2 .9-2 2v1c0 .83.67 1.5 1.5 1.5"/></svg>',
    description: "Experience professional beauty and wellness services in the comfort of your home.",
    link: "/services/beauty-wellness",
    price: "Price Varies",
    duration: "Duration Varies"
  },
  {
    id: "auto-care",
    title: "Auto Care",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
    description: "Mobile auto services from oil changes to detailing, right in your driveway.",
    link: "/services/auto-care",
    price: "Price Varies",
    duration: "Duration Varies"
  },
  {
    id: "pet-services",
    title: "Pet Services",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dog"><path d="M10 5.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0z"/><path d="M8.5 8.5c-.5 0-1 .7-1 1.5v9.8c0 .6.4 1.2 1 1.2h8c.5 0 1-.6 1-1.2v-9.8c0-.8-.4-1.5-1-1.5z"/><path d="M18 12v-2c0-.5-.2-1-.6-1.4A1.9 1.9 0 0 0 16 8h-2"/><path d="M10 8H8a2 2 0 0 0-2 2v2"/><path d="M16 16c.9 0 1.6-.7 1.6-1.6v-2.8a1.6 1.6 0 0 0-3.2 0v2.8c0 .9.7 1.6 1.6 1.6z"/><path d="M8 16c.9 0 1.6-.7 1.6-1.6v-2.8a1.6 1.6 0 0 0-3.2 0v2.8c0 .9.7 1.6 1.6 1.6z"/></svg>',
    description: "Professional pet grooming, walking, and care services that come to you.",
    link: "/services/pet-services",
    price: "Price Varies",
    duration: "Duration Varies"
  },
  {
    id: "food-trucks",
    title: "Food Trucks",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2"/><path d="M18 15V2"/><path d="M21 15a3 3 0 1 1-6 0"/></svg>',
    description: "Bring the restaurant experience to your event with on-demand food truck services.",
    link: "/services/food-trucks",
    price: "Price Varies",
    duration: "Duration Varies"
  },
  {
    id: "home-services",
    title: "Home Services",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    description: "From plumbing to electrical work, get professional home services on demand.",
    link: "/services/home-services",
    price: "Price Varies",
    duration: "Duration Varies"
  },
  {
    id: "tech-services",
    title: "Tech Services",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-laptop"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>',
    description: "On-site tech support and repair for all your devices and technology needs.",
    link: "/services/tech-services",
    price: "Price Varies",
    duration: "Duration Varies"
  },
  {
    id: "eco-services",
    title: "Eco-Friendly Services",
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-leaf"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    description: "Sustainable and eco-friendly services from solar consultations to green cleaning.",
    link: "/services/eco-services",
    price: "Price Varies",
    duration: "Duration Varies"
  }
];
