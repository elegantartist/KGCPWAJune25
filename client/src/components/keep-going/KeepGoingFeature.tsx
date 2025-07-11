import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from 'lucide-react';
import { createHapticFeedback } from "@/lib/hapticFeedback";
// import EnhancedImageStore from "@/lib/enhancedImageStore"; // Removed
// import { useQuery } from "@tanstack/react-query"; // Removed
import { useIsMobile } from "@/hooks/useIsMobile"; // Corrected import path

// Define YouTube API types for TypeScript - Keep YT if used by YouTube player
declare global {
  interface Window {
    YT?: any; // Keep YT if YouTube player logic relies on it
    // __KGC_ENHANCED_IMAGE__ was removed
  }
}

// Interface for the component props
interface KeepGoingFeatureProps {
  userId: number;
  overlayImage?: string | null; // This will now be directly from context via props
}

// YouTube video constants
const DEFAULT_VIDEO_ID = "bKYqK1R19hM";

export const KeepGoingFeature: React.FC<KeepGoingFeatureProps> = ({
  userId,
  overlayImage // Directly use the prop
}) => {
  const isMobile = useIsMobile();
  // const [overlayImage, setOverlayImage] = useState<string | null>(propOverlayImage || null); // Removed internal state for overlayImage

  // Removed useQuery for fetching image - it's passed as a prop now.
  // Removed useEffect that was setting overlayImage from multiple sources.

  const [isVibrating, setIsVibrating] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const playerRef = useRef<any>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const recordFeatureUsage = async () => {
    try {
      await fetch('/api/features/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featureName: 'KeepGoing' }),
      });
    } catch (error) {
      console.error('Error recording feature usage:', error);
    }
  };

  useEffect(() => {
    if (showVideo && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => setShowVideo(false);
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    return () => {
      if (playerRef.current) playerRef.current.stopVideo();
    };
  }, [showVideo]);

  useEffect(() => {
    if (!showVideo || !videoContainerRef.current) return;

    const initPlayer = () => {
      if (!window.YT || !videoContainerRef.current) {
        setTimeout(initPlayer, 100);
        return;
      }
      try {
        playerRef.current = new window.YT.Player(videoContainerRef.current, {
          height: '100%',
          width: '100%',
          videoId: DEFAULT_VIDEO_ID,
          playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
          events: {
            onReady: (event: any) => event.target.playVideo(),
            onError: () => setShowVideo(false),
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) setShowVideo(false);
            },
          },
        });
      } catch (error) {
        setShowVideo(false);
      }
    };
    initPlayer();
  }, [showVideo]);

  const handleKeepGoingClick = () => {
    createHapticFeedback(2000, true);
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), 2000);
    recordFeatureUsage();
    setShowVideo(true);
  };

  const handleCloseVideo = () => {
    if (playerRef.current) playerRef.current.stopVideo();
    setShowVideo(false);
  };

  return (
    <>
      <Button
        className={cn("w-full h-16 sm:h-18 md:h-20 lg:h-22 font-semibold flex items-center justify-center text-white", "text-sm sm:text-base md:text-lg lg:text-xl", "metallic-blue", isVibrating && "btn-vibrate")}
        size="lg"
        onClick={handleKeepGoingClick}
      >
        <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 mr-1 sm:mr-2 flex-shrink-0" />
        <span>Keep Going</span>
      </Button>

      {showVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
          <div
            className="relative w-full max-w-3xl bg-black rounded-lg overflow-hidden shadow-xl"
            style={{ aspectRatio: '16/9', maxHeight: isMobile ? '90vh' : '80vh' }}
          >
            <button
              onClick={handleCloseVideo}
              className={cn("absolute z-10 flex items-center justify-center rounded-full bg-black/60 text-white", isMobile ? "top-2 right-2 w-10 h-10 text-lg" : "top-2 right-2 w-8 h-8 text-md")}
              aria-label="Close video"
            >
              ✕
            </button>
            <div ref={videoContainerRef} className="w-full h-full relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 sm:h-12 sm:w-12 border-4 border-white border-opacity-20 rounded-full border-t-[#2E8BC0]"></div>
              </div>
            </div>
            {overlayImage && (
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className={`relative mx-auto flex items-center justify-center ${isMobile ? 'w-full h-full' : 'w-[95%] h-[95%]'}`}>
                  <img
                    src={overlayImage}
                    alt="Your motivational image"
                    className={`w-auto h-auto object-contain opacity-85 ${isMobile ? 'max-w-[94%] max-h-[94%]' : 'max-w-[98%] max-h-[98%]'}`}
                    style={{
                      mixBlendMode: 'overlay',
                      filter: isMobile ? 'drop-shadow(0 0 12px rgba(255,255,255,0.95)) brightness(1.1)' : 'drop-shadow(0 0 15px rgba(255,255,255,0.9))'
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

export default KeepGoingFeature;