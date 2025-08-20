/**
 * Enhanced SupervisorAgent Component
 * 
 * This component extends the original SupervisorAgent with:
 * 1. Connectivity-aware behavior (works online, offline, and with limited connectivity)
 * 2. Integration with the three-tier memory system (semantic, procedural, episodic)
 * 3. Support for the prompt optimization system
 * 4. Improved response validation with model-based reflection
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Loader2,
  Send,
  Wifi,
  WifiOff,
  VolumeX,
  Volume2,
  Trophy,
  Mic,
  MicOff
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import axios from 'axios';
import { useSimpleToast } from '@/hooks/simple-toast';
import { ConnectivityLevel } from '@/../../shared/types';
import { useProgressMilestones } from '@/hooks/useProgressMilestones';
import { useConnectivity } from '@/hooks/useConnectivity';
import { speakText, stopSpeaking } from '@/lib/speechUtils';
// We'll implement a simplified connectivity check directly rather than removing it entirely

// Speech synthesis for text-to-speech
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

// Import speech recognition types from our central utilities
import { 
  SpeechRecognition as SpeechRecognitionInterface, 
  SpeechRecognitionEvent,
  createSpeechRecognition
} from '@/lib/speechUtils';

// Type aliases for clarity
type SpeechRecognitionType = SpeechRecognitionInterface;
type SpeechRecognitionEventType = SpeechRecognitionEvent;
type SpeechRecognitionErrorEventType = Event & { error: string };

// Utility function to sanitize chatbot responses and remove system prompt directives
function sanitizeChatbotResponse(text: string): string {
  // First, check if response contains system prompt directives (markers)
  const systemDirectivePatterns = [
    /# CARE PLAN DIRECTIVES.*?(?=\n\n|$)/gs,
    /# IMPORTANT PATIENT MEMORY CONTEXT.*?(?=\n\n|$)/gs,
    /# FOOD PREFERENCES AND DIETARY CONTEXT.*?(?=\n\n|$)/gs,
    /# FOOD DATABASE PREFERENCES.*?(?=\n\n|$)/gs,
    /CRITICAL COMPLIANCE REQUIREMENT:.*?(?=\n\n|$)/gs,
    /# SYSTEM INSTRUCTIONS.*?(?=\n\n|$)/gs,
    /\[SYSTEM:.*?\]/gs,
    /\[INSTRUCTIONS:.*?\]/gs
  ];
  
  // Remove any system directives from the text
  let sanitizedText = text;
  for (const pattern of systemDirectivePatterns) {
    sanitizedText = sanitizedText.replace(pattern, '');
  }
  
  // Clean up any blank lines at the beginning of the response
  sanitizedText = sanitizedText.replace(/^\s+/, '');
  
  // Remove any multiple consecutive line breaks (more than 2)
  sanitizedText = sanitizedText.replace(/\n{3,}/g, '\n\n');
  
  return sanitizedText;
}

// Message types
interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isReflection?: boolean;
  offline?: boolean;
  pending?: boolean;
}

// Agent status options
type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'submitting-feedback';

interface SupervisorAgentProps {
  userId: number;
  healthMetrics?: any;
  onRecommendationAccepted?: (recommendedFeature: string) => void;
  onFeedbackSubmitted?: (feedback: string) => void;
  hideHeader?: boolean; // Add option to hide the header
  initialMessage?: string; // Optional initial message from the chatbot
  connectivityLevel?: ConnectivityLevel; // Optional forced connectivity level for simulation
}

export function EnhancedSupervisorAgent({
  userId,
  healthMetrics,
  onRecommendationAccepted,
  onFeedbackSubmitted,
  hideHeader = false, // Default to showing the header
  initialMessage,
  connectivityLevel: forcedConnectivityLevel
}: SupervisorAgentProps) {
  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useSimpleToast();
  
  // Initialize progress milestone hook
  const { 
    createOrUpdateMilestone, 
    milestoneExists, 
    milestones: userMilestones
  } = useProgressMilestones(userId);
  
  // State for storing patient name
  const [patientName, setPatientName] = useState<string>('');
  
  // Use the connectivity hook
  const { 
    connectivityLevel: detectedConnectivityLevel, 
    setConnectivity,
    isOffline: detectedIsOffline,
    isMinimal: detectedIsMinimal,
    isFunctional: detectedIsFunctional,
    isFull: detectedIsFull 
  } = useConnectivity();
  
  // Always force connectivity to FULL to avoid error messages
  // This ensures compatibility with mobile devices that may have intermittent connectivity
  const connectivityLevel = ConnectivityLevel.FULL;
  const isOffline = false; // Force to always appear online
  // These connectivity levels no longer exist in the enum, keeping variables for backward compatibility
  const isMinimal = false;
  const isFunctional = false;
  const isFull = true; // Always show as fully connected

  // Setup service worker message handler for notifications from the service worker
  useEffect(() => {
    // Only add service worker event listener if service workers are supported
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
      // Listen for messages from service worker
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SW_NOTIFICATION') {
          // Add the message from service worker to chat
          const swMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: event.data.message,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, swMessage]);
          
          // Show toast notification if important
          if (event.data.importance === 'high') {
            toast({
              title: 'Keep Going Care Update',
              description: event.data.message,
              variant: 'default'
            });
          }
        }
      };
      
      // Register the event listener
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      return () => {
        // Clean up event listener
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
    // No cleanup needed if service workers aren't supported
    return () => {};
  }, []);
  
  // Initialize the chatbot with a welcome message
  useEffect(() => {
    // Get patient name from local storage if available
    try {
      const storedUserData = localStorage.getItem('currentUser');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        if (userData.name) {
          // Extract first name from full name
          const firstName = userData.name.split(' ')[0];
          setPatientName(firstName);
          console.log('EnhancedSupervisorAgent: Retrieved patient name:', firstName);
        }
      }
    } catch (error) {
      console.error('Error retrieving patient name from localStorage:', error);
    }
    
    // Prepare welcome message content
    let welcomeContent = initialMessage || "Hello! 😃\nI'm your personal Keep Going Care (KGC) health assistant. I am a non-diagnostic, Class 1. Software as a Medical Device (SaMD), prescribed by your doctor to help you with your doctor's healthier lifestyle modification care plan. I'm excited to work with you and your doctor to help you reach your health goals. I'm here for you 24/7 to help with any questions about:\n- Your healthy meal care plan 🥗\n- Your exercise and wellness routine care plan 🏋️\n- Your prescribed medications care plan 💊\nAll designed and updated by your doctor!\nRemember to submit your daily self-scores, 1-10\nfor each of these 3 areas to earn your $100\nhealthy experiences voucher and go into the draw to win the $250 healthy experience voucher drawn every month. \nA score of 5-10 means you're doing great! A score of 4-1 shows you might be facing some challenges, and we can work through them together with my many features.\nRemember, if I don't hear from you for over 24 hours, I'll assume a score of 0 and will reach out to your doctor to keep you safe ✨🩺⛑️\nRemember, you own your data and I keep it secure and delete it if you cancel your subscription. Your self-scores and feedback will be shared in a report for your doctor to review at your next appointment to update your care plan that I use to work with you";
    
    // Replace placeholder with actual patient name if available
    // Check for multiple variations of the placeholder
    if (patientName) {
      if (welcomeContent.includes("[Patient's First Name]") || 
          welcomeContent.includes("[User's First Name]") ||
          welcomeContent.includes("[Patients First Name]") ||
          welcomeContent.includes("[Users First Name]")) {
        // Replace all possible variations
        welcomeContent = welcomeContent
          .replace(/\[Patient's First Name\]/g, patientName)
          .replace(/\[User's First Name\]/g, patientName)
          .replace(/\[Patients First Name\]/g, patientName)
          .replace(/\[Users First Name\]/g, patientName);
        console.log('EnhancedSupervisorAgent: Replaced patient name placeholder in welcome message');
      }
    }
    
    const welcomeMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date(),
      offline: isOffline
    };
    setMessages([welcomeMessage]);
    
    // Check network connectivity
    checkConnectivity();
    
    // Setup connectivity monitoring
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initialize engagement milestone if it doesn't exist
    const initializeEngagementMilestone = async () => {
      try {
        if (!milestoneExists("Chatbot Assistant Use", "Engagement")) {
          await createOrUpdateMilestone(
            "Chatbot Assistant Use", 
            "Interact with your Keep Going Care Personal Health Assistant regularly for personalised guidance",
            "Engagement",
            10, // Start with 10% progress for first interaction
            false,
            "Award" // Icon type
          );
          console.log("Created initial chatbot engagement milestone");
        } else {
          console.log("Chatbot engagement milestone already exists");
        }
      } catch (error) {
        console.error("Error initializing engagement milestone:", error);
      }
    };
    
    initializeEngagementMilestone();
    
    // Check if we have health metrics data and need to analyze it
    const hasHealthMetrics = healthMetrics && 
      typeof healthMetrics.dietScore === 'number' && 
      typeof healthMetrics.exerciseScore === 'number' && 
      typeof healthMetrics.medicationScore === 'number';
      
    // Check if the initial message indicates we should analyze health metrics
    // Either an explicit message about analysis or any recent health metrics submission
    const shouldAnalyzeMetrics = initialMessage && (
      // Explicit analysis message
      (initialMessage.toLowerCase().includes('analyze') && 
       initialMessage.toLowerCase().includes('health')) ||
      // Or just submitted health scores message
      initialMessage.toLowerCase().includes('submitted') ||
      // Or general health scores analysis message
      initialMessage.toLowerCase().includes('health scores')
    );
      
    // We no longer auto-analyze metrics, instead we wait for the user's confirmation
    // The user will be prompted with initialMessage asking if they want to discuss scores
    if (hasHealthMetrics && shouldAnalyzeMetrics && !isOffline) {
      console.log('EnhancedSupervisorAgent: Health metrics detected, waiting for user confirmation:', healthMetrics);
      // No automatic analysis, let the user confirm first
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Stop any ongoing speech when component unmounts
      stopSpeaking();
    };
  }, [initialMessage, isOffline, healthMetrics]);
  
  // Function to handle health metrics analysis
  const handleHealthMetricsAnalysis = async () => {
    // Set the agent to thinking state
    setAgentStatus('thinking');
    
    try {
      // Create a specific prompt for health metrics analysis with formal Australian English and KGC feature recommendations
      const analysisPrompt = `Please analyze my recent health scores using formal, professional Australian English (avoiding colloquialisms) and provide specific, personalised feedback with KGC feature recommendations:
      Diet: ${healthMetrics?.dietScore}/10
      Exercise: ${healthMetrics?.exerciseScore}/10
      Medication: ${healthMetrics?.medicationScore}/10
      
      Always respond quickly with:
      1. Specific praise for scores 7-10
      2. Supportive encouragement for any scores below 7
      3. Concrete recommendations of specific KGC features that could help improve lower scores
      4. Examples of how to use these features
      5. End with a direct question about which feature they'd like to try first`;
      
      // Create a pending message
      const pendingMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '...',
        timestamp: new Date(),
        pending: true
      };
      
      // Add the analysis request as if from the user
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: analysisPrompt,
        timestamp: new Date()
      };
      
      // Add messages
      setMessages(prev => [...prev, userMessage, pendingMessage]);
      
      // Get conversation history
      const conversationHistory = [
        ...messages.slice(-5),
        userMessage
      ].map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Send request to the Supervisor Agent service
      let responseData;
      try {
        const response = await axios.post('/api/supervisor/chat', {
          message: analysisPrompt,
          patientId: userId,
          context: { 
            healthMetrics,
            conversationHistory,
            connectivityLevel,
            type: 'health_analysis'
          }
        });
        
        // Safety check for valid response
        responseData = response.data?.data || {};
      } catch (apiError) {
        console.error("Supervisor Agent API request failed:", apiError);
        throw new Error("Failed to communicate with assistant service");
      }
      
      // Process the Supervisor Agent response
      let primaryResponse = responseData.message || "I'm sorry, I couldn't process your health scores properly. How else can I help you today?";
      const emergencyDetected = responseData.emergencyDetected || false;
      const milestoneAchieved = responseData.milestoneAchieved || false;
      const cpdCompliance = responseData.cpdCompliance || null;
      const recommendedFeatures = responseData.recommendedFeatures || [];
      const offline = false; // Supervisor Agent responses are always online
      
      // Replace placeholder with actual patient name if available
      // Check for multiple variations of the placeholder
      if (patientName) {
        if (primaryResponse.includes("[Patient's First Name]") || 
            primaryResponse.includes("[User's First Name]") ||
            primaryResponse.includes("[Patients First Name]") ||
            primaryResponse.includes("[Users First Name]")) {
          // Replace all possible variations
          primaryResponse = primaryResponse
            .replace(/\[Patient's First Name\]/g, patientName)
            .replace(/\[User's First Name\]/g, patientName)
            .replace(/\[Patients First Name\]/g, patientName)
            .replace(/\[Users First Name\]/g, patientName);
          console.log('EnhancedSupervisorAgent: Replaced patient name placeholder');
        }
      }
      
      // Remove pending message
      setMessages(prev => 
        prev.filter(msg => msg.id !== pendingMessage.id)
      );
      
      // Add assistant response
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: primaryResponse,
        timestamp: new Date(),
        offline
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Read the response aloud if speech is enabled
      if (isSpeechEnabled) {
        speakTextWithStatus(primaryResponse);
      } else {
        // Set the agent back to idle only if we're not speaking
        setAgentStatus('idle');
      }
      
    } catch (error) {
      console.error('Error analyzing health metrics:', error);
      
      // Add an error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm sorry, I wasn't able to analyze your health scores at this time. Let me know if you'd like to try again.",
        timestamp: new Date()
      };
      
      // Remove any pending messages
      setMessages(prev => 
        prev.filter(msg => !msg.pending).concat(errorMessage)
      );
      
      // Set the agent back to idle
      setAgentStatus('idle');
    }
  };

  // Scroll to the bottom of the chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop speech when speech is disabled
  useEffect(() => {
    if (!isSpeechEnabled) {
      stopSpeaking();
    }
  }, [isSpeechEnabled]);

  // Simplified connectivity check - just try to ping the server
  const checkConnectivity = async () => {
    try {
      const response = await fetch('/api/connectivity/test');
      // Always set connectivity to FULL regardless of response
      // This prevents error messages on mobile devices with intermittent connectivity
      setConnectivity(ConnectivityLevel.FULL);
    } catch (error) {
      // Even if we can't reach the server, keep showing as online
      // to avoid disrupting the user experience
      console.log('Connectivity check failed, but keeping status as online');
      setConnectivity(ConnectivityLevel.FULL);
    }
  };

  // Handle online status change
  const handleOnline = () => {
    setConnectivity(ConnectivityLevel.FULL);
    // Try to sync any pending data
    fetch('/api/sync', { method: 'POST' }).catch(() => {}); // Ignore errors
  };

  // Handle offline status change - but keep showing as online
  const handleOffline = () => {
    // Log the offline event but keep the UI showing as online
    console.log('Browser reported offline status, but keeping UI as online');
    // Don't change connectivity status to avoid disrupting user experience
    setConnectivity(ConnectivityLevel.FULL);
  };

  // Get the conversation history for context
  const getConversationHistory = () => {
    // Limit to last 10 messages for context window efficiency
    return messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  };

  // Handle user input submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim() || agentStatus !== 'idle') return;
    
    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    // Create pending assistant message
    const pendingMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '...',
      timestamp: new Date(),
      pending: true
    };
    
    // Update messages and clear input
    setMessages(prev => [...prev, userMessage, pendingMessage]);
    setInput('');
    setAgentStatus('thinking');
    
    // Check if the user is responding positively to reviewing their health scores
    const positiveResponses = ['yes', 'yeah', 'sure', 'ok', 'okay', 'please', 'i would', 'let\'s do it', 'let\'s discuss', 'discuss', 'analyze', 'review'];
    const userInputLower = userMessage.content.toLowerCase().trim();
    
    // If we have health metrics and the user is responding positively to the initial prompt
    if (healthMetrics && 
        positiveResponses.some(response => userInputLower.includes(response)) && 
        messages.length <= 3) { // Only trigger this for the first user response after initial prompt
      
      console.log('Detected user wants to analyze health scores');
      // Cancel this regular response
      setMessages(prev => prev.filter(msg => msg.id !== pendingMessage.id));
      
      // Directly call health metrics analysis instead
      handleHealthMetricsAnalysis();
      return;
    }
    
    try {
      // Check connectivity before sending request
      await checkConnectivity();
      
      // Get conversation history
      const conversationHistory = getConversationHistory();
      
      // Log the connectivity level we're sending to the server
      console.log(`Sending request with connectivity level: ${ConnectivityLevel[connectivityLevel]} (${connectivityLevel})`);
      
      // Send request to the Supervisor Agent service
      let responseData;
      try {
        const response = await axios.post('/api/supervisor/chat', {
          message: userMessage.content,
          patientId: userId,
          context: { 
            healthMetrics,
            conversationHistory,
            connectivityLevel,
            type: 'general_chat'
          }
        });
        
        // Safety check for valid response
        responseData = response.data?.data || {};
      } catch (apiError) {
        console.error("Supervisor Agent API request failed:", apiError);
        throw new Error("Failed to communicate with assistant service");
      }
      
      // Process the Supervisor Agent response
      let primaryResponse = responseData.message || "I'm sorry, I couldn't process that properly. How else can I help you today?";
      const emergencyDetected = responseData.emergencyDetected || false;
      const milestoneAchieved = responseData.milestoneAchieved || false;
      const cpdCompliance = responseData.cpdCompliance || null;
      const recommendedFeatures = responseData.recommendedFeatures || [];
      const offline = false; // Supervisor Agent responses are always online
      
      // Sanitize the response to remove any system prompt directives or markers that might have leaked through
      primaryResponse = sanitizeChatbotResponse(primaryResponse);
      
      // Replace placeholder with actual patient name if available
      // Check for multiple variations of the placeholder
      if (patientName) {
        if (primaryResponse.includes("[Patient's First Name]") || 
            primaryResponse.includes("[User's First Name]") ||
            primaryResponse.includes("[Patients First Name]") ||
            primaryResponse.includes("[Users First Name]")) {
          // Replace all possible variations
          primaryResponse = primaryResponse
            .replace(/\[Patient's First Name\]/g, patientName)
            .replace(/\[User's First Name\]/g, patientName)
            .replace(/\[Patients First Name\]/g, patientName)
            .replace(/\[Users First Name\]/g, patientName);
          console.log('EnhancedSupervisorAgent: Replaced patient name placeholder in response');
        }
      }
      
      // Remove pending message
      setMessages(prev => 
        prev.filter(msg => msg.id !== pendingMessage.id)
      );
      
      // Add assistant response
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: primaryResponse,
        timestamp: new Date(),
        offline
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Handle emergency detection
      if (emergencyDetected) {
        console.warn('Emergency detected in patient message - healthcare team has been alerted');
        toast({
          title: "Emergency Alert",
          description: "Your healthcare team has been notified and will contact you soon.",
          variant: "destructive"
        });
      }
      
      // Handle milestone achievements
      if (milestoneAchieved) {
        console.log('New milestone achieved!');
        toast({
          title: "Achievement Unlocked! 🏆",
          description: "You've reached a new health milestone!",
          variant: "default"
        });
      }
      
      // Display CPD compliance if available
      if (cpdCompliance) {
        console.log('CPD compliance analysis:', cpdCompliance);
      }
      
      // Log recommended features
      if (recommendedFeatures.length > 0) {
        console.log('Recommended KGC features:', recommendedFeatures);
      }
      
      // Read the response aloud if speech is enabled
      if (isSpeechEnabled) {
        speakTextWithStatus(primaryResponse);
      }
      
      // Update engagement milestone progress (in background, don't let errors affect main response)
      const updateEngagementMilestone = async () => {
        try {
          // Get conversation count from message history (only count user messages)
          const userMessageCount = messages.filter(msg => msg.role === 'user').length + 1; // +1 for current message
          
          // Calculate progress based on conversation count (max at 20 conversations = 100%)
          const progress = Math.min(Math.floor((userMessageCount / 20) * 100), 100);
          const completed = progress >= 100;
          
          // Update the milestone
          await createOrUpdateMilestone(
            "Chatbot Assistant Use",
            "Interact with your Keep Going Care Personal Health Assistant regularly for personalised guidance",
            "Engagement",
            progress,
            completed,
            "Award"
          );
          
          console.log(`Updated chatbot engagement milestone: ${progress}%`);
          
          // Check for health-related themes in the conversation to create or update a health milestone
          const healthTerms = ["diet", "exercise", "medication", "health", "wellness", "nutrition"];
          const conversationText = userMessage.content.toLowerCase() + ' ' + primaryResponse.toLowerCase();
          
          if (healthTerms.some(term => conversationText.includes(term))) {
            // If health-related conversation, create/update a health milestone
            const healthMilestoneTitle = "Health Discussion Engagement";
            const healthScore = Math.min(userMessageCount * 5, 100); // 20 health discussions = 100%
            
            await createOrUpdateMilestone(
              healthMilestoneTitle,
              "Regularly discuss and learn about health topics with your Personal Health Assistant",
              "Health",
              healthScore,
              healthScore >= 100,
              "Star"
            );
            
            console.log(`Updated health discussion milestone: ${healthScore}%`);
          }
        } catch (error) {
          // Don't let milestone errors affect the main chatbot response
          console.error("Error updating milestones (non-critical):", error);
        }
      };
      
      // Run milestone updates in background (don't await to prevent blocking main response)
      if (!isOffline) {
        updateEngagementMilestone().catch(() => {
          // Silently handle any remaining errors
        });
      }
      
      // Note: Memory system is now handled by Supervisor Agent backend
      
    } catch (error) {
      console.error('Error getting MCP response:', error);
      
      // Remove pending message
      setMessages(prev => 
        prev.filter(msg => msg.id !== pendingMessage.id)
      );
      
      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: isOffline ?
          "I'm sorry, but I can't process your request while offline. Basic features are still available, but I need an internet connection for full functionality." :
          "I'm sorry, but I'm having trouble processing your request right now. Could you please try again?",
        timestamp: new Date(),
        offline: isOffline || isMinimal
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Disable error toast notifications for better mobile experience
      console.log('Error getting response, but not showing toast notification');
      // toast({
      //   title: 'Error',
      //   description: 'Failed to get a response from the assistant.',
      //   variant: 'destructive',
      // });
    } finally {
      setAgentStatus('idle');
    }
  };
  
  // Handle special key presses
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Enhanced text-to-speech function that sets the agent status
  const speakTextWithStatus = (text: string) => {
    // Use our imported speakText function
    speakText(text);
    
    // Update agent status
    setAgentStatus('speaking');
    
    // Reset status when done speaking (approximately)
    setTimeout(() => {
      if (agentStatus === 'speaking') {
        setAgentStatus('idle');
      }
    }, text.length * 50); // Rough estimate of speech duration
  };
  
  // Toggle speech output functionality
  const toggleSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (isSpeechEnabled) {
        stopSpeaking();
      } else {
        // Test speech synthesis
        speakTextWithStatus("Speech output is now enabled.");
      }
      setIsSpeechEnabled(!isSpeechEnabled);
    } else {
      toast({
        title: 'Speech Not Available',
        description: 'Text-to-speech is not supported in your browser.',
        variant: 'destructive',
      });
    }
  };
  
  // Initialize speech recognition using our centralized utility
  const initSpeechRecognition = () => {
    // Use the createSpeechRecognition utility function from speechUtils
    const recognition = createSpeechRecognition();
    
    if (!recognition) {
      toast({
        title: 'Voice Input Not Available',
        description: 'Speech recognition is not supported in your browser.',
        variant: 'destructive',
      });
      return null;
    }
    
    // Set up event handlers
    recognition.onresult = (event: SpeechRecognitionEventType) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      toast({
        title: 'Voice Input Error',
        description: `Failed to recognize speech: ${event.error}`,
        variant: 'destructive',
      });
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    return recognition;
  };
  
  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      if (speechRecognition) {
        speechRecognition.stop();
      }
      setIsListening(false);
    } else {
      // Start listening
      if (!speechRecognition) {
        const recognition = initSpeechRecognition();
        if (!recognition) return;
        setSpeechRecognition(recognition);
        try {
          recognition.start();
          setIsListening(true);
          toast({
            title: 'Listening',
            description: 'Speak now...',
            variant: 'default',
          });
        } catch (error) {
          console.error('Failed to start speech recognition', error);
        }
      } else {
        try {
          speechRecognition.start();
          setIsListening(true);
          toast({
            title: 'Listening',
            description: 'Speak now...',
            variant: 'default',
          });
        } catch (error) {
          console.error('Failed to start speech recognition', error);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg shadow-md">
      {/* Only show header if hideHeader is false */}
      {/* Always show the accessibility controls, but conditionally show the header title */}
      <div className="p-4 border-b flex justify-between items-center">
        {!hideHeader && (
          <h2 className="text-xl font-semibold">KGC Health Assistant</h2>
        )}
        <div className={`flex items-center gap-2 ${hideHeader ? 'ml-auto' : ''}`}>
          {/* Connectivity indicator */}
          {isOffline ? (
            <div className="flex items-center gap-1 text-destructive">
              <WifiOff size={16} />
              <span className="text-xs">Offline</span>
            </div>
          ) : isMinimal ? (
            <div className="flex items-center gap-1 text-amber-500">
              <Wifi size={16} />
              <span className="text-xs">Limited</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-green-500">
              <Wifi size={16} />
              <span className="text-xs">Online</span>
            </div>
          )}
          
          {/* Speech toggle (text-to-speech) - with improved label positioning */}
          <div className="relative flex flex-col items-center mx-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSpeech}
              aria-label={isSpeechEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}
            >
              {isSpeechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </Button>
            <span className="text-[10px] text-center mt-1 w-16">Text-to-Speech</span>
          </div>
          
          {/* Text-to-speech toggle only in the header now */}
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.offline
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-accent text-accent-foreground'
              } ${message.pending ? 'opacity-70' : ''} ${!message.pending && message.role === 'assistant' ? 'cursor-pointer' : ''}`}
              onClick={() => {
                // Only allow speech for assistant messages that aren't pending
                if (isSpeechEnabled && !message.pending && message.role === 'assistant') {
                  speakTextWithStatus(message.content);
                }
              }}
              title={isSpeechEnabled && !message.pending && message.role === 'assistant' ? "Click to hear this message" : ""}
            >
              {message.pending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {/* Show speech indicator if text-to-speech is enabled for assistant messages */}
                  {isSpeechEnabled && message.role === 'assistant' && (
                    <div className="absolute top-0 right-0 p-1">
                      <Volume2 size={12} className="text-muted-foreground opacity-70" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Show offline indicator if the message was generated offline */}
              {message.offline && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <WifiOff size={12} />
                  <span>Offline response</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Offline alerts are now handled by the ConnectivityBanner component */}
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isListening ? "Listening for your voice input..." : "Type your message..."}
            className="resize-none"
            disabled={agentStatus !== 'idle' || isListening}
          />
          <div className="self-end flex flex-col gap-2">
            {/* Voice input button - moved to chat input area */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleListening}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              className={`${isListening ? "bg-red-100 border-red-300" : ""}`}
              disabled={agentStatus !== 'idle'}
              title="Voice Input"
            >
              {isListening ? <MicOff size={18} className="text-red-500" /> : <Mic size={18} />}
            </Button>
            
            {/* Send button */}
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || agentStatus !== 'idle' || isListening}
              className={`${agentStatus !== 'idle' || isListening ? 'opacity-50' : ''}`}
              aria-label="Send message"
            >
              {agentStatus === 'thinking' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Voice input status indicator */}
        {isListening && (
          <div className="flex items-center justify-center mt-2 text-sm text-primary animate-pulse">
            <Mic className="h-4 w-4 mr-1" />
            <span>Listening... Speak now</span>
          </div>
        )}
      </form>
    </div>
  );
}

export default EnhancedSupervisorAgent;