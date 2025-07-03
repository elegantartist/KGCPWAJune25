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
import { useSimpleToast } from '@/hooks/simple-toast';
import { ConnectivityLevel } from '@/../../shared/types';
import { useProgressMilestones } from '@/hooks/useProgressMilestones';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineQueueService } from '@/services/offlineQueueService';
import { useNotificationStore } from '@/stores/notificationStore';
import { speakText, stopSpeaking } from '@/lib/speechUtils';
import { sendChatMessage } from '@/services/chatService';
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
    /# CARE PLAN DIRECTIVES[\s\S]*?(?=\n\n|$)/,
    /# IMPORTANT PATIENT MEMORY CONTEXT[\s\S]*?(?=\n\n|$)/,
    /# FOOD PREFERENCES AND DIETARY CONTEXT[\s\S]*?(?=\n\n|$)/,
    /# FOOD DATABASE PREFERENCES[\s\S]*?(?=\n\n|$)/,
    /CRITICAL COMPLIANCE REQUIREMENT:[\s\S]*?(?=\n\n|$)/,
    /# SYSTEM INSTRUCTIONS[\s\S]*?(?=\n\n|$)/,
    /\[SYSTEM:[\s\S]*?\]/,
    /\[INSTRUCTIONS:[\s\S]*?\]/
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
  
  // Visual connectivity system hooks
  const isOnline = useOnlineStatus();
  const { setPendingMessageCount } = useNotificationStore();
  
  // State for storing patient name
  const [patientName, setPatientName] = useState<string>('');
  
  // Simplified connectivity state - using the visual connectivity system
  const currentConnectivityLevel = isOnline ? ConnectivityLevel.FULL : ConnectivityLevel.OFFLINE;
  const isOffline = !isOnline;
  const isMinimal = false;
  const isFunctional = isOnline;
  const isFull = isOnline;

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
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Welcome to your KGC Health Assistant. How can I help you today?",
        timestamp: new Date(),
        offline: isOffline
      }
    ]);
  }, []);
  
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
        role: 'system', // This is a system-initiated action, not a direct user message
        content: "Analyzing health scores...",
        timestamp: new Date()
      };
      
      // Add messages
      setMessages(prev => [...prev, userMessage, pendingMessage]);
      
      // --- REFACTORED API CALL ---
      // Use the new chat service to send the analysis prompt to the backend.
      const apiResponse = await sendChatMessage(analysisPrompt, crypto.randomUUID());

      // Process the response from the service
      let primaryResponse = apiResponse.response;
      const offline = !!apiResponse.error;
      
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
      if (isSpeechEnabled && !offline) {
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

  // Simplified connectivity check - using visual connectivity system
  const checkConnectivity = async () => {
    // Visual connectivity system handles this automatically
    console.log('Connectivity status:', isOnline ? 'online' : 'offline');
  };

  // Handle online status change
  const handleOnline = () => {
    // Visual connectivity system handles sync automatically
    console.log('Browser came back online');
  };

  // Handle offline status change
  const handleOffline = () => {
    // Visual connectivity system handles offline state
    console.log('Browser went offline');
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
    
    const userInput = input.trim();
    if (!userInput || agentStatus !== 'idle') return;

    // Clear input immediately for better UX
    setInput('');

    // Create user message for UI
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userInput,
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
    setAgentStatus('thinking');
    
    // If offline, queue the message for later processing
    if (!isOnline) {
      // Remove pending message
      setMessages(prev => prev.filter(msg => msg.id !== pendingMessage.id));
      
      // Add to offline queue
      offlineQueueService.addToQueue({
        id: crypto.randomUUID(),
        text: userInput,
        sentAt: new Date().toISOString(),
        userId,
        sessionId: crypto.randomUUID()
      });
      
      // Add offline response message
      const offlineMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Your message has been saved. I\'ll respond when you\'re back online.',
        timestamp: new Date(),
        offline: true
      };
      
      setMessages(prev => [...prev, offlineMessage]);
      setAgentStatus('idle');
      
      // Update pending count in notification store
      setPendingMessageCount(offlineQueueService.getPendingCount());
      
      return;
    }

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
      // --- REFACTORED API CALL ---
      // Use the new chat service to send the message to the backend.
      const apiResponse = await sendChatMessage(userInput, crypto.randomUUID());

      // Process the response from the service
      let primaryResponse = apiResponse.response;
      const offline = !!apiResponse.error; // Check if the service returned an error
      
      // Sanitize the response to remove any system prompt directives or markers that might have leaked through
      primaryResponse = sanitizeChatbotResponse(primaryResponse);
      
      // Replace placeholder with actual patient name if available
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
      
      // Read the response aloud if speech is enabled
      if (isSpeechEnabled && !offline) {
        speakTextWithStatus(primaryResponse);
      }
      
      // Update engagement milestone progress
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
          console.error("Error updating milestones:", error);
        }
      };
      
      // Only update milestones if we're not offline
      if (!isOffline) {
        updateEngagementMilestone();
      }
      
      // Log debugging information for supervisor agent interaction
      console.debug('Time-aware supervisor agent interaction completed successfully');
      
    } catch (error) {
      // The chatService handles its own errors and returns a user-friendly message,
      // so this top-level catch block is less critical but good for catching
      // unexpected issues in the UI logic itself.
      console.error('Error in handleSubmit UI logic:', error);
      
      // Remove pending message
      setMessages(prev => 
        prev.filter(msg => msg.id !== pendingMessage.id)
      );
      
      // Add a generic error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm sorry, but an unexpected error occurred. Please try again.",
        timestamp: new Date(),
        offline: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
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