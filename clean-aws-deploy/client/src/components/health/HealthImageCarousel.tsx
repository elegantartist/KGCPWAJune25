import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  
  const handleImageError = (error: any) => {
    console.error('Image failed to load:', images[currentIndex].src);
    setIsLoading(false);
  };

  return (
    <div 
      className={cn(
        "relative w-full h-full overflow-hidden bg-gray-900",
        "rounded-xl shadow-md min-h-[400px]",
        className
      )}
      style={{ minHeight: '400px', height: '100%' }}
    >
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-800/50">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-white font-medium">Loading...</span>
          </div>
        </div>
      )}
      
      {/* Carousel image */}
      <img 
        src={images[currentIndex].src} 
        alt={images[currentIndex].alt}
        className="w-full h-full object-cover transition-opacity duration-300"
        style={{ 
          opacity: isLoading ? 0 : 1,
          minHeight: '400px',
          width: '100%',
          height: '100%',
          display: 'block'
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="eager"
      />
        
      {/* Caption overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white p-4 z-20">
        <p className="text-sm font-medium text-center">{images[currentIndex].caption}</p>
      </div>
      
      {/* Navigation arrows */}
      <button 
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white/95 hover:scale-110 transition-all duration-200 shadow-lg z-20"
        onClick={goToPrevious}
        aria-label="Previous image"
      >
        <ChevronLeft size={20} className="text-gray-700" />
      </button>
      
      <button 
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-white/95 hover:scale-110 transition-all duration-200 shadow-lg z-20"
        onClick={goToNext}
        aria-label="Next image"
      >
        <ChevronRight size={20} className="text-gray-700" />
      </button>
      
      {/* Auto-play indicator */}
      <div className="absolute top-4 right-4 z-20">
        {autoPlay ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
          </div>
        )}
      </div>
      
      {/* Navigation dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-2 z-20">
        {images.map((_, slideIndex) => (
          <button
            key={slideIndex}
            onClick={() => goToSlide(slideIndex)}
            aria-label={`Go to slide ${slideIndex + 1}`}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all duration-200 hover:scale-125", 
              currentIndex === slideIndex 
                ? "bg-white shadow-lg scale-110" 
                : "bg-white/60 hover:bg-white/80"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default HealthImageCarousel;