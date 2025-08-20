import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Import images from assets
import image1Path from "@assets/KGCLady4_1746595967200.jpeg";
import image2Path from "@assets/KGCLady3_1746596042812.jpeg";
import image3Path from "@assets/KGCMan1_1746596109871.jpeg";
import image4Path from "@assets/KGC AZ female_1746596130478.jpeg";
import image5Path from "@assets/obese KGC assistance zones_1746596152342.jpeg";
import image6Path from "@assets/KGClady1_1746596184567.jpeg";
import image7Path from "@assets/a_blonde_and_beautiful_female_person_with_1746596229289.jpeg";

interface SimpleCarouselProps {
  className?: string;
}

const SimpleCarousel: React.FC<SimpleCarouselProps> = ({ className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const images = [
    { src: image1Path, alt: "Health Journey", caption: "Start your health journey today" },
    { src: image2Path, alt: "Wellness Support", caption: "Support for your wellness goals" },
    { src: image3Path, alt: "Active Lifestyle", caption: "Embrace an active lifestyle" },
    { src: image4Path, alt: "Personal Growth", caption: "Focus on personal growth" },
    { src: image5Path, alt: "Assistance Zones", caption: "Know your assistance zones" },
    { src: image6Path, alt: "Healthy Living", caption: "Enjoy healthy living every day" },
    { src: image7Path, alt: "Wellness Goals", caption: "Achieve your wellness goals" }
  ];

  // Auto rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={cn("relative w-full h-full bg-gray-100 rounded-xl overflow-hidden", className)}>
      {/* Main image */}
      <div className="relative w-full h-full">
        <img
          src={images[currentIndex].src}
          alt={images[currentIndex].alt}
          className="w-full h-full object-cover object-top"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Motivational Message Overlay */}
        <div className="absolute bottom-2 left-0 right-0 bg-black/60 text-white text-center py-2 px-4">
          <p className="text-sm font-medium">{images[currentIndex].caption}</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleCarousel;