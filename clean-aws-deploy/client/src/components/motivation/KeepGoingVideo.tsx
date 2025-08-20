import React, { useEffect, useRef, useState } from "react";
import { createHapticFeedback } from "@/lib/soundEffects";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import EnhancedImageStore from "@/lib/enhancedImageStore";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";

interface KeepGoingVideoProps {
  videoId: string;
  onClose: () => void;
  enhancedImageOverlay?: boolean;
}

const KeepGoingVideo: React.FC<KeepGoingVideoProps> = ({ videoId, onClose, enhancedImageOverlay = true }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [storedImage, setStoredImage] = useState<string | null>(null);
  // Check if we're on a mobile device
  const isMobile = useIsMobile();

  // User ID for demo purposes (in a real app, this would be from auth)
  const userId = 2; // Reuben Collins - Patient
  
  // Query for getting the saved motivational image from the database
  const { data: savedImage, isLoading: isLoadingImage } = useQuery({
    queryKey: ['/api/users', userId, 'motivational-image'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}/motivational-image`);
        if (!response.ok) {
          if (response.status === 404) {
            // No image found, but this is not an error
            return null;
          }
          throw new Error('Failed to fetch motivational image');
        }
        return await response.json();
      } catch (error) {
        console.log('No saved image found in database, this is expected for new users');
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Check for stored images from various sources, prioritizing database
  useEffect(() => {
    if (!enhancedImageOverlay) return;
    
    console.log("KeepGoingVideo: Checking for enhanced image overlay");
    
    // First, try to get the image from the database
    if (savedImage && savedImage.imageData) {
      console.log("KeepGoingVideo: Found image in database!");
      setStoredImage(savedImage.imageData);
      
      // Also update local stores for redundancy
      EnhancedImageStore.setImage(savedImage.imageData);
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = savedImage.imageData;
      }
      return;
    }
    
    // Fallback 1: Check window object (for sessions where image was just saved)
    if (typeof window !== 'undefined' && window.__KGC_ENHANCED_IMAGE__) {
      console.log("KeepGoingVideo: Found image in window object!");
      setStoredImage(window.__KGC_ENHANCED_IMAGE__);
      return;
    }
    
    // Fallback 2: Check local storage
    const imageUrl = EnhancedImageStore.getImage();
    if (imageUrl) {
      console.log("KeepGoingVideo: Found image in local storage");
      setStoredImage(imageUrl);
    } else {
      console.log("KeepGoingVideo: No enhanced image available in any storage location");
    }
  }, [enhancedImageOverlay, savedImage]);

  // Force audio playback function that can be called multiple times
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const forceAudioPlayback = () => {
    if (iframeRef.current) {
      try {
        // Try to force audio context creation that will allow sound to play
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          const emptyNode = audioContext.createGain();
          emptyNode.connect(audioContext.destination);
          
          // Create a short silent sound and play it to unlock audio
          const silentSound = audioContext.createOscillator();
          silentSound.frequency.setValueAtTime(0, audioContext.currentTime);
          silentSound.connect(emptyNode);
          silentSound.start(0);
          silentSound.stop(0.001);
          
          // Force iframe focus to ensure audio plays
          iframeRef.current.focus();
          
          // We need to make sure we resume the audio context 
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
          
          // For iOS, try to play a silent audio file
          const unlockAudio = document.createElement('audio');
          unlockAudio.setAttribute('src', 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////////9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
          unlockAudio.load();
          const playPromise = unlockAudio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('Audio enabled successfully');
              setAudioEnabled(true);
            }).catch(error => {
              console.log('Unable to enable audio automatically:', error);
            });
          }
        }
      } catch (e) {
        console.error('Audio context error:', e);
      }
    }
  };
  
  // Use effect to try enabling audio on component mount
  useEffect(() => {
    // Try to force audio playback on component mount
    forceAudioPlayback();
    
    // Also try again after a short delay to ensure it works
    const audioTimeout = setTimeout(forceAudioPlayback, 1000);
    
    return () => {
      clearTimeout(audioTimeout);
    };
  }, []);
  
  // Handle YouTube video loading and events
  useEffect(() => {
    // Set up a listener for messages from the YouTube iframe
    const handleMessage = (event: MessageEvent) => {
      // Check if the message is from YouTube
      if (event.origin.includes("youtube.com")) {
        try {
          // Try to parse the data
          const data = JSON.parse(event.data);
          
          // Handle video ready state
          if (data.event === "onReady") {
            setIsLoading(false);
            
            // Force audio playback attempt when the video is ready
            forceAudioPlayback();
            
            // Try to call the YouTube API to unmute and set volume
            if (iframeRef.current && (window as any).YT && (window as any).YT.Player) {
              try {
                const player = new (window as any).YT.Player(iframeRef.current, {
                  events: {
                    'onReady': (event: any) => {
                      // Try to unmute and set volume to maximum
                      event.target.unMute();
                      event.target.setVolume(100);
                      
                      // Special handling for iOS
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                      if (isIOS) {
                        // On iOS, we need an additional user interaction
                        // The button we added will handle this
                        console.log('iOS device detected, please use the enable audio button');
                      } else {
                        setAudioEnabled(true);
                      }
                    }
                  }
                });
              } catch (e) {
                console.log('YouTube API initialization error:', e);
              }
            }
          }
          
          // Check if the video ended
          if (data.event === "onStateChange" && data.info === 0) {
            // Play haptic feedback when video ends
            createHapticFeedback();
            
            // Close the video and return to homepage
            setTimeout(() => {
              onClose();
              setLocation("/");
            }, 500);
          }
          
          // Handle video errors
          if (data.event === "onError") {
            setIsLoading(false);
            console.error("YouTube video error:", data);
          }
        } catch (e) {
          // Ignore JSON parse errors - not all messages are JSON
        }
      }
    };

    // Add the event listener
    window.addEventListener("message", handleMessage);

    // For better user experience, set a timeout to hide the loading indicator
    // even if we don't get a proper onReady event
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    // Clean up
    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(loadingTimeout);
    };
  }, [videoId, onClose, setLocation]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Close button */}
        <button 
          onClick={() => {
            createHapticFeedback();
            setTimeout(() => onClose(), 2000);
          }}
          className="absolute top-4 right-4 text-white bg-red-600 rounded-full p-2 z-10"
          aria-label="Close video"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Video container with 16:9 aspect ratio */}
        <div className="relative pb-[56.25%] h-0 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
              <span className="text-white ml-3 text-lg">Loading video...</span>
            </div>
          )}
          
          {/* Enable audio button that remains visible for a while */}
          {!audioEnabled && (
            <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-20 animate-pulse">
              <button
                onClick={() => {
                  forceAudioPlayback();
                  // Also trigger click on the iframe to help iOS
                  if (iframeRef.current) {
                    iframeRef.current.click();
                    iframeRef.current.focus();
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                Tap to Enable Audio
              </button>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&origin=${window.location.origin}&mute=0&volume=100`}
            className="absolute top-0 left-0 w-full h-full"
            title="Keep Going Video"
            frameBorder="0"
            allow="microphone; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; speaker; display-capture"
            allowFullScreen
            loading="eager"
            onLoad={() => setIsLoading(false)}
          ></iframe>
          
          {/* Enhanced image overlay */}
          {storedImage && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className={`relative mx-auto flex items-center justify-center ${
                isMobile ? 'w-full h-full' : 'w-[95%] h-[95%]'
              }`}>
                <img 
                  src={storedImage} 
                  alt="Your motivational image" 
                  className={`w-auto h-auto object-contain opacity-90 ${
                    isMobile ? 'min-w-[95%] min-h-[95%]' : 'min-w-[85%] min-h-[85%]'
                  } max-w-[98%] max-h-[98%]`}
                  style={{ 
                    mixBlendMode: 'overlay',
                    filter: isMobile 
                      ? 'drop-shadow(0 0 20px rgba(255,255,255,0.95))' 
                      : 'drop-shadow(0 0 15px rgba(255,255,255,0.9))'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeepGoingVideo;