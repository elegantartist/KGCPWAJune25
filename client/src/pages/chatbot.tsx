import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, ArrowLeft, Brain } from "lucide-react";
import { Link } from "wouter";
import EnhancedSupervisorAgent from "@/components/chatbot/EnhancedSupervisorAgent";
import { Recommendation, ModelContextProtocol } from "@/components/chatbot/ModelContextProtocol";
import { apiRequest } from "@/lib/queryClient";
import { ConnectivityLevel } from "@shared/types";
import { useConnectivity } from "@/hooks/useConnectivity";

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

// Enhanced chatbot page using the MCP system
const Chatbot: React.FC = () => {
  const [userId, setUserId] = useState<number>(1); // Default user ID
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  

  const [initialMessageSent, setInitialMessageSent] = useState<boolean>(false);
  const [userHealthData, setUserHealthData] = useState<{ 
    dietScore: number, 
    exerciseScore: number, 
    medicationScore: number 
  } | null>(null);
  const [showHealthScoreMessage, setShowHealthScoreMessage] = useState<boolean>(true);
  const lastToastTimeRef = useRef<number>(0); // Use a ref to prevent losing the value between renders
  const { toast } = useToast();

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
          
          // Removed automatic health metrics fetching - chatbot now waits for user interaction
          
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
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">KGC Health Assistant</h2>
        </div>
        {recommendation && (
          <div className="flex items-center">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-xs">
                {recommendation.recommendedFeature.split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </span>
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex-1 relative">
        <EnhancedSupervisorAgent
          key={chatKey}
          userId={userId}
          healthMetrics={userHealthData}
          onRecommendationAccepted={(recommendedFeature) => {
            if (recommendation) {
              handleRecommendationReceived(recommendation);
            }
          }}
          hideHeader={true}
          initialMessage={getInitialMessage()}
          connectivityLevel={connectivityLevel}
        />
      </div>
    </div>
  );
};

export default Chatbot;