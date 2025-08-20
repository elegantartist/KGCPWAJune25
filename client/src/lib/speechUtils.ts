// Speech utilities for KGC Chatbot with healthcare-optimized settings

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: any;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Healthcare-optimized speech settings
const HEALTHCARE_SPEECH_CONFIG = {
  rate: 0.9, // Slightly slower for medical information
  pitch: 1.0, // Natural pitch
  volume: 0.8, // Comfortable volume
  lang: 'en-AU', // Australian English preference
  fallbackLang: 'en-US' // US English fallback
};

// Get the best available voice for healthcare communication
export const getHealthcareVoice = (): SpeechSynthesisVoice | null => {
  if (!window.speechSynthesis) return null;
  
  const voices = window.speechSynthesis.getVoices();
  
  // Preference order for healthcare communication
  const preferredVoices = [
    'Google UK English Female',
    'Microsoft Zira Desktop', 
    'Google English Female',
    'English (Australia)',
    'English (United Kingdom)',
    'Karen', // macOS UK English
    'Samantha', // macOS US English
    'Siri Female (Enhanced)' // iOS enhanced voice
  ];
  
  // Try to find a preferred voice
  for (const preferred of preferredVoices) {
    const voice = voices.find(v => 
      v.name.includes(preferred) || 
      v.lang.includes('en-AU') || 
      v.lang.includes('en-GB')
    );
    if (voice) return voice;
  }
  
  // Fallback to any English voice
  return voices.find(v => v.lang.startsWith('en')) || null;
};

// Enhanced text-to-speech for healthcare content
export const speakText = (
  text: string, 
  options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    isUrgent?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisErrorEvent) => void;
  } = {}
): void => {
  if (!window.speechSynthesis || !text.trim()) {
    console.warn('Speech synthesis not available or empty text');
    return;
  }

  // Stop any currently speaking utterances
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance();
  
  // Set healthcare-optimized voice
  const voice = getHealthcareVoice();
  if (voice) {
    utterance.voice = voice;
  }

  // Configure speech parameters
  utterance.rate = options.isUrgent ? 1.1 : (options.rate || HEALTHCARE_SPEECH_CONFIG.rate);
  utterance.pitch = options.pitch || HEALTHCARE_SPEECH_CONFIG.pitch;
  utterance.volume = options.volume || HEALTHCARE_SPEECH_CONFIG.volume;
  utterance.lang = voice?.lang || HEALTHCARE_SPEECH_CONFIG.lang;

  // Process text for better healthcare communication
  const processedText = processHealthcareText(text);
  utterance.text = processedText;

  // Set up event listeners
  utterance.onstart = () => {
    console.log('Speech started:', processedText.substring(0, 50) + '...');
    options.onStart?.();
  };

  utterance.onend = () => {
    console.log('Speech ended');
    options.onEnd?.();
  };

  utterance.onerror = (event) => {
    console.error('Speech error:', event.error);
    options.onError?.(event);
  };

  // Start speaking
  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Failed to start speech synthesis:', error);
    options.onError?.(error as SpeechSynthesisErrorEvent);
  }
};

// Process text for better healthcare speech comprehension
const processHealthcareText = (text: string): string => {
  let processedText = text;

  // Add longer pauses for better comprehension
  processedText = processedText
    .replace(/\./g, '. ') // Longer pauses at sentences
    .replace(/,/g, ', ') // Brief pauses at commas
    .replace(/:/g, ': ') // Pause after colons
    .replace(/;/g, '; ') // Pause after semicolons
    .replace(/\n\n/g, '. ') // Convert double line breaks to pauses
    .replace(/\n/g, ', ') // Convert single line breaks to commas
    .replace(/\*\*/g, '') // Remove markdown bold formatting
    .replace(/\*/g, '') // Remove markdown italic formatting
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to just text
    .replace(/`([^`]+)`/g, '$1'); // Remove code formatting

  // Expand common healthcare abbreviations for clarity
  const healthcareAbbreviations = {
    'CPD': 'Care Plan Directive',
    'CPDs': 'Care Plan Directives',
    'KGC': 'Keep Going Care',
    'AI': 'A I',
    'API': 'A P I',
    'UI': 'U I',
    'UX': 'U X',
    'CBT': 'Cognitive Behavioral Therapy',
    'MI': 'Motivational Interviewing',
    'PPR': 'Patient Progress Report',
    'MCP': 'Model Context Protocol',
    'TTS': 'text to speech',
    'ASR': 'automatic speech recognition'
  };

  // Replace abbreviations
  Object.entries(healthcareAbbreviations).forEach(([abbr, expansion]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    processedText = processedText.replace(regex, expansion);
  });

  // Improve pronunciation of medical terms
  processedText = processedText
    .replace(/\bmg\b/g, 'milligrams')
    .replace(/\bml\b/g, 'milliliters')
    .replace(/\bkg\b/g, 'kilograms')
    .replace(/\bbpm\b/g, 'beats per minute')
    .replace(/\b(\d+)\/(\d+)\b/g, '$1 over $2') // Blood pressure format
    .replace(/\b(\d+)\s*-\s*(\d+)\b/g, '$1 to $2'); // Range format

  // Clean up extra spaces
  processedText = processedText.replace(/\s+/g, ' ').trim();

  return processedText;
};

// Stop all speech synthesis
export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Check if speech synthesis is currently speaking
export const isSpeaking = (): boolean => {
  return window.speechSynthesis?.speaking || false;
};

// Create speech recognition instance with healthcare settings
export const createSpeechRecognition = (): SpeechRecognition | null => {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    console.warn('Speech recognition not supported in this browser');
    return null;
  }

  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionConstructor();

  // Configure for healthcare use
  recognition.continuous = false; // Single utterance mode for clarity
  recognition.interimResults = false; // Only final results for accuracy
  recognition.lang = HEALTHCARE_SPEECH_CONFIG.lang;
  recognition.maxAlternatives = 1; // Single best result

  return recognition;
};

// Speak healthcare-specific greetings and messages
export const speakWelcomeMessage = (userName: string, isFirstVisit: boolean = false): void => {
  let message;
  
  if (isFirstVisit) {
    message = `Hello ${userName}! Welcome to Keep Going Care. I'm your personal health assistant, and I'm excited to support your wellness journey. Let's get started!`;
  } else {
    message = `Welcome back, ${userName}! I'm glad to see you again. How can I help you with your health goals today?`;
  }

  speakText(message, {
    onStart: () => console.log('Speaking welcome message'),
    onEnd: () => console.log('Welcome message completed')
  });
};

// Speak achievement notifications
export const speakAchievement = (achievementName: string, description: string): void => {
  const message = `Congratulations! You've earned the ${achievementName} achievement. ${description}`;
  
  speakText(message, {
    rate: 1.0, // Normal rate for celebratory message
    onStart: () => console.log('Speaking achievement notification'),
    onEnd: () => console.log('Achievement notification completed')
  });
};

// Speak urgent health reminders
export const speakUrgentReminder = (message: string): void => {
  speakText(message, {
    isUrgent: true,
    rate: 1.1,
    volume: 0.9,
    onStart: () => console.log('Speaking urgent reminder'),
    onEnd: () => console.log('Urgent reminder completed')
  });
};

// Test speech functionality
export const testSpeechSystem = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const testMessage = "Hello! This is a test of the Keep Going Care speech system.";
    
    speakText(testMessage, {
      onStart: () => console.log('Speech test started'),
      onEnd: () => {
        console.log('Speech test completed successfully');
        resolve(true);
      },
      onError: (error) => {
        console.error('Speech test failed:', error);
        resolve(false);
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.warn('Speech test timed out');
      resolve(false);
    }, 10000);
  });
};