import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, ArrowLeft, Brain, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { Link, useLocation } from "wouter";
import EnhancedSupervisorAgent from "@/components/chatbot/EnhancedSupervisorAgent";
import WelcomeDialogue from "@/components/chatbot/WelcomeDialogue";
import { Recommendation, ModelContextProtocol } from "@/components/chatbot/ModelContextProtocol";
import { apiRequest } from "@/lib/apiRequest";
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
  const [userId, setUserId] = useState<number>(1);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const { toast } = useToast();

  // Get user data
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/user"],
  });

  // Get user's latest health metrics for context
  const { data: healthMetrics } = useQuery({
    queryKey: [`/api/users/${userId}/health-metrics/latest`],
    enabled: !!userId,
  });

  // Get user's Care Plan Directives for recommendations
  const { data: userCPDs } = useQuery({
    queryKey: [`/api/users/${userId}/care-plan-directives`],
    enabled: !!userId,
  });

  // Check if this is user's first visit to chatbot
  useEffect(() => {
    const hasVisitedChatbot = localStorage.getItem('hasVisitedChatbot');
    if (hasVisitedChatbot) {
      setIsFirstVisit(false);
      setShowWelcome(false);
    }
  }, []);

  // Set user ID when user data loads
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    localStorage.setItem('hasVisitedChatbot', 'true');

    // Initialize Supervisor Agent with welcome context
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
  };

  const generatePersonalizedWelcome = () => {
    const userName = user?.name || 'there';
    let message = `Hello ${userName}! I'm your KGC Health Assistant, ready to support your wellness journey.`;

    // Add context based on recent health metrics
    if (healthMetrics) {
      const avgScore = Math.round((healthMetrics.dietScore + healthMetrics.exerciseScore + healthMetrics.medicationScore) / 3);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Welcome Dialogue Overlay */}
      <WelcomeDialogue
        userName={user?.name || 'there'}
        onStart={handleWelcomeComplete}
        isVisible={showWelcome && isFirstVisit}
      />

      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
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

            {/* Voice Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
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
          <EnhancedSupervisorAgent
            userId={userId}
            healthMetrics={healthMetrics}
            onRecommendationAccepted={(feature) => {
              toast({
                title: "Feature Recommended",
                description: `Opening ${feature.replace('-', ' ')} feature...`,
              });
            }}
            hideHeader={true}
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
