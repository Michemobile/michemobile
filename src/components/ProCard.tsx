import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface ProCardProps {
  id: string;
  name: string;
  services: string[];
  rating: number;
  image: string;
  verified: boolean;
}

export default function ProCard({ id, name, services, rating, image, verified }: ProCardProps) {
  return (
    <Card className="overflow-hidden border border-brand-silver/20 bg-gray-50 text-gray-900 transition-all hover:shadow-md">
      <Link to={`/professionals/${id}`} className="block">
        <div className="relative cursor-pointer">
          <img
            src={image}
            alt={`${name}`}
            className="w-full h-64 object-cover"
          />
          {verified && (
            <Badge className="absolute top-2 right-2 bg-brand-bronze text-white">Verified</Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium text-lg">{name}</h3>
          <div className="flex items-center mt-1 mb-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${
                    i < rating ? "text-brand-bronze" : "text-gray-500"
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-1 text-sm text-gray-600">({rating})</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {services.map((service) => (
              <Badge key={service} variant="outline" className="bg-transparent border-brand-bronze text-xs text-gray-700">
                {service}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Link>
      <div className="px-4 pb-4">
        <Link to={`/booking?pro=${id}&name=${encodeURIComponent(name)}`}>
          <Button className="w-full bg-brand-bronze hover:bg-brand-bronze/80 text-white flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" /> Book Now
          </Button>
        </Link>
      </div>
    </Card>
  );
}
