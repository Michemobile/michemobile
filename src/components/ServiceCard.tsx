import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

interface ServiceCardProps {
  id: string;
  title: string;
  icon: string;
  description: string;
  price?: string;
  duration?: string;
  // link prop might be useful if service IDs are not URL-friendly, but we're using title for now
}

export default function ServiceCard({
  id,
  title,
  icon,
  description,
  price,
  duration,
}: ServiceCardProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`/professionals?serviceId=${encodeURIComponent(id)}&serviceTitle=${encodeURIComponent(title)}`);
  };
  return (
    <Card
      className={`service-card bg-gray-50 text-gray-900 h-full shadow-lg hover:shadow-brand-bronze/20 cursor-pointer transition-all border border-brand-bronze/20 hover:border-brand-bronze/50`}
      onClick={handleNavigate}
    >
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-brand-bronze to-brand-silver/70">
          <span className="text-white text-2xl" dangerouslySetInnerHTML={{ __html: icon }} />
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        {price && <p className="text-sm font-semibold text-brand-bronze mb-1">{price}</p>}
        {duration && <p className="text-xs text-gray-500">{duration}</p>}
      </CardContent>
    </Card>
  );
}
