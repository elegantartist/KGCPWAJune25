import React, { useEffect, useRef, useState } from "react";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import { useLocation } from "wouter";
import { Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";

interface OrientationVideoProps {
  videoId?: string; // Made optional since we're using local MP4
  onClose: () => void;
}

const OrientationVideo: React.FC<OrientationVideoProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Video control functions
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Auto-play when component mounts
  useEffect(() => {
    if (videoRef.current) {
      // Try to autoplay with sound
      videoRef.current.play().catch(() => {
        // If autoplay fails, user will need to click play
        console.log('Autoplay prevented - user interaction required');
      });
    }
  }, []);

  // Auto-play when component mounts
  useEffect(() => {
    if (videoRef.current) {
      // Try to autoplay with sound
      videoRef.current.play().catch(() => {
        // If autoplay fails, user will need to click play
        console.log('Autoplay prevented - user interaction required');
      });
    }
  }, []);

  // Handle video end event
  useEffect(() => {
    const videoElement = videoRef.current;
    
    const handleVideoEnd = () => {
      // Play haptic feedback when video ends
      createHapticFeedback();
      
      // Close the video and return to homepage
      setTimeout(() => {
        onClose();
        setLocation("/");
      }, 500);
    };

    if (videoElement) {
      videoElement.addEventListener('ended', handleVideoEnd);
      
      return () => {
        videoElement.removeEventListener('ended', handleVideoEnd);
      };
    }
  }, [onClose, setLocation]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Close button */}
        <button 
          onClick={() => {
            createHapticFeedback();
            setTimeout(() => onClose(), 2000);
          }}
          className="absolute top-4 right-4 text-white bg-red-600 rounded-full p-2 z-[10000]"
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
              <span className="text-white ml-3 text-lg">Loading orientation video...</span>
            </div>
          )}
          
          {/* Local Video Element */}
          <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={(e) => {
              console.error('Video loading error:', e);
              setIsLoading(false);
            }}
            onCanPlay={() => {
              console.log('Video can start playing');
              setIsLoading(false);
            }}
            playsInline
            preload="metadata"
            controls={false}
          >
            <source src="/videos/kgc-orientation-Qj5J9Uw0pEg.mp4" type="video/mp4" />
            <p className="text-white text-center">
              Your browser does not support video playback. Please update your browser.
            </p>
          </video>

          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`
                }}
              />
              <div className="flex justify-between text-white text-sm mt-1">
                <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePlayPause}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              
              <button
                onClick={toggleMute}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrientationVideo;