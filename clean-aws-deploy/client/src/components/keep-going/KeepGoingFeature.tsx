import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from 'lucide-react';
import { createHapticFeedback } from "@/lib/hapticFeedback";
import EnhancedImageStore from "@/lib/enhancedImageStore";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

// Define YouTube API types for TypeScript
declare global {
  interface Window {
    YT: any;
    __KGC_ENHANCED_IMAGE__: string | null;
  }
}

// Interface for the component props
interface KeepGoingFeatureProps {
  userId: number;
  overlayImage?: string | null;
}

// YouTube video constants
const DEFAULT_VIDEO_ID = "bKYqK1R19hM";

/**
 * KeepGoingFeature component
 * 
 * A robust implementation of the Keep Going feature that is self-contained
 * and handles all errors properly.
 */
export const KeepGoingFeature: React.FC<KeepGoingFeatureProps> = ({ 
  userId, 
  overlayImage: propOverlayImage 
}) => {
  // Get responsive layout information
  const isMobile = useIsMobile();
  
  // State to manage the overlay image
  const [overlayImage, setOverlayImage] = useState<string | null>(propOverlayImage || null);
  
  // Fetch the motivational image from the database on component mount
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
        console.error('Error fetching motivational image:', error);
        return null;
      }
    },
    enabled: !!userId,
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Update overlay image when data changes or component mounts
  useEffect(() => {
    // If we have a prop, use it first
    if (propOverlayImage) {
      console.log("KeepGoingFeature: Using image from props");
      setOverlayImage(propOverlayImage);
      return;
    }
    
    // Otherwise check database result
    if (savedImage && savedImage.imageData) {
      console.log("KeepGoingFeature: Found image in database");
      setOverlayImage(savedImage.imageData);
      
      // Also update global stores for cross-component compatibility
      EnhancedImageStore.setImage(savedImage.imageData);
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = savedImage.imageData;
      }
      return;
    }
    
    // Fall back to window global
    if (typeof window !== 'undefined' && window.__KGC_ENHANCED_IMAGE__) {
      console.log("KeepGoingFeature: Found image in window global");
      setOverlayImage(window.__KGC_ENHANCED_IMAGE__);
      return;
    }
    
    // Last resort - check enhanced image store
    const storeImage = EnhancedImageStore.getImage();
    if (storeImage) {
      console.log("KeepGoingFeature: Found image in enhanced image store");
      setOverlayImage(storeImage);
    } else {
      console.log("KeepGoingFeature: No overlay image found");
    }
  }, [propOverlayImage, savedImage, userId]);
  // Vibration state for visual feedback
  const [isVibrating, setIsVibrating] = useState(false);
  
  // Video modal state
  const [showVideo, setShowVideo] = useState(false);
  
  // Remove breathing states - going directly to video
  
  // YouTube player reference using any to avoid TypeScript errors
  const playerRef = useRef<any>(null);
  
  // Container for the YouTube iframe (for overlay positioning)
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Record feature usage via API
  const recordFeatureUsage = async () => {
    try {
      const response = await fetch('/api/features/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          featureName: 'KeepGoing'
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to record feature usage:', await response.text());
      }
    } catch (error) {
      console.error('Error recording feature usage:', error);
      // Non-blocking - continue execution even if this fails
    }
  };
  
  // Load the YouTube IFrame API
  useEffect(() => {
    // Define a global initialization function for YouTube API
    if (typeof window !== 'undefined' && !window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = function() {
        console.log('YouTube API is ready');
      };
    }
    
    // Only load once and only if needed
    if (showVideo && !window.YT) {
      console.log('Loading YouTube API...');
      
      // Create script element to load YouTube API
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      
      // Error handling for script loading
      tag.onerror = () => {
        console.error('Failed to load YouTube IFrame API');
        // Close video modal if YouTube API fails to load
        setShowVideo(false);
      };
      
      // Insert the script tag before the first script tag in the document
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    
    // Clean up when component unmounts or video is closed
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.stopVideo();
        } catch (error) {
          console.error('Error stopping YouTube video:', error);
        }
      }
    };
  }, [showVideo]);
  
  // Initialize the YouTube player when showVideo becomes true
  useEffect(() => {
    if (!showVideo || !videoContainerRef.current) return;
    
    // Ensure the div is empty before creating a new player
    if (videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
    
    // Safety timeout to cancel loading if it takes too long
    const timeoutId = setTimeout(() => {
      console.warn('YouTube player initialization timed out');
      setShowVideo(false);
    }, 10000);
    
    // Function to initialize player
    const initPlayer = () => {
      if (!window.YT || !videoContainerRef.current) {
        // Try again in 100ms if YT is not yet available
        const retryTimeoutId = setTimeout(initPlayer, 100);
        
        // But don't retry forever
        setTimeout(() => {
          clearTimeout(retryTimeoutId);
        }, 5000);
        return;
      }
      
      try {
        // Initialize the YouTube player
        playerRef.current = new window.YT.Player(videoContainerRef.current, {
          height: '100%',
          width: '100%',
          videoId: DEFAULT_VIDEO_ID,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              clearTimeout(timeoutId);
              event.target.playVideo();
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
              clearTimeout(timeoutId);
              setShowVideo(false);
            },
            onStateChange: (event: any) => {
              // Check if YT exists and if the video has ended
              try {
                if (window.YT && event.data === window.YT.PlayerState.ENDED) {
                  setShowVideo(false);
                }
              } catch (error) {
                console.error('Error in onStateChange handler:', error);
                // Fallback - just close the video modal
                setShowVideo(false);
              }
            },
          },
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
        clearTimeout(timeoutId);
        setShowVideo(false);
      }
    };
    
    // Start initialization process
    initPlayer();
    
    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }, [showVideo]);
  
  // Handler for Keep Going button click - direct to video with motivational image
  const handleKeepGoingClick = () => {
    try {
      // Trigger haptic feedback with 2-second duration AND SOUND (this is one of the 3 main buttons)
      createHapticFeedback(2000, true);
      
      // Visual feedback
      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 2000);
      
      // Record feature usage in the background
      recordFeatureUsage().catch(console.error);
      
      // Show video immediately with enhanced motivational image overlay
      setShowVideo(true);
    } catch (error) {
      console.error('Error in Keep Going click handler:', error);
      // Ensure we still show the video
      setShowVideo(true);
    }
  };
  
  // Close the video modal
  const handleCloseVideo = () => {
    try {
      if (playerRef.current) {
        playerRef.current.stopVideo();
      }
    } catch (error) {
      console.error('Error stopping video:', error);
    } finally {
      setShowVideo(false);
    }
  };
  
  // Removed breathing-related functions
  
  return (
    <>
      {/* Keep Going Button - Metallic finish with greenish ring */}
      <Button 
        className={cn(
          "w-full flex items-center justify-center text-white rounded-xl",
          "metallic-blue",
          "h-16 sm:h-18 md:h-20 lg:h-22",
          "text-sm sm:text-base md:text-lg lg:text-xl font-semibold",
          "transition-all duration-300 hover:scale-105",
          isVibrating && "btn-vibrate"
        )} 
        size="lg"
        onClick={handleKeepGoingClick}
      >
        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-1 sm:mr-2 flex-shrink-0" />
        <span>Keep Going</span>
      </Button>
      

      
      {/* Video Modal - Enhanced mobile optimization */}
      {showVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
          <div 
            className="relative w-full max-w-3xl bg-black rounded-lg overflow-hidden shadow-xl" 
            style={{ 
              aspectRatio: '16/9',
              maxHeight: isMobile ? '90vh' : '80vh' // Ensure it fits on mobile screens
            }}
          >
            {/* Close button - Larger target on mobile */}
            <button 
              onClick={handleCloseVideo}
              className={cn(
                "absolute z-10 flex items-center justify-center rounded-full bg-black/60 text-white",
                isMobile ? "top-2 right-2 w-10 h-10 text-lg" : "top-2 right-2 w-8 h-8 text-md"
              )}
              aria-label="Close video"
            >
              ✕
            </button>
            
            {/* YouTube player container */}
            <div ref={videoContainerRef} className="w-full h-full relative">
              {/* Loading spinner while YouTube loads */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 sm:h-12 sm:w-12 border-4 border-white border-opacity-20 rounded-full border-t-[#2E8BC0]"></div>
              </div>
            </div>
            
            {/* Enhanced motivational image overlay - always show something */}
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className={`relative mx-auto flex items-center justify-center ${
                isMobile ? 'w-full h-full' : 'w-[95%] h-[95%]'
              }`}>
                {overlayImage ? (
                  <img 
                    src={overlayImage} 
                    alt="Your motivational image" 
                    className={`w-auto h-auto object-contain transition-all duration-1000 ${
                      isMobile 
                        ? 'max-w-[85%] max-h-[85%] opacity-90'
                        : 'max-w-[90%] max-h-[90%] opacity-90'
                    }`}
                    style={{ 
                      mixBlendMode: 'screen',
                      filter: isMobile 
                        ? 'drop-shadow(0 0 25px rgba(255,255,255,1.2)) brightness(1.4) contrast(1.3)' 
                        : 'drop-shadow(0 0 30px rgba(255,255,255,1.2)) brightness(1.4) contrast(1.3)',
                      animation: 'gentle-glow 4s ease-in-out infinite alternate'
                    }}
                  />
                ) : (
                  // Fallback motivational text overlay when no image is saved
                  <div className="text-center p-6 bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-white/30 shadow-2xl">
                    <div 
                      className="text-white font-bold mb-3"
                      style={{ 
                        fontSize: isMobile ? '1.8rem' : '2.5rem',
                        textShadow: '0 0 20px rgba(255,255,255,0.8)',
                        animation: 'gentle-glow 4s ease-in-out infinite alternate'
                      }}
                    >
                      KEEP GOING! 💪
                    </div>
                    <div 
                      className="text-white/90 font-medium"
                      style={{ 
                        fontSize: isMobile ? '1rem' : '1.2rem',
                        textShadow: '0 0 15px rgba(255,255,255,0.6)'
                      }}
                    >
                      You've got this!
                    </div>
                    <div className="mt-3 text-white/70 text-sm">
                      Upload your motivational image to personalize this overlay
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Type YT is defined elsewhere in the code, but we'll access it through window only

// Export named component by default
export default KeepGoingFeature;