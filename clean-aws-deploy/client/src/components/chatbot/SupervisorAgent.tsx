import { useState, useEffect } from 'react';
import { useMCP, type Recommendation, type ValidatedAIResponse } from './ModelContextProtocol';
import { createHapticFeedback } from '@/lib/soundEffects';
import { speakText, stopSpeaking, createSpeechRecognition, type SpeechRecognition } from '@/lib/speechUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Define the Message interface to be used throughout the component
export interface SupervisorMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Define the interface for the supervisor agent global object
export interface SupervisorAgentInterface {
  addMessage: (message: SupervisorMessage) => void;
  setIsTyping: (isTyping: boolean) => void;
  hasAddedCustomMessage: () => boolean;
}

// Using the SpeechRecognition interface imported from speechUtils

// Extend the Window interface to allow our supervisor agent reference
declare global {
  interface Window {
    // Define the global property explicitly with the SupervisorAgentInterface type
    __KGC_SUPERVISOR_AGENT__?: SupervisorAgentInterface;
  }
}
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { 
  Activity, 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  Brain, 
  CheckCircle, 
  ClipboardList, 
  MessageSquare, 
  X
} from 'lucide-react';

interface SupervisorAgentProps {
  userId: number;
  agentName?: string;
  agentAvatar?: string;
  initialMessages?: SupervisorMessage[];
  onMessageSent?: (message: string) => void;
  onRecommendationReceived?: (recommendation: Recommendation | null) => void;
  className?: string;
}

export default function SupervisorAgent({
  userId,
  agentName = "KGC Supervisor",
  agentAvatar = "https://via.placeholder.com/150",
  initialMessages = [],
  onMessageSent,
  onRecommendationReceived,
  className = "",
}: SupervisorAgentProps) {
  const [messages, setMessages] = useState<SupervisorMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [messageIdCounter, setMessageIdCounter] = useState(initialMessages.length);
  const [isTyping, setIsTyping] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [aiResponse, setAiResponse] = useState<ValidatedAIResponse | null>(null);
  const [hasAddedCustomMessage, setHasAddedCustomMessage] = useState<boolean>(false);
  const { isConnected, recommendation, recordFeatureUsage, requestRecommendation, generateValidatedResponse } = useMCP(userId);
  
  // Expose functions to parent components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__KGC_SUPERVISOR_AGENT__ = {
        addMessage: (message: SupervisorMessage) => {
          console.log('SupervisorAgent: External component adding a message');
          // Check if we already have a similar message to prevent duplicates
          const hasSimilarMessage = messages.some(existingMsg => 
            !existingMsg.isUser && 
            (existingMsg.text.includes(message.text.substring(0, 50)) || 
             message.text.includes(existingMsg.text.substring(0, 50)))
          );
          
          if (hasSimilarMessage) {
            console.log('SupervisorAgent: Skipping message add - similar message already exists');
            return;
          }
          
          console.log('SupervisorAgent: Adding new message from external component');
          addAgentMessage(message);
          setHasAddedCustomMessage(true);
        },
        setIsTyping,
        hasAddedCustomMessage: () => {
          // Check if we have any non-user messages already
          const hasAgentMessages = messages.some(msg => !msg.isUser);
          return hasAgentMessages || hasAddedCustomMessage;
        }
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__KGC_SUPERVISOR_AGENT__;
      }
    };
  }, [hasAddedCustomMessage, messages]);
  const hapticFeedback = createHapticFeedback;
  
  // Generate a unique ID for each message
  const generateMessageId = () => {
    // Use combination of counter and timestamp for truly unique IDs
    const newId = Date.now() + messageIdCounter;
    setMessageIdCounter(prev => prev + 1);
    return newId;
  };
  
  // Voice recognition and speech synthesis state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingMessage, setActiveSpeakingMessage] = useState<number | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    try {
      const recognition = createSpeechRecognition();
      
      if (recognition) {
        // Configure recognition callbacks
        recognition.onresult = (event) => {
          try {
            console.log('Speech recognition result:', event);
            const transcript = event.results[0][0].transcript;
            console.log('Transcript received:', transcript);
            setInputValue(transcript);
            // Small delay to allow user to see what was transcribed before sending
            setTimeout(() => {
              handleSendMessage();
            }, 500);
          } catch (error) {
            console.error('Error processing speech result:', error);
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
        };
        
        setSpeechRecognition(recognition);
        console.log('Speech recognition initialized successfully');
      } else {
        console.warn('Failed to create speech recognition instance');
      }
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }, []);

  // Toggle speech recognition
  const toggleListening = () => {
    try {
      console.log('Toggle listening called. Current state:', isListening);
      
      if (!speechRecognition) {
        console.warn('Speech recognition not initialized');
        // Try to reinitialize speech recognition
        const recognition = createSpeechRecognition();
        if (recognition) {
          recognition.onresult = (event) => {
            try {
              console.log('Speech recognition result:', event);
              const transcript = event.results[0][0].transcript;
              console.log('Transcript received:', transcript);
              setInputValue(transcript);
              setTimeout(() => {
                handleSendMessage();
              }, 500);
            } catch (error) {
              console.error('Error processing speech result:', error);
            }
          };
          
          recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
          };
          
          recognition.onend = () => {
            console.log('Speech recognition ended');
            setIsListening(false);
          };
          
          setSpeechRecognition(recognition);
          console.log('Speech recognition reinitialized');
          
          // Start listening immediately
          hapticFeedback();
          recognition.start();
          setIsListening(true);
        }
        return;
      }
      
      if (isListening) {
        console.log('Stopping speech recognition');
        speechRecognition.stop();
      } else {
        console.log('Starting speech recognition');
        hapticFeedback();
        speechRecognition.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error toggling speech recognition:', error);
      setIsListening(false);
    }
  };
  
  // Toggle speech synthesis with message ID tracking
  const toggleSpeaking = (text: string, messageId: number) => {
    if (isSpeaking && activeSpeakingMessage === messageId) {
      // Stop speaking if this is the currently speaking message
      stopSpeaking();
      setIsSpeaking(false);
      setActiveSpeakingMessage(null);
    } else if (isSpeaking) {
      // If another message is speaking, stop it and start this one
      stopSpeaking();
      hapticFeedback();
      speakText(text);
      setIsSpeaking(true);
      setActiveSpeakingMessage(messageId);
      
      startSpeakingCheckInterval();
    } else {
      // No message is currently speaking, start this one
      hapticFeedback();
      speakText(text);
      setIsSpeaking(true);
      setActiveSpeakingMessage(messageId);
      
      startSpeakingCheckInterval();
    }
  };
  
  // Helper to start checking for speaking completion
  const startSpeakingCheckInterval = () => {
    // Check every 100ms if speech synthesis has finished
    const speakingCheckInterval = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsSpeaking(false);
        setActiveSpeakingMessage(null);
        clearInterval(speakingCheckInterval);
      }
    }, 100);
  };
  
  // Add a message from the agent
  const addAgentMessage = (message: SupervisorMessage) => {
    setMessages(prev => [...prev, message]);
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;
    
    // Create the user message
    const userMessage: SupervisorMessage = {
      id: generateMessageId(),
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };
    
    // Add user message to the chat
    setMessages(prev => [...prev, userMessage]);
    
    // Store the user message for later processing
    const userPrompt = inputValue.trim();
    
    // Clear input field
    setInputValue('');
    
    // Provide haptic feedback
    hapticFeedback();
    
    // Notify parent component
    if (onMessageSent) {
      onMessageSent(userPrompt);
    }
    
    // Show agent is typing
    setIsTyping(true);
    
    try {
      // Set up the system prompt based on the user's health needs
      const systemPrompt = `You are KGC (Keep Going Care), a personal health assistant.
Your role is to help users improve health metrics and meet health goals.
Provide professional, concise responses in Australian English without colloquialisms.
Never diagnose medical conditions or provide specific medical advice.
Refer users to healthcare providers when appropriate.
Address the patient by name (e.g., "Bill") occasionally in your responses.

AVAILABLE FEATURES (ONLY RECOMMEND THESE):
1. Home - Main dashboard with easy access buttons for chat, daily self-scores your "Keep Going" button
2. Daily Self-Scores - Where you recording how you feel you are going on your healthy lifestyle journey, essential for communicating your progress with your doctor who modifies your Care Plan Directives that guide us between your consultations. Your daily self-scores earn you money to spend on healthy experiences such as gym, pilates, yoga and health spas, healthy dining experiences and more!
3. Motivational Image Processing (MIP) - Upload and enhance your chosen motivational image, integrated with the "Keep Going" button
4. Inspiration Machine D - Provides meal inspiration ideas aligned with your personal care plan CPDs and preferences
5. Diet Logistics - Provides a link for grocery and prepared meals delivery options aligned with your personal care plan CPDs and preferences
6. Inspiration Machine E&W - Provides exercise and wellness inspiration ideas aligned with your personal care plan CPDs, abilities and preferences
7. E&W Support - Assists you to search for local gyms, personal trainers, yoga, and pilates studios to enhance your exercise and wellness experiences
8. MBP Wiz - Finds best prices on medications via Chemist Warehouse with pharmacy location information
9. Journaling - Record thoughts, track progress, and document health experiences. Can be useful for you and your doctor to discuss your medication compliance and adherence
10. Progress Milestones - KGC achievement badges are awarded for maintaining consistent health scores over time. Check out this feature to understand how you can earn $100 and more for your Keep Going Care efforts
11. Food Database - Provides nutritional information and food recommendations based on Food Standards Australia including the FoodSwitch label scanning app used to learn more about your food choices
12. Chatbot - KGC AI assistant for answering questions and providing guidance
13. Health Snapshots - Provides visual progress summaries and adherence tracking of your daily self-scores`;
      
      // Send the prompt to the MCP system for validated processing
      console.log('SupervisorAgent: Generating validated response for prompt:', userPrompt);
      
      // Get the validated response from our multi-provider MCP system
      const validatedResponse = await generateValidatedResponse(
        userPrompt,
        systemPrompt,
        // Optional: include health category if relevant (exercise, diet, mental-health, etc.)
        undefined
      );
      
      console.log('SupervisorAgent: Received validated response:', validatedResponse);
      
      // Store the response for use in the UI
      setAiResponse(validatedResponse);
      
      let responseText = validatedResponse?.primaryResponse || 
        "I'm sorry, I'm having trouble generating a response right now. How else can I help you?";
        
      // If there's a recommendation, include it in the response
      if (recommendation) {
        console.log('SupervisorAgent: Including recommendation in response:', recommendation);
        
        // Make a nicer message with the feature name and directive
        const featureName = recommendation.recommendedFeature.split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
          
        // Only append recommendation if not already mentioned in the AI response
        const directive = recommendation.directive || '';
        if (!responseText.toLowerCase().includes(featureName.toLowerCase()) && 
            directive && !responseText.toLowerCase().includes(directive.toLowerCase())) {
          responseText += `\n\nBased on your health metrics, I also recommend focusing on ${featureName}: ${directive}`;
        }
      }
      
      console.log('SupervisorAgent: Final response text:', responseText);
      
      // Create the bot message
      const botMessage: SupervisorMessage = {
        id: generateMessageId(),
        text: responseText,
        isUser: false,
        timestamp: new Date()
      };
      
      // Add bot message to the chat
      setMessages(prev => [...prev, botMessage]);
      
      // Automatically speak the response with haptic feedback
      hapticFeedback();
      speakText(responseText);
      setIsSpeaking(true);
      setActiveSpeakingMessage(botMessage.id);
      startSpeakingCheckInterval();
      
      // Only show the notification popup if there's a recommendation and it's been a while
      if (recommendation) {
        const currentTime = new Date().getTime();
        
        // Only show popup if it's been at least 5 minutes since the last one
        if (currentTime - lastPopupTime > 300000) {
          console.log('SupervisorAgent: Showing message response popup');
          setShowPopup(true);
          setLastPopupTime(currentTime);
          
          // Hide popup after 5 seconds
          setTimeout(() => {
            setShowPopup(false);
          }, 5000);
        } else {
          console.log('SupervisorAgent: Skipping message response popup, shown too recently');
        }
      }
    } catch (error) {
      console.error('SupervisorAgent: Error generating response:', error);
      
      // Create a fallback bot message if there's an error
      const botMessage: SupervisorMessage = {
        id: generateMessageId(),
        text: "I'm sorry, I'm having trouble processing your request right now. Could you try again in a moment?",
        isUser: false,
        timestamp: new Date()
      };
      
      // Add fallback message to the chat
      setMessages(prev => [...prev, botMessage]);
      
      // Stop any ongoing speech and reset speech states
      if (isSpeaking) {
        stopSpeaking();
        setIsSpeaking(false);
        setActiveSpeakingMessage(null);
      }
    } finally {
      // Agent is no longer typing regardless of success/failure
      setIsTyping(false);
    }
  };
  
  // Handle pressing Enter in the input field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Format timestamp for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Track if we've already requested a recommendation
  const [hasRequestedRecommendation, setHasRequestedRecommendation] = useState(false);
  
  // Ask for a recommendation when the component mounts, but only once
  useEffect(() => {
    console.log('SupervisorAgent: WebSocket connection status changed:', isConnected);
    
    if (isConnected && !hasRequestedRecommendation && !recommendation) {
      console.log('SupervisorAgent: Connection active, requesting recommendation (first time)');
      requestRecommendation();
      setHasRequestedRecommendation(true);
      
      // Set a timeout for a single retry if no recommendation is received
      const timer = setTimeout(() => {
        if (!recommendation) {
          console.log('SupervisorAgent: No recommendation received, trying one more time');
          requestRecommendation();
        }
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, requestRecommendation, hasRequestedRecommendation, recommendation]);
  
  // Track popup appearance time to prevent showing too frequently
  const [lastPopupTime, setLastPopupTime] = useState<number>(0);
  
  // Notify parent component when a recommendation is received, but limit popup frequency
  useEffect(() => {
    console.log('SupervisorAgent: Recommendation state changed:', recommendation);
    
    if (recommendation) {
      console.log('SupervisorAgent: Notifying parent about recommendation:', 
                 'Feature:', recommendation.recommendedFeature, 
                 'Directive:', recommendation.directive || 'None');
      
      // Always update the parent component with the latest recommendation
      if (onRecommendationReceived) {
        onRecommendationReceived(recommendation);
      }
      
      // Get current time
      const currentTime = new Date().getTime();
      
      // Only show popup if it's been at least 5 minutes since the last one
      // (300000 ms = 5 minutes)
      if (currentTime - lastPopupTime > 300000) {
        console.log('SupervisorAgent: Showing popup (time since last popup:', 
                   Math.floor((currentTime - lastPopupTime) / 1000), 'seconds)');
        
        // Show the notification popup
        setShowPopup(true);
        setLastPopupTime(currentTime);
        
        // Hide popup after 5 seconds
        const timer = setTimeout(() => {
          setShowPopup(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      } else {
        console.log('SupervisorAgent: Skipping popup, shown too recently:', 
                   Math.floor((currentTime - lastPopupTime) / 1000), 'seconds ago');
      }
    }
  }, [recommendation, onRecommendationReceived, lastPopupTime]);
  
  return (
    <div className={`flex flex-col h-full bg-background border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={agentAvatar} alt={agentName} />
            <AvatarFallback>KGC</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{agentName}</h3>
            <div className="flex items-center text-xs text-muted-foreground">
              {isConnected ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                  Connected
                </>
              ) : (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-red-500 mr-1"></span>
                  Disconnected
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Brain size={18} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">MCP System Status</h4>
                <div className="text-xs text-muted-foreground">
                  <p>The Model Context Protocol (MCP) system provides personalised recommendations based on your health data and usage patterns.</p>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection:</span>
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recommendations:</span>
                    <Badge variant={recommendation ? "default" : "outline"}>
                      {recommendation ? "Available" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Multi-LLM Validation:</span>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current Response:</span>
                    <Badge variant={aiResponse?.allResponsesValid ? "default" : (aiResponse ? "destructive" : "outline")}>
                      {!aiResponse ? "None" : (aiResponse.allResponsesValid ? "Validated" : "Warning")}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 mt-2 p-2 bg-muted/30 rounded text-xs">
                    <div className="font-medium">AI Providers:</div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-green-500" />
                      <span>OpenAI</span>
                      {aiResponse?.provider === "openai" && 
                        <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0 h-4">Primary</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-green-500" />
                      <span>Anthropic</span>
                      {aiResponse?.provider === "anthropic" && 
                        <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0 h-4">Primary</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-green-500" />
                      <span>xAI</span>
                      {aiResponse?.provider === "xai" && 
                        <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0 h-4">Primary</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-lg px-3 py-2 
                ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted rounded-tl-none'
                }
              `}
            >
              {!message.isUser && (
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={agentAvatar} alt={agentName} />
                    <AvatarFallback>KGC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{agentName}</span>
                      {/* Show validation badge for the latest message when aiResponse is available */}
                      {message.id === messages[messages.length - 1]?.id && !message.isUser && aiResponse && (
                        <Badge variant={aiResponse.allResponsesValid ? "outline" : "destructive"} 
                               className="ml-auto text-[10px] px-1 py-0 h-4">
                          {aiResponse.allResponsesValid ? "Validated" : "Warning"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="relative">
                <div className="flex justify-between">
                  <div className="flex-1 mr-2">{message.text}</div>
                  {/* Text-to-speech button for agent messages */}
                  {!message.isUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 mt-1"
                      onClick={() => toggleSpeaking(message.text, message.id)}
                      title={(isSpeaking && activeSpeakingMessage === message.id) ? "Stop speaking" : "Listen to message"}
                    >
                      {(isSpeaking && activeSpeakingMessage === message.id) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="6" y="4" width="4" height="16"></rect>
                          <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                      )}
                    </Button>
                  )}
                </div>
                {/* Show warning icon for messages with validation concerns */}
                {!message.isUser && message.id === messages[messages.length - 1]?.id && 
                  aiResponse && !aiResponse.allResponsesValid && (
                  <div className="absolute -right-1 -top-1">
                    <AlertTriangle size={14} className="text-amber-500" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className={message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                  {formatTime(message.timestamp)}
                </span>
                {/* Show which AI model was the primary responder for non-user messages */}
                {!message.isUser && message.id === messages[messages.length - 1]?.id && aiResponse && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      via {aiResponse.provider === "openai" ? "OpenAI" : 
                           aiResponse.provider === "anthropic" ? "Claude" : 
                           aiResponse.provider === "xai" ? "Grok" : aiResponse.provider}
                    </span>
                    {!aiResponse.allResponsesValid && (
                      <span className="text-[10px] text-amber-500">
                        (see validation warning)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg rounded-tl-none px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-foreground/70 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-foreground/70 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Input area */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <textarea
            className="flex-1 min-h-[40px] resize-none border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div className="flex gap-1">
            {/* Voice input button */}
            <Button 
              variant="outline" 
              size="icon" 
              type="button"
              onClick={toggleListening}
              className={`${isListening ? 'bg-red-100 text-red-500 border-red-200' : ''}`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <span className="animate-pulse">●</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" x2="12" y1="19" y2="22"></line>
                </svg>
              )}
            </Button>
            
            {/* Send message button */}
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Recommendation popup */}
      {showPopup && recommendation && (
        <Card className="absolute bottom-20 right-4 w-72 p-3 animate-in fade-in slide-in-from-bottom-5 z-50">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-primary" size={18} />
              <h4 className="font-medium text-sm">Health Recommendation</h4>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPopup(false)}>
              <X size={14} />
            </Button>
          </div>
          <p className="text-sm mt-2">{recommendation.directive || ''}</p>
          <div className="flex justify-between items-center mt-3">
            <Badge variant="outline" className="text-xs">
              {recommendation.recommendedFeature.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPopup(false)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}
      
      {/* AI Validation Details Dialog */}
      {aiResponse && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="absolute bottom-4 right-4 z-10 gap-2 text-xs"
              onClick={() => hapticFeedback()}
            >
              <Brain size={14} />
              View AI Validation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>AI Response Validation</DialogTitle>
              <DialogDescription>
                Your healthcare information is verified by multiple AI systems for accuracy and safety.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Validation Status:</span>
                <Badge variant={aiResponse.allResponsesValid ? "default" : "destructive"}>
                  {aiResponse.allResponsesValid ? "Validated" : "Warning Flags"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <span className="font-medium">Primary Response Provider:</span>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Badge variant="outline">
                    {aiResponse.provider === "openai" ? "OpenAI" : 
                     aiResponse.provider === "anthropic" ? "Claude" : 
                     aiResponse.provider === "xai" ? "Grok" : aiResponse.provider}
                  </Badge>
                </div>
              </div>
              
              {aiResponse.alternativeResponses.length > 0 && (
                <div className="space-y-2">
                  <span className="font-medium">Verification Providers:</span>
                  <div className="flex flex-wrap gap-2">
                    {aiResponse.alternativeResponses.map((alt, idx) => (
                      <Badge key={idx} variant="outline">
                        {alt.provider === "openai" ? "OpenAI" : 
                         alt.provider === "anthropic" ? "Claude" : 
                         alt.provider === "xai" ? "Grok" : alt.provider}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <span className="font-medium">Evaluation Summary:</span>
                <div className="p-3 bg-muted/30 rounded text-sm">
                  {aiResponse.evaluationSummary}
                </div>
              </div>
              
              {/* Add collapsible sections to see alternative responses */}
              {aiResponse.alternativeResponses.length > 0 && (
                <div className="space-y-2 border-t pt-2">
                  <span className="font-medium">View Alternative Responses:</span>
                  <div className="space-y-2">
                    {aiResponse.alternativeResponses.map((alt, idx) => (
                      <div key={idx} className="border rounded p-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {alt.provider === "openai" ? "OpenAI" : 
                             alt.provider === "anthropic" ? "Claude" : 
                             alt.provider === "xai" ? "Grok" : alt.provider}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {aiResponse.provider === alt.provider ? "(selected as primary)" : ""}
                          </span>
                        </div>
                        <div className="mt-2 text-xs line-clamp-3 text-muted-foreground">
                          {alt.response}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogClose asChild>
                <Button className="w-full">Close</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}