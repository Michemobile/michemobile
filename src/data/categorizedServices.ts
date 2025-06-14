export interface CategorizedService {
  title: string;
  description: string;
  stats?: string;
  price?: string;
  duration?: string;
}

type ServiceCategories = {
  [category: string]: CategorizedService[];
};

export const categorizedServices: ServiceCategories = {
  "Automotive Services": [
    {
      title: "Mobile Car Detailing/Wash",
      description: "Offer exterior/interior cleaning, waxing, and polishing at clients' homes or offices.",
      stats: "High demand with average annual revenue of $73,100 and 16.1% profit margins"
    },
    {
      title: "Mobile Mechanic",
      description: "Provide on-site repairs, oil changes, or tire replacements for vehicles.",
      stats: "Low startup costs and premium pricing for emergency services"
    },
    {
      title: "Auto Detailing Subscription Service",
      description: "Recurring revenue by offering monthly wash packages for busy car owners.",
      stats: "Steady monthly income through subscription model",
      price: "Price Varies",
      duration: "Duration Varies"
    }
  ],
  "Pet Services": [
    {
      title: "Mobile Pet Grooming",
      description: "Bathe, trim, and groom pets at clients' homes, reducing travel stress for animals.",
      stats: "Industry projected to grow at 7.09% CAGR through 2030"
    },
    {
      title: "Mobile Veterinary Clinic",
      description: "Offer vaccinations, check-ups, and emergency care for pets at their homes.",
      stats: "Appeals to busy pet owners and reduces overhead costs"
    },
    {
      title: "Pet Sitting/Dog Walking",
      description: "Cater to pet owners needing daily care or vacation support for their animals.",
      stats: "Flexible scheduling with repeat clients",
      price: "Price Varies",
      duration: "Duration Varies"
    }
  ],
  "Beauty & Wellness": [
    {
      title: "Mobile Hairdressing/Barber",
      description: "Cut and style hair at homes or offices, eliminating salon wait times.",
      stats: "Targets busy professionals and elderly clients"
    },
    {
      title: "Mobile Massage Therapy",
      description: "Provide relaxation or therapeutic massages in clients' homes, hotels, or offices.",
      stats: "Industry projected to reach $30 billion"
    },
    {
      title: "Mobile Nail Salon/Manicurist",
      description: "Offer gel nails, pedicures, and waxing services at clients' preferred locations.",
      stats: "Appeals to event-goers and time-strapped individuals"
    },
    {
      title: "Mobile Yoga/Fitness Training",
      description: "Conduct sessions in parks, homes, or corporate offices with personalized instruction.",
      stats: "Focus on personalized workouts or group classes",
      price: "Price Varies",
      duration: "Duration Varies"
    }
  ],
  "Food & Beverage": [
    {
      title: "Food Truck",
      description: "Specialize in niche cuisines (e.g., vegan, tacos, desserts) at events and high-traffic areas.",
      stats: "U.S. market expected to hit $1.4 billion in 2024"
    },
    {
      title: "Mobile Coffee Cart",
      description: "Serve high-quality coffee at events, offices, or farmers' markets with minimal overhead.",
      stats: "Global coffee market value over $100 billion"
    },
    {
      title: "Ice Cream Truck",
      description: "Sell nostalgic treats in neighborhoods or at festivals with seasonal flexibility.",
      stats: "Profitable due to low-cost 'mini-indulgence' demand"
    },
    {
      title: "Mobile Catering/Pizza Van",
      description: "Provide meals for weddings, corporate events, or pop-up parties with custom menus.",
      stats: "High demand for authentic mobile dining experiences",
      price: "Price Varies",
      duration: "Duration Varies"
    }
  ],
  "Home & Lifestyle Services": [
    {
      title: "Mobile Cleaning Services",
      description: "Offer Airbnb turnovers, deep cleaning, or post-event cleanup services.",
      stats: "Entrepreneurs like Chris Mondragon earn over $125K/month"
    },
    {
      title: "Handyman/Repair Services",
      description: "Fix plumbing, electrical issues, or furniture at clients' homes or businesses.",
      stats: "Charge premiums for emergency repairs and specialized skills"
    },
    {
      title: "Junk Removal",
      description: "Clear out basements, offices, or construction sites with eco-friendly disposal.",
      stats: "Opportunity to resell items for extra profit"
    },
    {
      title: "Pressure Washing",
      description: "Clean driveways, decks, and siding with professional equipment.",
      stats: "Startup costs as low as a pressure washer and attachments",
      price: "Price Varies",
      duration: "Duration Varies"
    }
  ],
  "Tech & Specialty Services": [
    {
      title: "Mobile Electronics Repair",
      description: "Fix smartphones, tablets, or laptops on-site with quick turnaround times.",
      stats: "Growing demand with increased device reliance"
    },
    {
      title: "Drone Photography/Videography",
      description: "Capture aerial shots for real estate, weddings, or marketing campaigns.",
      stats: "Unique perspective for various industries"
    },
    {
      title: "Mobile Bookkeeping/Consulting",
      description: "Assist small businesses with accounting or IT support remotely or on-site.",
      stats: "Essential service for small business operations"
    },
    {
      title: "Mobile Event Planning",
      description: "Organize weddings, parties, or corporate events with personalized service.",
      stats: "Industry valued at $500 billion globally",
      price: "Price Varies",
      duration: "Duration Varies"
    }
  ],
  "Sustainability & Niche Markets": [
    {
      title: "Refill Station",
      description: "Sell eco-friendly detergents, soaps, and shampoos at farmers' markets or door-to-door.",
      stats: "Growing demand for plastic-free alternatives"
    },
    {
      title: "Mobile Farmer's Market",
      description: "Deliver fresh produce, eggs, and flowers to urban areas or food deserts.",
      stats: "Support local agriculture and sustainability"
    },
    {
      title: "Cloth Diaper Delivery",
      description: "Provide clean diapers and pick up used ones for eco-conscious parents.",
      stats: "Eco-friendly alternative to disposable options"
    },
    {
      title: "Beekeeping Consultant",
      description: "Install hives and educate clients on urban beekeeping practices.",
      stats: "Unique service with environmental benefits",
      price: "Price Varies",
      duration: "Duration Varies"
    }
  ],
  "Creative & Retail Services": [
    {
      title: "Mobile Bookstore",
      description: "Sell curated books at parks, festivals, or underserved communities.",
      stats: "Bring literature to areas without bookstores"
    },
    {
      title: "Vintage Clothing Truck",
      description: "Offer retro fashion at pop-up markets or downtown areas with rotating inventory.",
      stats: "Unique shopping experience with sustainability angle"
    },
    {
      title: "Mobile Art Gallery",
      description: "Display and sell artwork at cultural events or parks with changing exhibitions.",
      stats: "Connect artists directly with buyers"
    },
    {
      title: "Mobile Florist",
      description: "Deliver bouquets for events or self-care with seasonal offerings.",
      stats: "Perishable but high-demand product"
    }
  ]
}; 