/**
 * Haptic Feedback Module
 * 
 * This module provides haptic feedback functionality for buttons and other interactive elements.
 * It uses vibration API where available and falls back to audio feedback for iOS devices.
 */

// Audio element for haptic feedback sound effect
let gongAudio: HTMLAudioElement | null = null;

// Initialize the audio element for haptic feedback
function initializeAudio() {
  try {
    if (typeof window !== 'undefined' && !gongAudio) {
      console.log('Initializing gong audio');
      // Create a therapeutic gong sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Store the audio context for later use
      (window as any).__KGC_AUDIO_CONTEXT__ = audioContext;
      
      // Create a dummy audio element for compatibility with existing code
      const audio = new Audio();
      audio.volume = 0.5;
      
      // Override the play method to create a therapeutic gong sound
      audio.play = () => {
        console.log('Playing therapeutic gong sound');
        try {
          const context = (window as any).__KGC_AUDIO_CONTEXT__;
          
          // Create oscillator for the fundamental tone
          const fundamental = context.createOscillator();
          fundamental.type = 'sine';
          fundamental.frequency.value = 110; // Low G2 - typical gong fundamental
          
          // Create harmonic overtones for richness
          const harmonic1 = context.createOscillator();
          harmonic1.type = 'sine';
          harmonic1.frequency.value = 220; // G3 - first harmonic
          
          const harmonic2 = context.createOscillator();
          harmonic2.type = 'sine';
          harmonic2.frequency.value = 330; // E4 - second harmonic for warmth
          
          // Create gain nodes for controlling volume envelope
          const fundamentalGain = context.createGain();
          const harmonic1Gain = context.createGain();
          const harmonic2Gain = context.createGain();
          
          // Connect oscillators to their gain nodes
          fundamental.connect(fundamentalGain);
          harmonic1.connect(harmonic1Gain);
          harmonic2.connect(harmonic2Gain);
          
          // Connect gain nodes to output
          fundamentalGain.connect(context.destination);
          harmonic1Gain.connect(context.destination);
          harmonic2Gain.connect(context.destination);
          
          // Set initial gain values (quieter harmonics)
          fundamentalGain.gain.value = 0.5;
          harmonic1Gain.gain.value = 0.2;
          harmonic2Gain.gain.value = 0.1;
          
          // Schedule the sound
          const now = context.currentTime;
          
          // Start oscillators
          fundamental.start(now);
          harmonic1.start(now);
          harmonic2.start(now);
          
          // Create gong envelope - sharp attack, long decay
          fundamentalGain.gain.setValueAtTime(0.5, now);
          fundamentalGain.gain.exponentialRampToValueAtTime(0.01, now + 3.0);
          
          harmonic1Gain.gain.setValueAtTime(0.2, now);
          harmonic1Gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
          
          harmonic2Gain.gain.setValueAtTime(0.1, now);
          harmonic2Gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
          
          // Stop oscillators after sound completes
          fundamental.stop(now + 3.0);
          harmonic1.stop(now + 3.0);
          harmonic2.stop(now + 3.0);
          
          // Return a promise that resolves when the sound is done
          return new Promise((resolve) => {
            setTimeout(resolve, 3000);
          });
        } catch (e) {
          console.error('Error playing therapeutic gong sound:', e);
          return Promise.reject(e);
        }
      };
      
      gongAudio = audio;
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize audio for haptic feedback:', error);
    return false;
  }
}

/**
 * Trigger haptic feedback
 * @param duration Duration of vibration in milliseconds (default: 2000ms)
 * @param playSound Whether to play the gong sound (default: false)
 * @param pattern Optional vibration pattern array
 * @returns true if feedback was triggered, false otherwise
 */
export function createHapticFeedback(duration: number = 2000, playSound: boolean = false, pattern?: number[]): boolean {
  try {
    // Try vibration API first (Android and some browsers)
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      if (pattern) {
        navigator.vibrate(pattern);
      } else {
        navigator.vibrate(duration);
      }
    }
    
    // Only play audio feedback if specifically requested
    if (playSound) {
      const audioInitialized = initializeAudio();
      if (audioInitialized && gongAudio) {
        // Reset to start (in case it's already playing)
        gongAudio.currentTime = 0;
        // Play the sound effect
        gongAudio.play().catch(error => {
          console.warn('Could not play haptic audio feedback:', error);
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating haptic feedback:', error);
    return false;
  }
}

/**
 * Set the volume for haptic audio feedback
 * @param volume Volume from 0 to 1
 */
export function setHapticVolume(volume: number): void {
  try {
    // Ensure volume is within valid range
    const sanitizedVolume = Math.max(0, Math.min(1, volume));
    
    // Initialize audio if needed
    if (!gongAudio) {
      initializeAudio();
    }
    
    // Set volume if audio is available
    if (gongAudio instanceof HTMLAudioElement) {
      gongAudio.volume = sanitizedVolume;
    }
  } catch (error) {
    console.error('Error setting haptic volume:', error);
  }
}

export default {
  createHapticFeedback,
  setHapticVolume
};