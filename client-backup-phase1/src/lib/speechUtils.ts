// Speech utilities for the KGC application

/**
 * Text-to-speech with a high-pitched friendly feminine voice
 * Uses the browser's built-in speech synthesis API
 */
export function speakText(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not supported in this browser');
    return;
  }

  // Stop any currently speaking synthesis
  window.speechSynthesis.cancel();
  
  // Remove emoji descriptions and Unicode emoji characters to prevent them being read aloud
  // First, remove emoji text descriptions like :smile:, :grinning:, etc.
  let cleanedText = text.replace(/:[a-z_]+:/g, '');
  
  // Simple filter for common emoji symbols 
  // Instead of a complex regex that might fail, we manually replace the most frequent emojis
  const commonEmojis = ['😊', '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
                        '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝',
                        '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
                        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
                        '👍', '👎', '👏', '🙌', '👋'];
                        
  // Remove each emoji individually
  for (const emoji of commonEmojis) {
    cleanedText = cleanedText.replace(new RegExp(emoji, 'g'), '');
  }
  
  // Create a new utterance
  const utterance = new SpeechSynthesisUtterance(cleanedText);
  
  // Firefox and Safari fix: explicitly try to load voices if they're not ready
  let availableVoices = window.speechSynthesis.getVoices();
  
  // If voices aren't loaded yet, try to force them to load
  if (availableVoices.length === 0) {
    // This technique uses a workaround that forces Chrome and other browsers
    // to load the voices - speak something empty then cancel immediately
    speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    speechSynthesis.cancel();
    
    // Try again to get voices
    availableVoices = window.speechSynthesis.getVoices();
    
    // If still no voices, we'll log it but proceed with defaults
    if (availableVoices.length === 0) {
      console.warn('No voices available for speech synthesis, using browser default');
    }
  }
  
  // Configure for a higher pitched, friendly feminine voice
  utterance.volume = 1.0;     // 0 to 1, full volume for clarity
  utterance.rate = 0.95;      // 0.1 to 10, slightly slower for more natural feel
  utterance.pitch = 1.5;      // 0 to 2, high pitch for a younger, friendlier voice
  
  // First try to find the ideal voices - known to be young, friendly and clear
  const preferredVoices = ['Samantha', 'Google US English Female', 'Microsoft Zira', 
                          'Alex', 'Karen', 'Moira', 'Tessa', 'Allison'];
  
  let femaleVoice = null;
  
  // Try preferred voices first
  for (const preferred of preferredVoices) {
    const found = availableVoices.find(voice => voice.name.includes(preferred));
    if (found) {
      femaleVoice = found;
      break;
    }
  }
  
  // Fall back to any female voice if preferred ones aren't available
  if (!femaleVoice) {
    femaleVoice = availableVoices.find(voice => 
      (voice.name.toLowerCase().includes('female') || 
       voice.name.toLowerCase().includes('woman') || 
       voice.name.toLowerCase().includes('girl') ||
       voice.name.includes('Anna') ||
       voice.name.includes('Amy') ||
       voice.name.includes('Kate') ||
       voice.name.includes('Ava')) && 
      voice.lang.includes('en')
    );
  }
  
  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }
  
  // Speak the text
  window.speechSynthesis.speak(utterance);
}

/**
 * Cancel any ongoing speech
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if speech synthesis is currently speaking
 */
export function isSpeaking(): boolean {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

// Speech-to-text interfaces for TypeScript
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: any;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event & { error: string }) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new(): SpeechRecognition;
    };
  }
}

/**
 * Create a speech recognition instance
 */
export function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Check browser support
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognitionAPI) {
    console.warn('Speech recognition not supported in this browser');
    return null;
  }
  
  // Create and configure the recognition object
  const recognition = new SpeechRecognitionAPI();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  return recognition;
}