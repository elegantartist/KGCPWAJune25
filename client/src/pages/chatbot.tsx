import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, ArrowLeft, Brain, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { Link, useLocation } from "wouter";
import EnhancedSupervisorAgent from "@/components/chatbot/EnhancedSupervisorAgent";
import WelcomeDialogue from "@/components/chatbot/WelcomeDialogue";
import { Recommendation, ModelContextProtocol } from "@/components/chatbot/ModelContextProtocol";
import { apiRequest } from "@/lib/queryClient";
import { ConnectivityLevel } from "@shared/types";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useQuery } from "@tanstack/react-query";
import { speakWelcomeMessage, testSpeechSystem } from "@/lib/speechUtils";

// Message type for the enhanced chatbot
interface Message {
  id: string | number;
  role?: 'system' | 'user' | 'assistant';
  content?: string;
  text?: string;
  isUser?: boolean;
  timestamp: Date;
  isReflection?: boolean;
  offline?: boolean;
  pending?: boolean;
}

// Import the SupervisorMessage type from the SupervisorAgent component
import type { SupervisorMessage, SupervisorAgentInterface } from '@/components/chatbot/SupervisorAgent';
import { generateHealthScoreAnalysis } from '@/lib/healthScoreAnalysis';

// Type definition for the global SupervisorAgent interface
declare global {
  interface Window {
    __KGC_SUPERVISOR_AGENT__?: SupervisorAgentInterface;
  }
}

// Enhanced chatbot page with complete Welcome Dialogue and Voice Features
const Chatbot: React.FC = () => {
  const [userId, setUserId] = useState<number | null>(null); // Will be set from authenticated session
  const [showWelcome, setShowWelcome] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  

  const [initialMessageSent, setInitialMessageSent] = useState<boolean>(false);
  const [userHealthData, setUserHealthData] = useState<{ 
    dietScore: number, 
    exerciseScore: number, 
    medicationScore: number 
  } | null>(null);
  const [showHealthScoreMessage, setShowHealthScoreMessage] = useState<boolean>(true);
  const lastToastTimeRef = useRef<number>(0);
  const { toast } = useToast();
  
  // Get current authenticated user data (from session)
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/patient/profile"],
  });
  
  // Get user's Care Plan Directives for recommendations (only when we have valid userId)
  const { data: userCPDs } = useQuery({
    queryKey: [`/api/users/${userId}/care-plan-directives`],
    enabled: !!userId && userId !== null,
  });

  // Check if this is user's first visit to chatbot
  useEffect(() => {
    const hasVisitedChatbot = localStorage.getItem('hasVisitedChatbot');
    const welcomeSettings = localStorage.getItem('chatbotWelcomeSettings');
    
    if (hasVisitedChatbot) {
      setIsFirstVisit(false);
      setShowWelcome(false);
      
      // Restore previous voice settings
      if (welcomeSettings) {
        try {
          const settings = JSON.parse(welcomeSettings);
          setVoiceEnabled(settings.voiceEnabled || false);
          setAutoSpeak(settings.autoSpeak || false);
          setSpeechRecognition(settings.speechRecognition || false);
        } catch (error) {
          console.error('Error parsing welcome settings:', error);
        }
      }
    }
  }, []);

  // Set user ID when user data loads
  useEffect(() => {
    if (user?.id) {
      console.log('Chatbot: Setting userId to:', user.id, 'for user:', user.name);
      setUserId(user.id);
    }
  }, [user]);

  // Don't render until we have a valid userId
  if (isLoadingUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your health assistant...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Don't render if no valid userId
  if (!userId) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600">Authentication required to access the chatbot.</p>
            <p className="text-gray-600 mt-2">Please log in to continue.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Welcome dialogue completion handler
  const handleWelcomeComplete = (settings: { voiceEnabled: boolean; autoSpeak: boolean; speechRecognition: boolean }) => {
    setShowWelcome(false);
    setVoiceEnabled(settings.voiceEnabled);
    setAutoSpeak(settings.autoSpeak);
    setSpeechRecognition(settings.speechRecognition);
    
    // Store settings and visit flag
    localStorage.setItem('hasVisitedChatbot', 'true');
    localStorage.setItem('chatbotWelcomeSettings', JSON.stringify(settings));
    
    // Initialize Supervisor Agent with personalized welcome
    setTimeout(() => {
      const agent = window.__KGC_SUPERVISOR_AGENT__;
      if (agent) {
        const welcomeMessage = generatePersonalizedWelcome();
        agent.addMessage({
          id: Date.now(),
          text: welcomeMessage,
          isUser: false,
          timestamp: new Date()
        });
      }
    }, 500);
    
    // Speak welcome if voice is enabled
    if (settings.voiceEnabled) {
      const userName = user?.firstName || 'there';
      speakWelcomeMessage(userName, isFirstVisit);
    }
  };

  // Generate personalized welcome based on user context
  const generatePersonalizedWelcome = () => {
    const userName = user?.firstName || 'there';
    let message = `Hello ${userName}! I'm your Keep Going Care Health Assistant, ready to support your wellness journey.`;
    
    // Add context based on recent health metrics
    if (userHealthData) {
      const avgScore = Math.round((userHealthData.dietScore + userHealthData.exerciseScore + userHealthData.medicationScore) / 3);
      if (avgScore >= 8) {
        message += " I can see you're maintaining excellent health habits! Let's explore how to keep up this great momentum.";
      } else if (avgScore >= 6) {
        message += " You're making good progress with your health goals. I'm here to help you reach even higher levels of wellness.";
      } else {
        message += " I'm here to help you build stronger health habits, one step at a time.";
      }
    }
    
    // Add CPD context if available
    if (userCPDs && userCPDs.length > 0) {
      message += ` I have your current Care Plan Directives from your doctor, so all my recommendations will be perfectly aligned with your medical guidance.`;
    }
    
    message += "\n\nWhat would you like to discuss today? I can help with meal ideas, exercise suggestions, local recommendations, or any questions about your KGC features.";
    
    return message;
  };

  // Fetch the user ID and health metrics on mount, then send a personalised initial message  
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserData = async () => {
      // If we already sent an initial message, don't do anything
      if (initialMessageSent) return;
      
      try {
        // First check if we're using a stored user from localStorage (for admin testing)
        const storedUser = localStorage.getItem('currentUser');
        let user;
        
        if (storedUser) {
          try {
            user = JSON.parse(storedUser);
            console.log('Chatbot: Using user from localStorage:', user);
          } catch (e) {
            console.error('Error parsing user from localStorage:', e);
          }
        }
        
        // If no stored user, fetch from API
        if (!user || !user.id) {
          user = await apiRequest<{ id: number; name: string; email: string }>('GET', '/api/user');
        }
        
        if (!isMounted) return;
        
        if (user && typeof user.id === 'number') {
          console.log('Chatbot: Setting user ID to:', user.id);
          setUserId(user.id);
          
          // Check if we were redirected from the health metrics page
          const lastHealthMetricsStr = localStorage.getItem('lastHealthMetrics');
          let redirectedFromHealthMetrics = false;
          let metrics = null;
          
          if (lastHealthMetricsStr) {
            try {
              const parsedMetrics = JSON.parse(lastHealthMetricsStr);
              // Check if these metrics were submitted recently (within the last minute)
              const metricDate = new Date(parsedMetrics.date);
              const now = new Date();
              const diffMs = now.getTime() - metricDate.getTime();
              const diffMinutes = diffMs / (1000 * 60);
              
              if (diffMinutes < 1) {
                console.log('Chatbot: Using health metrics from redirect:', parsedMetrics);
                console.log('Chatbot: Time since metrics were submitted:', Math.round(diffMinutes * 60), 'seconds ago');
                metrics = {
                  dietScore: parsedMetrics.dietScore,
                  exerciseScore: parsedMetrics.exerciseScore,
                  medicationScore: parsedMetrics.medicationScore
                };
                redirectedFromHealthMetrics = true;
                setUserHealthData(metrics);
                console.log('Chatbot: Redirected from health metrics page, will use specialised analysis message');
              }
            } catch (e) {
              console.error('Error parsing health metrics from localStorage:', e);
            }
          }
          
          // If we weren't redirected from health metrics page or metrics are invalid,
          // fetch the latest metrics from the server
          if (!redirectedFromHealthMetrics) {
            try {
              const healthMetrics = await apiRequest('GET', `/api/users/${user.id}/health-metrics/latest`);
              if (!isMounted) return;
              
              console.log('Chatbot: Fetched latest health metrics:', healthMetrics);
              
              if (healthMetrics && typeof healthMetrics.dietScore === 'number') {
                metrics = {
                  dietScore: healthMetrics.dietScore,
                  exerciseScore: healthMetrics.exerciseScore,
                  medicationScore: healthMetrics.medicationScore
                };
                
                setUserHealthData(metrics);
              }
            } catch (healthError) {
              console.error("Error fetching health metrics:", healthError);
            }
          }
          
          // If we have valid metrics, generate a personalised message
          if (metrics) {
            // Wait for the agent to be ready
            setTimeout(() => {
              if (!isMounted) return;
              
              const agent = window.__KGC_SUPERVISOR_AGENT__;
              
              // Only generate welcome message if agent exists, no message has been sent yet, and 
              // no custom message has been added by other components
              if (agent && !initialMessageSent && !agent.hasAddedCustomMessage()) {
                // If redirected from health metrics page, use a more specific message
                if (redirectedFromHealthMetrics) {
                  generateHealthMetricsAnalysisMessage(metrics, user.name);
                } else {
                  generatePersonalisedWelcomeMessage(metrics, user.name);
                }
              }
            }, 1500);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    
    fetchUserData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [initialMessageSent]);
  
  // Add a timeout to the health metrics message
  useEffect(() => {
    // Check if we were redirected from the health metrics page
    const lastHealthMetricsStr = localStorage.getItem('lastHealthMetrics');
    if (lastHealthMetricsStr) {
      try {
        const parsedMetrics = JSON.parse(lastHealthMetricsStr);
        const metricDate = new Date(parsedMetrics.date);
        const now = new Date();
        const diffMs = now.getTime() - metricDate.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        // Only process the health scores if submitted recently (within the last 5 minutes)
        if (diffMinutes < 5) {
          // Standard behavior - show message with timeout
          console.log('Chatbot: Setting up 15-second timeout for health metrics message');
          
          // Set a timeout to clear the message flag after 15 seconds
          const timeoutId = setTimeout(() => {
            console.log('Chatbot: Clearing health scores message due to timeout (15 seconds)');
            setShowHealthScoreMessage(false);
            
            // Clear localStorage health metrics to prevent showing the message again
            localStorage.removeItem('lastHealthMetrics');
            
            // If a message is already showing and the agent is available, add a follow-up message
            const agent = window.__KGC_SUPERVISOR_AGENT__;
            if (agent && initialMessageSent) {
              agent.setIsTyping(true);
              
              setTimeout(() => {
                agent.addMessage({
                  id: Date.now(), // Use timestamp as a numeric ID
                  text: "Is there anything specific about your health goals you'd like to discuss today?",
                  isUser: false,
                  timestamp: new Date()
                });
                agent.setIsTyping(false);
              }, 1000);
            }
          }, 15000); // 15 seconds timeout
          
          return () => clearTimeout(timeoutId); // Clean up timeout on component unmount
        }
      } catch (e) {
        console.error('Error parsing health metrics from localStorage:', e);
      }
    }
  }, [initialMessageSent]);
  
  // No need for custom analysis functions - now using the utility from healthScoreAnalysis.ts
  
  // Generate a specialised message for users who just submitted health metrics
  const generateHealthMetricsAnalysisMessage = (metrics: {
    dietScore: number, 
    exerciseScore: number, 
    medicationScore: number 
  }, userName: string) => {
    // Skip if we've already shown an initial message or the health score message is disabled
    if (initialMessageSent || !showHealthScoreMessage) {
      return;
    }
    
    setInitialMessageSent(true);
    
    // Access the SupervisorAgent functions through the global object
    const agent = window.__KGC_SUPERVISOR_AGENT__;
    if (!agent) {
      console.error('Chatbot: SupervisorAgent not accessible');
      return;
    }
    
    // Indicate the agent is typing
    agent.setIsTyping(true);
    
    // Analyze each score and construct a personalised message
    const dietStatus = metrics.dietScore >= 5 ? "good" : "needs-improvement";
    const exerciseStatus = metrics.exerciseScore >= 5 ? "good" : "needs-improvement";
    const medicationStatus = metrics.medicationScore >= 5 ? "good" : "needs-improvement";
    
    let message = `Thank you for submitting your health scores, ${userName}. Let's take a closer look at them:`;
    
    // Diet analysis
    message += "\n\n**Healthy Meal Plan**: ";
    if (dietStatus === "good") {
      if (metrics.dietScore >= 8) {
        message += `Excellent score of ${metrics.dietScore}/10! You're maintaining outstanding dietary habits. What specific strategies have been working well for you?`;
      } else {
        message += `Good score of ${metrics.dietScore}/10. You're on the right track with your nutrition. What has been helping you maintain this?`;
      }
    } else {
      message += `Your score is ${metrics.dietScore}/10, which suggests there may be room for improvement. What challenges are you experiencing with your meal plan?`;
    }
    
    // Exercise analysis
    message += "\n\n**Exercise and Wellness**: ";
    if (exerciseStatus === "good") {
      if (metrics.exerciseScore >= 8) {
        message += `Excellent score of ${metrics.exerciseScore}/10! Your commitment to physical activity is impressive. What types of exercise have you been enjoying most?`;
      } else {
        message += `Good score of ${metrics.exerciseScore}/10. You're maintaining consistent activity. How has your energy level been?`;
      }
    } else {
      message += `Your score is ${metrics.exerciseScore}/10, which suggests you might benefit from more physical activity. What barriers have you been facing with exercise?`;
    }
    
    // Medication analysis
    message += "\n\n**Prescription Medication**: ";
    if (medicationStatus === "good") {
      if (metrics.medicationScore >= 8) {
        message += `Excellent score of ${metrics.medicationScore}/10! You're doing very well with medication adherence. Are you using any specific reminders or systems?`;
      } else {
        message += `Good score of ${metrics.medicationScore}/10. You're generally consistent with your medication. Have you experienced any side effects?`;
      }
    } else {
      message += `Your score is ${metrics.medicationScore}/10, which suggests you might be having some challenges with medication. What makes it difficult to stay on track?`;
    }
    
    // Add overall analysis and invitation for discussion
    const lowestScore = Math.min(metrics.dietScore, metrics.exerciseScore, metrics.medicationScore);
    const highestScore = Math.max(metrics.dietScore, metrics.exerciseScore, metrics.medicationScore);
    
    message += "\n\n**Overall Analysis**: ";
    if (lowestScore >= 7) {
      message += "You're doing quite well across all health areas. Is there anything specific you'd like to focus on maintaining or improving further?";
    } else if (highestScore >= 7) {
      message += "You have strengths in some areas, and opportunities for improvement in others. Let's discuss strategies that could help create more balance.";
    } else {
      message += "It seems you're facing some challenges across multiple health areas. Let's prioritize one area to focus on first. Which area would you like to start with?";
    }
    
    // Create the agent message
    setTimeout(() => {
      agent.addMessage({
        id: Date.now(), // Ensure uniqueness
        text: message,
        isUser: false,
        timestamp: new Date()
      });
      
      // Agent is no longer typing
      agent.setIsTyping(false);
    }, 1500);
  };
  
  // Generate a personalised welcome message based on the user's health metrics
  const generatePersonalisedWelcomeMessage = (metrics: { 
    dietScore: number, 
    exerciseScore: number, 
    medicationScore: number 
  }, userName: string) => {
    // Find the lowest score
    const scores = [
      { category: 'exercise', score: metrics.exerciseScore },
      { category: 'diet', score: metrics.dietScore },
      { category: 'medication', score: metrics.medicationScore }
    ];
    
    // Sort by score ascending (lowest first)
    scores.sort((a, b) => a.score - b.score);
    
    const lowestCategory = scores[0].category;
    const lowestScore = scores[0].score;
    
    console.log('Chatbot: Lowest health category:', lowestCategory, 'with score:', lowestScore);
    
    // Skip if we've already shown an initial message or the health score message is disabled
    if (initialMessageSent || !showHealthScoreMessage) {
      return;
    }
    
    setInitialMessageSent(true);
    
    // Access the SupervisorAgent functions through the global object
    const agent = window.__KGC_SUPERVISOR_AGENT__;
    if (!agent) {
      console.error('Chatbot: SupervisorAgent not accessible');
      return;
    }
    
    // Indicate the agent is typing
    agent.setIsTyping(true);
    
    // Construct a message based on the lowest score category
    let message = '';
    let recommendedFeatures: string[] = [];
    
    // The base greeting
    const greeting = `Hello ${userName}. I'm your Keep Going Care Personal Health Assistant.`;
    
    if (lowestCategory === 'exercise' && lowestScore < 7) {
      message = `${greeting} Your exercise metrics indicate room for improvement.`;
      message += `\n\nRecommended features to improve exercise adherence:`;
      
      recommendedFeatures = [
        "**Inspiration Machine E&W**: Personalised exercise suggestions",
        "**Support E&W**: Exercise and wellness resources",
        "**Quick Wins**: Achievable exercise goals",
        "**Progress Milestones**: Track improvements",
        "**Journaling**: Mental wellbeing exercises"
      ];
      
    } else if (lowestCategory === 'diet' && lowestScore < 7) {
      message = `${greeting} Your nutrition metrics indicate room for improvement.`;
      message += `\n\nRecommended features to improve dietary habits:`;
      
      recommendedFeatures = [
        "**Inspiration Machine D**: Personalised meal ideas and nutrition tips",
        "**Diet Logistics**: Meal planning and shopping tools",
        "**Food Database**: Nutrition and wellbeing resources",
        "**Journaling**: Track food choices and identify patterns"
      ];
      
    } else if (lowestCategory === 'medication' && lowestScore < 7) {
      message = `${greeting} Your medication adherence metrics indicate room for improvement.`;
      message += `\n\nPlease provide more information about your situation:`;
      
      recommendedFeatures = [
        "• Are you experiencing medication side effects?",
        "• Do you have issues with your medication schedule?",
        "• Would you like to journal medication experiences for your GP?",
        "• Do you need assistance discussing medication concerns with your healthcare provider?"
      ];
      
      message += `\n\nConsult your healthcare provider regarding any medication changes.`;
      
    } else {
      // General message if all scores are good or equal
      message = "Hello! 😃\nI'm your personal Keep Going Care (KGC) health assistant. I am a non-diagnostic, Class 1. Software as a Medical Device (SaMD), prescribed by your doctor to help you with your doctor's healthier lifestyle modification care plan. I'm excited to work with you and your doctor to help you reach your health goals. I'm here for you 24/7 to help with any questions about:\n- Your healthy meal care plan 🥗\n- Your exercise and wellness routine care plan 🏋️\n- Your prescribed medications care plan 💊\nAll designed and updated by your doctor!\nRemember to submit your daily self-scores, 1-10\nfor each of these 3 areas to earn your $100\nhealthy experiences voucher and go into the draw to win the $250 healthy experience voucher drawn every month. \nA score of 5-10 means you're doing great! A score of 4-1 shows you might be facing some challenges, and we can work through them together with my many features.\nRemember, if I don't hear from you for over 24 hours, I'll assume a score of 0 and will reach out to your doctor to keep you safe ✨🩺⛑️\nRemember, you own your data and I keep it secure and delete it if you cancel your subscription. Your self-scores and feedback will be shared in a report for your doctor to review at your next appointment to update your care plan that I use to work with you";
    }
    
    // Add the recommended features to the message if any
    if (recommendedFeatures.length > 0) {
      message += `\n\n${recommendedFeatures.join('\n\n')}`;
      
      // Add a closing message
      if (lowestCategory !== 'medication') {
        message += `\n\nWhich feature interests you most?`;
      } else {
        message += `\n\nHow can I assist with your medication management?`;
      }
    }
    
    // Create the agent message
    setTimeout(() => {
      agent.addMessage({
        id: Date.now(), // Ensure uniqueness
        text: message,
        isUser: false,
        timestamp: new Date()
      });
      
      // Agent is no longer typing
      agent.setIsTyping(false);
    }, 2000);
  };

  // Handle when a message is sent by the user
  const handleMessageSent = (message: string) => {
    // You can perform additional actions when a message is sent
    console.log("Message sent:", message);
  };

  // Handle when a recommendation is received 
  const handleRecommendationReceived = (newRecommendation: Recommendation | null) => {
    console.log('Chatbot: Received recommendation in handleRecommendationReceived:', newRecommendation);
    
    if (newRecommendation) {
      console.log('Chatbot: Setting recommendation state:', newRecommendation);
      setRecommendation(newRecommendation);
      
      // Get current time
      const currentTime = new Date().getTime();
      
      // Only show toast if it's been at least 5 minutes since the last one
      // (300000 ms = 5 minutes)
      if (currentTime - lastToastTimeRef.current > 300000) {
        console.log('Chatbot: Showing toast with feature:', newRecommendation.recommendedFeature,
                    '(Time since last toast:', Math.floor((currentTime - lastToastTimeRef.current) / 1000), 'seconds)');
        
        // Format the feature name nicely
        const formattedFeature = newRecommendation.recommendedFeature
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Show the toast
        toast({
          title: "Health Recommendation",
          description: `Focus on: ${formattedFeature}`,
          duration: 5000,
        });
        
        // Update last toast time
        lastToastTimeRef.current = currentTime;
      } else {
        console.log('Chatbot: Skipping toast, shown too recently:',
                    Math.floor((currentTime - lastToastTimeRef.current) / 1000), 'seconds ago');
      }
    }
  };

  // Get connectivity state
  const { connectivityLevel } = useConnectivity();
  
  // Create a key based on health metrics to force remount when they change
  const chatKey = `chatbot-${Date.now()}-${userHealthData?.dietScore || 0}-${userHealthData?.exerciseScore || 0}-${userHealthData?.medicationScore || 0}`;
  
  // Check if we're in automatic self-score analysis mode
  const isSelfScoreAnalysisMode = localStorage.getItem('selfScoreAnalysisMode') === 'true';
  const useAustralianEnglish = localStorage.getItem('useAustralianEnglish') === 'true';
  
  // Determine the initial message to show
  const getInitialMessage = () => {
    // If we're in self-score analysis mode, don't show the initial message
    // The analysis will be generated and displayed automatically
    if (isSelfScoreAnalysisMode) {
      return ''; // No initial prompt - will be replaced by analysis
    }
    
    // Standard health metrics message if not in auto analysis mode
    if (localStorage.getItem('lastHealthMetrics') && showHealthScoreMessage) {
      return 'Hello! I can see you\'ve just submitted your health scores. Would you like to discuss them together? I can provide personalised feedback and recommend helpful KGC features based on your scores.';
    }
    
    return ''; // Use default message from EnhancedSupervisorAgent
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Welcome Dialogue Overlay */}
      <WelcomeDialogue
        userName={user?.firstName || 'there'}
        onComplete={handleWelcomeComplete}
        isVisible={showWelcome && isFirstVisit}
      />
      
      <div className="flex flex-col h-screen max-h-screen">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                <h1 className="text-xl font-semibold">KGC Health Assistant</h1>
              </div>
            </div>
            
            {/* Voice Controls and Status */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newVoiceState = !voiceEnabled;
                  setVoiceEnabled(newVoiceState);
                  
                  // Update stored settings
                  const currentSettings = JSON.parse(localStorage.getItem('chatbotWelcomeSettings') || '{}');
                  const updatedSettings = { ...currentSettings, voiceEnabled: newVoiceState };
                  localStorage.setItem('chatbotWelcomeSettings', JSON.stringify(updatedSettings));
                  
                  toast({
                    title: newVoiceState ? "Voice Enabled" : "Voice Disabled",
                    description: newVoiceState ? "I'll now speak my responses aloud" : "Voice features are turned off",
                  });
                }}
                className={`text-white hover:bg-white/20 ${voiceEnabled ? 'bg-white/20' : ''}`}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              {/* Current Recommendation Display */}
              {recommendation && (
                <div className="bg-white/20 rounded-full px-3 py-1 text-sm">
                  Recommending: {recommendation.recommendedFeature.replace('-', ' ')}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 relative">
          {console.log('Chatbot: Rendering EnhancedSupervisorAgent with userId:', userId, 'user:', user)}
          <EnhancedSupervisorAgent
            key={chatKey}
            userId={userId}
            healthMetrics={userHealthData}
            onRecommendationAccepted={(recommendedFeature) => {
              if (recommendation) {
                handleRecommendationReceived(recommendation);
              }
              
              // Navigate to the recommended feature
              toast({
                title: "Feature Recommended",
                description: `Opening ${recommendedFeature.replace('-', ' ')} feature...`,
              });
            }}
            hideHeader={true}
            initialMessage={getInitialMessage()}
            connectivityLevel={connectivityLevel}
            voiceEnabled={voiceEnabled}
            userCPDs={userCPDs}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default Chatbot;