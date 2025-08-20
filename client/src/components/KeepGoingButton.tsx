import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from 'lucide-react';
import { createHapticFeedback } from "@/lib/hapticFeedback";
import EnhancedImageStore from "@/lib/enhancedImageStore";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

interface KeepGoingButtonProps {
  userId: number;
  className?: string;
}

/**
 * Simple, robust Keep Going Button component
 * 
 * This button triggers the Keep Going sequence:
 * 1. Plays physiological sigh video
 * 2. Shows user's motivational image overlay
 * 3. Records usage for Supervisor Agent tracking
 */
export const KeepGoingButton: React.FC<KeepGoingButtonProps> = ({ 
  userId, 
  className 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showPlayPrompt, setShowPlayPrompt] = useState(true);
  const isMobile = useIsMobile();

  // Fetch user's motivational image
  const { data: savedImage } = useQuery({
    queryKey: ['/api/users', userId, 'motivational-image'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}/motivational-image`);
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error('Failed to fetch motivational image');
        }
        return await response.json();
      } catch (error) {
        console.log('No saved image found - this is normal for new users');
        return null;
      }
    },
    enabled: !!userId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Update overlay image when data changes
  useEffect(() => {
    if (savedImage && savedImage.imageData) {
      console.log("KeepGoingButton: Found motivational image in database");
      setOverlayImage(savedImage.imageData);
      
      // Update global stores for cross-component compatibility
      EnhancedImageStore.setImage(savedImage.imageData);
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = savedImage.imageData;
      }
    } else if (typeof window !== 'undefined' && window.__KGC_ENHANCED_IMAGE__) {
      console.log("KeepGoingButton: Using image from global store");
      setOverlayImage(window.__KGC_ENHANCED_IMAGE__);
    } else {
      const storeImage = EnhancedImageStore.getImage();
      if (storeImage) {
        console.log("KeepGoingButton: Using image from enhanced store");
        setOverlayImage(storeImage);
      }
    }
  }, [savedImage]);

  // Record Keep Going usage for Supervisor Agent
  const recordKeepGoingUsage = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/feature-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureName: 'KeepGoing'
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to record Keep Going usage:', await response.text());
      } else {
        console.log('Keep Going usage recorded for PPR tracking');
      }
    } catch (error) {
      console.warn('Error recording Keep Going usage:', error);
      // Non-blocking - continue with video playback
    }
  };

  // Handle Keep Going button click
  const handleKeepGoingClick = async () => {
    try {
      console.log('Keep Going button clicked - starting sequence');
      
      // Visual and haptic feedback
      setIsActive(true);
      createHapticFeedback(2000, true); // 2 seconds with sound
      
      // Record usage in background (non-blocking)
      recordKeepGoingUsage().catch(console.warn);
      
      // Show video with overlay
      setShowVideo(true);
      
      // Reset button state
      setTimeout(() => setIsActive(false), 2000);
      
    } catch (error) {
      console.error('Error in Keep Going sequence:', error);
      // Ensure video still plays even if other parts fail
      setShowVideo(true);
      setIsActive(false);
    }
  };

  // Close video modal
  const closeVideo = () => {
    setShowVideo(false);
    setVideoLoaded(false);
    setShowPlayPrompt(true);
  };

  // Handle play button click
  const handlePlayClick = () => {
    setShowPlayPrompt(false);
    console.log('Play button clicked - starting video');
    
    // Find the video element and start playback
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      videoElement.play().catch(error => {
        console.error('Failed to play video:', error);
      });
    }
  };

  return (
    <>
      {/* Keep Going Button */}
      <Button 
        className={cn(
          "w-full flex items-center justify-center text-white rounded-xl",
          "metallic-blue",
          "h-16 sm:h-18 md:h-20 lg:h-22",
          "text-sm sm:text-base md:text-lg lg:text-xl font-semibold",
          "transition-all duration-300 hover:scale-105",
          isActive && "btn-vibrate",
          className
        )} 
        size="lg"
        onClick={handleKeepGoingClick}
        disabled={isActive}
      >
        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-1 sm:mr-2 flex-shrink-0" />
        <span>Keep Going</span>
      </Button>

      {/* Simplified Video Modal */}
      {showVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the video
            if (e.target === e.currentTarget) {
              closeVideo();
            }
          }}
        >
          {/* Close button */}
          <button 
            onClick={closeVideo}
            className="absolute top-6 right-6 text-white bg-red-600 hover:bg-red-700 rounded-full p-3 z-20 transition-colors"
            aria-label="Close video"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Video container */}
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
            {/* Loading indicator */}
            {!videoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Loading physiological sigh video...</p>
                </div>
              </div>
            )}
            
            {/* Click to play prompt */}
            {showPlayPrompt && videoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-15 cursor-pointer" onClick={handlePlayClick}>
                <div className="text-white text-center bg-blue-600 hover:bg-blue-700 px-8 py-6 rounded-lg shadow-lg transition-colors">
                  <div className="text-5xl mb-3">▶</div>
                  <p className="font-semibold text-lg">Start Breathing</p>
                  <p className="text-sm opacity-90">Physiological Sigh Technique</p>
                </div>
              </div>
            )}
            
            {/* Local MP4 video with reliable audio/video playback */}
            <video
              key={showVideo ? 'playing' : 'stopped'}
              className="absolute inset-0 w-full h-full object-cover z-10"
              controls
              autoPlay
              playsInline
              preload="auto"
              onLoadedData={() => {
                console.log('Local video loaded successfully');
                setVideoLoaded(true);
                // Auto-hide the play prompt after 2 seconds since local video is more reliable
                setTimeout(() => {
                  if (showPlayPrompt) {
                    setShowPlayPrompt(false);
                  }
                }, 2000);
              }}
              onError={() => console.error('Local video failed to load')}
              onPlay={() => console.log('Video started playing')}
              onEnded={() => {
                console.log('Video ended, closing modal');
                setTimeout(() => closeVideo(), 1000);
              }}
            >
              <source src="/videos/physiological-sigh.mp4" type="video/mp4" />
              <p className="text-white text-center p-4">
                Your browser does not support the video tag. Please try a different browser.
              </p>
            </video>
            
            {/* Motivational Image Overlay */}
            {overlayImage && (
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className="relative w-[90%] h-[90%] flex items-center justify-center">
                  <img 
                    src={overlayImage} 
                    alt="Your motivational image" 
                    className="w-auto h-auto max-w-full max-h-full object-contain opacity-85"
                    style={{ 
                      mixBlendMode: 'overlay',
                      filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.8))'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Instructional text overlay */}
            {!showPlayPrompt && (
              <div className="absolute bottom-6 left-6 right-6 z-30 text-center pointer-events-none">
                <p className="text-white text-sm md:text-base bg-black/80 px-4 py-2 rounded-lg backdrop-blur-sm">
                  {overlayImage 
                    ? "Breathe along with the video while focusing on your motivational image"
                    : "Follow the physiological sigh breathing technique in the video"
                  }
                </p>
                
                {/* Audio enablement hint */}
                <p className="text-white/80 text-xs mt-2 bg-black/60 px-3 py-1 rounded backdrop-blur-sm">
                  Two deep inhales through nose, long exhale through mouth
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default KeepGoingButton;