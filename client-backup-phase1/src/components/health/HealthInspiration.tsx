import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import healthInspirationImage from "@/assets/health_inspiration.png";

interface HealthInspirationProps {
  className?: string;
}

const HealthInspiration: React.FC<HealthInspirationProps> = ({
  className
}) => {
  const inspiration = {
    src: healthInspirationImage,
    alt: "Healthy eating inspiration",
    quote: "Nutrition and movement are key pillars in your health journey."
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Health Inspiration</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <img 
            src={inspiration.src} 
            alt={inspiration.alt}
            className="w-full h-[200px] object-cover object-[center_25%]"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white font-medium italic">"{inspiration.quote}"</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthInspiration;