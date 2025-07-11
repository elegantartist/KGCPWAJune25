import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile"; // Corrected import path

// Import images from assets
import image1Path from "@assets/KGCLady4_1746595967200.jpeg";
import image2Path from "@assets/KGCLady3_1746596042812.jpeg";
import image3Path from "@assets/KGCMan1_1746596109871.jpeg";
import image4Path from "@assets/KGC AZ female_1746596130478.jpeg";
import image5Path from "@assets/obese KGC assistance zones_1746596152342.jpeg";
import image6Path from "@assets/KGClady1_1746596184567.jpeg";
import image7Path from "@assets/a_blonde_and_beautiful_female_person_with_1746596229289.jpeg";

interface HealthImageCarouselProps {
  className?: string;
  fullscreenBackground?: boolean;
}

const HealthImageCarousel: React.FC<HealthImageCarouselProps> = ({
  className,
  fullscreenBackground = true // Default to fullscreen background
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const isMobile = useIsMobile();

  // Auto-rotation effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (autoPlay) {
      intervalId = setInterval(() => {
        goToNext();
      }, 5000); // Change slide every 5 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentIndex, autoPlay]);
  
  // Pause auto-rotation when user interacts with carousel
  const pauseAutoPlay = () => {
    setAutoPlay(false);
    // Resume auto-rotation after 30 seconds of inactivity
    setTimeout(() => setAutoPlay(true), 30000);
  };
  
  const images = [
    { src: image1Path, alt: "Health Journey", caption: "Start your health journey today" },
    { src: image2Path, alt: "Wellness Support", caption: "Support for your wellness goals" },
    { src: image3Path, alt: "Active Lifestyle", caption: "Embrace an active lifestyle" },
    { src: image4Path, alt: "Personal Growth", caption: "Focus on personal growth" },
    { src: image5Path, alt: "Assistance Zones", caption: "Know your assistance zones" },
    { src: image6Path, alt: "Healthy Living", caption: "Enjoy healthy living every day" },
    { src: image7Path, alt: "Wellness Goals", caption: "Achieve your wellness goals" }
  ];

  const goToPrevious = () => {
    pauseAutoPlay();
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const goToSlide = (slideIndex: number) => {
    pauseAutoPlay();
    setCurrentIndex(slideIndex);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div 
      className={cn(
        "relative w-full overflow-hidden",
        fullscreenBackground && isMobile ? "absolute inset-0 z-[-1]" : "rounded-xl shadow-md h-full",
        className
      )}
    >
      {/* Fullscreen background styling */}
      <div className={cn(
        "relative flex items-center justify-center",
        fullscreenBackground && isMobile ? "h-screen" : "h-full w-full bg-gray-50 py-2"
      )}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Background image with opacity */}
        {fullscreenBackground && isMobile && (
          <div className="absolute inset-0 z-0">
            <img 
              src={images[currentIndex].src} 
              alt={images[currentIndex].alt}
              className="w-full h-full opacity-40"
              style={{
                objectFit: "cover",
                objectPosition: "center 20%",
                filter: "brightness(0.7)"
              }}
            />
            <div className="absolute inset-0 bg-[#2E8BC0]/30"></div>
          </div>
        )}
        
        {/* Foreground image */}
        <img 
          src={images[currentIndex].src} 
          alt={images[currentIndex].alt}
          className={cn(
            "transition-opacity duration-300 z-10",
            fullscreenBackground && isMobile 
              ? "w-auto h-auto max-w-[90%] max-h-[70vh] rounded-lg shadow-xl" 
              : "w-full h-full rounded-xl",
            isMobile ? "object-position-face" : "object-contain",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          style={{
            objectFit: isMobile ? "cover" : "contain",
            objectPosition: isMobile ? "center 20%" : "center center"
          }}
          onLoad={handleImageLoad}
          onError={() => setIsLoading(false)}
        />
        
        {/* Caption overlay */}
        <div className={cn(
          "absolute left-0 right-0 bg-black/40 text-white p-2 text-center text-sm z-20",
          fullscreenBackground && isMobile ? "bottom-[40%]" : "bottom-0"
        )}>
          {images[currentIndex].caption}
        </div>
        
        {/* Left Arrow */}
        <button 
          className={cn(
            "absolute left-2 -translate-y-1/2 bg-white/70 rounded-full p-1.5 cursor-pointer hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary z-20",
            fullscreenBackground && isMobile ? "top-[35%]" : "top-1/2"
          )}
          onClick={goToPrevious}
          aria-label="Previous image"
        >
          <ChevronLeft size={isMobile ? 16 : 20} />
        </button>
        
        {/* Right Arrow */}
        <button 
          className={cn(
            "absolute right-2 -translate-y-1/2 bg-white/70 rounded-full p-1.5 cursor-pointer hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-primary z-20",
            fullscreenBackground && isMobile ? "top-[35%]" : "top-1/2"
          )}
          onClick={goToNext}
          aria-label="Next image"
        >
          <ChevronRight size={isMobile ? 16 : 20} />
        </button>
        
        {/* Small indicator for auto-play status */}
        <div className="absolute top-2 right-2 text-xs z-20">
          {autoPlay ? (
            <div className="bg-white/70 rounded-full p-1" title="Auto-playing slides">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
            </div>
          ) : (
            <div className="bg-white/70 rounded-full p-1" title="Auto-play paused">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-500"></div>
            </div>
          )}
        </div>
        
        {/* Dots */}
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 flex gap-2 z-20",
          fullscreenBackground && isMobile ? "bottom-[35%]" : "bottom-12"
        )}>
          {images.map((_, slideIndex) => (
            <button
              key={slideIndex}
              onClick={() => goToSlide(slideIndex)}
              aria-label={`Go to slide ${slideIndex + 1}`}
              className={cn(
                "cursor-pointer h-2 w-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary", 
                currentIndex === slideIndex ? "bg-primary" : "bg-white/70"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthImageCarousel;