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
  
  // Handler for Keep Going button click
  const handleKeepGoingClick = () => {
    try {
      // Trigger haptic feedback with 2-second duration AND SOUND (this is one of the 3 main buttons)
      createHapticFeedback(2000, true);
      
      // Visual feedback
      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 2000);
      
      // Record feature usage in the background
      recordFeatureUsage().catch(console.error);
      
      // Show video immediately - don't wait for haptic feedback
      setShowVideo(true);
    } catch (error) {
      console.error('Error in Keep Going click handler:', error);
      // Ensure we still show the video even if haptic feedback fails
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
  
  return (
    <>
      {/* Keep Going Button - Enhanced mobile optimization */}
      <Button 
        className={cn(
          "w-full h-20 font-semibold flex items-center justify-center text-white",
          "text-base sm:text-lg md:text-xl", // Responsive text sizing
          "metallic-blue",
          isVibrating && "btn-vibrate"
        )} 
        size="lg"
        onClick={handleKeepGoingClick}
      >
        <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 mr-1 sm:mr-2 flex-shrink-0" />
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
            
            {/* Motivational image overlay - Enhanced mobile optimization */}
            {overlayImage && (
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className={`relative mx-auto flex items-center justify-center ${
                  isMobile ? 'w-full h-full' : 'w-[95%] h-[95%]'
                }`}>
                  <img 
                    src={overlayImage} 
                    alt="Your motivational image" 
                    className={`w-auto h-auto object-contain opacity-85 ${
                      isMobile 
                        ? 'max-w-[94%] max-h-[94%]' // Slightly smaller on mobile for better visibility
                        : 'max-w-[98%] max-h-[98%]'
                    }`}
                    style={{ 
                      mixBlendMode: 'overlay',
                      filter: isMobile 
                        ? 'drop-shadow(0 0 12px rgba(255,255,255,0.95)) brightness(1.1)' 
                        : 'drop-shadow(0 0 15px rgba(255,255,255,0.9))'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Type YT is defined elsewhere in the code, but we'll access it through window only

// Export named component by default
export default KeepGoingFeature;