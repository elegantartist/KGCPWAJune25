/**
 * Utility functions for handling video playback in the Keep Going feature
 */

// YouTube video ID for the Keep Going relaxation video
export const KEEP_GOING_VIDEO_ID = 'bKYqK1R19hM';

// Interface for video player options
interface VideoPlayerOptions {
  videoId: string;
  container: HTMLElement;
  width?: number;
  height?: number;
  autoplay?: boolean;
  loop?: boolean;
  mute?: boolean;
  onReady?: (player: any) => void;
  onStateChange?: (event: any) => void;
  onError?: (event: any) => void;
}

// Load YouTube API if it hasn't been loaded yet
let youtubeApiLoaded = false;
export const loadYoutubeApi = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (youtubeApiLoaded) {
      resolve();
      return;
    }
    
    // Check if API is already being loaded
    if (document.getElementById('youtube-api')) {
      // Wait for existing script to finish loading
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          youtubeApiLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }
    
    // Create script tag
    const tag = document.createElement('script');
    tag.id = 'youtube-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    
    // Set up callback when API is ready
    window.onYouTubeIframeAPIReady = () => {
      youtubeApiLoaded = true;
      resolve();
    };
    
    // Handle loading error
    tag.onerror = () => {
      reject(new Error('Failed to load YouTube API'));
    };
    
    // Add script to page
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
};

// Create YouTube player instance
export const createYoutubePlayer = async (options: VideoPlayerOptions): Promise<any> => {
  try {
    // Load YouTube API if not already loaded
    await loadYoutubeApi();
    
    // Make sure YouTube API is fully initialized
    if (!window.YT || !window.YT.Player) {
      throw new Error('YouTube API not available');
    }
    
    // Create player instance
    return new window.YT.Player(options.container, {
      videoId: options.videoId,
      width: options.width || '100%',
      height: options.height || '100%',
      playerVars: {
        autoplay: options.autoplay ? 1 : 0,
        controls: 0,  // Hide controls for a cleaner experience
        showinfo: 0,  // Hide video title and uploader info
        rel: 0,       // Don't show related videos
        loop: options.loop ? 1 : 0,
        mute: options.mute ? 1 : 0,
        modestbranding: 1, // Hide YouTube logo
        playsinline: 1,    // Play inline on mobile devices
        fs: 0,             // Disable fullscreen button
        iv_load_policy: 3, // Hide video annotations
      },
      events: {
        onReady: (event: any) => {
          if (options.onReady) options.onReady(event.target);
        },
        onStateChange: (event: any) => {
          if (options.onStateChange) options.onStateChange(event);
        },
        onError: (event: any) => {
          if (options.onError) options.onError(event);
        }
      }
    });
  } catch (error) {
    console.error('Error creating YouTube player:', error);
    throw error;
  }
};

// Play Keep Going video with overlay image
export const playKeepGoingVideo = async (
  container: HTMLElement,
  onPlayerReady?: (player: any) => void
): Promise<any> => {
  try {
    return await createYoutubePlayer({
      videoId: KEEP_GOING_VIDEO_ID,
      container,
      autoplay: true,
      loop: true,
      mute: false,
      onReady: (player) => {
        // Set volume to a pleasant level
        player.setVolume(40);
        player.playVideo();
        
        // Call the onPlayerReady callback if provided
        if (onPlayerReady) onPlayerReady(player);
      }
    });
  } catch (error) {
    console.error('Failed to play Keep Going video:', error);
    throw error;
  }
};