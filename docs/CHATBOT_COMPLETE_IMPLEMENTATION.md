# KGC Chatbot Feature Complete Implementation Guide

## Executive Summary for Jules Gemini & AWS Q Agents

This document provides comprehensive UI/UX specifications and Supervisor Agent interaction patterns for the KGC Chatbot feature. The implementation includes welcome dialogue protocols, text-to-speech capabilities, local recommendations aligned with Care Plan Directives (CPDs), and sophisticated patient compliance guidance through learned preference patterns.

## System Architecture Overview

### Component Hierarchy
```
/chatbot (Route)
├── Chatbot.tsx (Main Page Container)
    ├── EnhancedSupervisorAgent.tsx (Primary Chat Interface)
        ├── SupervisorAgent.tsx (Core AI Agent)
            ├── ModelContextProtocol.tsx (MCP Integration)
            ├── Voice Recognition System
            ├── Text-to-Speech Engine
            └── Local Recommendations Engine
```

### Supervisor Agent Intelligence Flow
```
Patient Input → Context Analysis → CPD Alignment Check → Preference Learning → Response Generation → Feature Recommendation → Compliance Guidance → Achievement Recognition
```

## Complete UI/UX Design Specifications

### Visual Design System

**Color Palette:**
- Primary Background: `bg-gradient-to-b from-blue-50 to-blue-100`
- Chat Container: `bg-white rounded-lg shadow-lg`
- User Messages: `bg-blue-100 text-blue-900` (right-aligned bubbles)
- Assistant Messages: `bg-gray-100 text-gray-900` (left-aligned bubbles)
- Action Buttons: `bg-[#2E8BC0] hover:bg-[#267cad]` (metallic blue)
- Voice Button Active: `bg-green-500 animate-pulse`
- Speaking Indicator: `bg-orange-500 animate-bounce`

**Typography:**
- Chat Messages: `text-sm md:text-base` with `leading-relaxed`
- Welcome Dialogue: `text-lg font-semibold`
- Feature Recommendations: `text-sm font-medium`
- Timestamps: `text-xs text-gray-500`

**Layout Structure:**
- Header: Fixed height `64px` with gradient background
- Chat Area: `flex-1 overflow-y-auto max-h-[calc(100vh-8rem)]`
- Input Area: Fixed bottom with voice controls
- Recommendation Pills: Floating overlay when triggered

### Complete Page Implementation

```typescript
// File: client/src/pages/chatbot.tsx - Enhanced Version
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, ArrowLeft, Brain, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { Link } from "wouter";
import EnhancedSupervisorAgent from "@/components/chatbot/EnhancedSupervisorAgent";
import { Recommendation, ModelContextProtocol } from "@/components/chatbot/ModelContextProtocol";
import { apiRequest } from "@/lib/queryClient";
import { ConnectivityLevel } from "@shared/types";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useQuery } from "@tanstack/react-query";

interface WelcomeDialogueProps {
  userName: string;
  onStart: () => void;
  isVisible: boolean;
}

const WelcomeDialogue: React.FC<WelcomeDialogueProps> = ({ userName, onStart, isVisible }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  
  const welcomeSteps = [
    {
      message: `Hello ${userName}! Welcome to your Keep Going Care Personal Health Assistant.`,
      description: "I'm here to support your health journey with personalized guidance and recommendations.",
      action: "Continue"
    },
    {
      message: "I can help you with meal planning, exercise suggestions, medication reminders, and much more.",
      description: "All my recommendations are tailored to your Care Plan Directives from your doctor.",
      action: "Great!"
    },
    {
      message: "Would you like to enable voice interaction? I can speak my responses and listen to your questions.",
      description: "You can always toggle this feature on or off during our conversation.",
      action: "Enable Voice",
      secondaryAction: "Text Only"
    },
    {
      message: "Perfect! I'm ready to assist you. What would you like to discuss today?",
      description: "You can ask about your health scores, request local recommendations, or explore KGC features.",
      action: "Start Chatting"
    }
  ];

  const handleNext = (enableAudio = false) => {
    if (currentStep === 2 && enableAudio) {
      setIsAudioEnabled(true);
    }
    
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onStart();
    }
  };

  if (!isVisible) return null;

  const currentWelcome = welcomeSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {currentWelcome.message}
          </h2>
          <p className="text-gray-600 text-sm">
            {currentWelcome.description}
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => handleNext(currentStep === 2)}
            className="bg-[#2E8BC0] hover:bg-[#267cad] w-full"
          >
            {currentStep === 2 && <Volume2 className="h-4 w-4 mr-2" />}
            {currentWelcome.action}
          </Button>
          
          {currentWelcome.secondaryAction && (
            <Button 
              onClick={() => handleNext(false)}
              variant="outline"
              className="w-full"
            >
              <VolumeX className="h-4 w-4 mr-2" />
              {currentWelcome.secondaryAction}
            </Button>
          )}
        </div>
        
        <div className="flex justify-center mt-4">
          {welcomeSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full mx-1 ${
                index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

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
    const userName = user?.firstName || 'there';
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
        userName={user?.firstName || 'there'}
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
```

## Supervisor Agent Intelligence Framework

### 1. Welcome Dialogue Protocol

**Initial Engagement Strategy:**
- Always start with personalized greeting using patient's name
- Reference recent health activity (daily scores, feature usage)
- Establish voice preference early in conversation
- Set expectations for CPD-aligned recommendations

**Welcome Message Templates:**
```typescript
const generateWelcomeMessage = (user: User, healthMetrics: HealthMetrics[], cpds: CPD[]) => {
  const templates = {
    newUser: `Hello ${user.firstName}! Welcome to Keep Going Care. I'm your personal health assistant, here to support your wellness journey with guidance tailored specifically to your needs.`,
    
    returningUser: `Welcome back, ${user.firstName}! It's great to see you again. I've been keeping track of your progress and I'm excited to continue supporting your health goals.`,
    
    postHealthScores: `Hello ${user.firstName}! I can see you've just submitted your daily health scores. Excellent work on staying consistent with your self-monitoring!`,
    
    achievementUnlocked: `Congratulations, ${user.firstName}! You've just earned a new achievement badge. Your commitment to your health journey is truly inspiring.`
  };
  
  // Add contextual elements based on user data
  let contextualAddition = "";
  
  if (healthMetrics?.length > 0) {
    const latestScores = healthMetrics[0];
    const avgScore = (latestScores.dietScore + latestScores.exerciseScore + latestScores.medicationScore) / 3;
    
    if (avgScore >= 8) {
      contextualAddition = " Your recent health scores show you're maintaining excellent habits - keep up the outstanding work!";
    } else if (avgScore >= 6) {
      contextualAddition = " I can see you're making steady progress with your health goals. Let's explore ways to build on this momentum.";
    }
  }
  
  if (cpds?.length > 0) {
    contextualAddition += ` I have your latest Care Plan Directives from your doctor, so all my recommendations will be perfectly aligned with your medical guidance.`;
  }
  
  return baseMessage + contextualAddition + " What would you like to discuss today?";
};
```

### 2. Text-to-Speech Implementation

**Voice Settings:**
- Voice: "Google UK English Female" or "Microsoft Zira Desktop" for Australian accent
- Rate: 0.9 (slightly slower for healthcare content)
- Pitch: 1.0 (natural tone)
- Volume: 0.8 (comfortable listening level)

**Speech Control Features:**
```typescript
interface VoiceControls {
  enableTextToSpeech: boolean;
  voiceRate: number;
  voiceVolume: number;
  autoSpeak: boolean; // Automatically speak agent responses
  speechRecognition: boolean; // Voice input capability
}

// Voice implementation with healthcare-specific settings
const initializeVoiceSystem = () => {
  const synth = window.speechSynthesis;
  
  const getHealthcareVoice = () => {
    const voices = synth.getVoices();
    // Preference order for healthcare communication
    const preferredVoices = [
      'Google UK English Female',
      'Microsoft Zira Desktop',
      'Google English Female',
      'English (Australia)'
    ];
    
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred));
      if (voice) return voice;
    }
    
    return voices.find(v => v.lang.includes('en'));
  };
  
  const speakHealthMessage = (text: string, isUrgent = false) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = getHealthcareVoice();
    utterance.rate = isUrgent ? 1.1 : 0.9;
    utterance.volume = 0.8;
    utterance.pitch = 1.0;
    
    // Add pauses for better comprehension of health information
    const enhancedText = text
      .replace(/\./g, '. ') // Longer pauses at sentences
      .replace(/,/g, ', ') // Brief pauses at commas
      .replace(/:/g, ': '); // Pause after colons
    
    utterance.text = enhancedText;
    synth.speak(utterance);
  };
};
```

### 3. Local Recommendations Engine

**Location-Based Suggestion System:**
```typescript
interface LocalRecommendation {
  category: 'exercise' | 'nutrition' | 'wellness' | 'pharmacy';
  location: string;
  recommendations: {
    name: string;
    address: string;
    description: string;
    cpdAlignment: string;
    distance?: string;
    rating?: number;
    phoneNumber?: string;
    website?: string;
  }[];
}

const generateLocalRecommendations = async (
  userLocation: string,
  cpdRequirements: CPD[],
  userPreferences: UserPreferences
): Promise<LocalRecommendation[]> => {
  const exerciseCPD = cpdRequirements.find(cpd => cpd.category === 'exercise');
  const nutritionCPD = cpdRequirements.find(cpd => cpd.category === 'nutrition');
  
  const recommendations: LocalRecommendation[] = [];
  
  // Exercise recommendations based on CPDs
  if (exerciseCPD?.content.toLowerCase().includes('walking')) {
    recommendations.push({
      category: 'exercise',
      location: userLocation,
      recommendations: [
        {
          name: "Royal Botanic Gardens",
          address: "Mrs Macquaries Rd, Sydney NSW 2000",
          description: "Beautiful waterfront walking paths with harbor views. Multiple route options from 30 minutes to 2 hours.",
          cpdAlignment: "Aligns with your walking exercise requirement. Gentle terrain suitable for building daily walking habits.",
          distance: "2.3 km",
          rating: 4.8
        },
        {
          name: "Centennial Park",
          address: "Oxford St, Centennial Park NSW 2021",
          description: "Large park with dedicated walking tracks, distance markers, and varied terrain options.",
          cpdAlignment: "Perfect for progressive walking programs. Multiple loop options to increase distance gradually.",
          distance: "5.7 km",
          rating: 4.6
        }
      ]
    });
  }
  
  if (exerciseCPD?.content.toLowerCase().includes('swimming')) {
    recommendations.push({
      category: 'exercise',
      location: userLocation,
      recommendations: [
        {
          name: "Aquatic Centre",
          address: "Local Swimming Complex",
          description: "25m heated pool with dedicated lap swimming lanes and aqua aerobics classes.",
          cpdAlignment: "Supports your swimming exercise plan with structured lap swimming and low-impact water activities.",
          distance: "1.2 km",
          rating: 4.4,
          phoneNumber: "02 9XXX XXXX"
        }
      ]
    });
  }
  
  // Nutrition recommendations
  if (nutritionCPD?.content.toLowerCase().includes('fresh')) {
    recommendations.push({
      category: 'nutrition',
      location: userLocation,
      recommendations: [
        {
          name: "Weekend Farmers Market",
          address: "Town Square, Main Street",
          description: "Local organic produce, fresh seasonal fruits and vegetables. Open Saturdays 7am-1pm.",
          cpdAlignment: "Excellent source for the fresh produce emphasized in your nutrition plan. Local, seasonal options.",
          distance: "0.8 km",
          rating: 4.7
        }
      ]
    });
  }
  
  return recommendations;
};
```

### 4. Compliance Guidance System

**CPD Alignment Strategy:**
```typescript
interface ComplianceGuidanceSystem {
  cpdAnalysis: (userInput: string, cpds: CPD[]) => ComplianceInsight;
  responseGeneration: (insight: ComplianceInsight) => string;
  subtleGuidance: (currentBehavior: UserBehavior, targetBehavior: CPD) => GuidanceStrategy;
}

const analyzeComplianceOpportunity = (
  userMessage: string,
  userCPDs: CPD[],
  recentScores: HealthMetrics[]
): ComplianceGuidance => {
  
  // Detect compliance opportunities in user messages
  const exerciseKeywords = ['workout', 'exercise', 'walk', 'gym', 'tired', 'energy'];
  const nutritionKeywords = ['eat', 'meal', 'food', 'hungry', 'cook', 'dinner'];
  const medicationKeywords = ['medication', 'pills', 'forgot', 'remember', 'side effects'];
  
  const guidance = {
    primaryArea: null,
    opportunity: null,
    subtleApproach: null,
    featureRecommendation: null
  };
  
  // Exercise compliance guidance
  if (exerciseKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
    const exerciseCPD = userCPDs.find(cpd => cpd.category === 'exercise');
    const recentExerciseScore = recentScores[0]?.exerciseScore || 5;
    
    if (exerciseCPD && recentExerciseScore < 8) {
      guidance.primaryArea = 'exercise';
      guidance.opportunity = 'User mentioned exercise - opportunity to reinforce CPD compliance';
      
      if (userMessage.includes('tired')) {
        guidance.subtleApproach = 'acknowledge_feeling_suggest_gentle_activity';
        guidance.response = `I understand you're feeling tired. Sometimes gentle movement can actually help boost energy levels. Your doctor's exercise plan focuses on ${exerciseCPD.content}. Would you like some suggestions for low-energy activities that align with this?`;
      } else if (userMessage.includes('gym')) {
        guidance.subtleApproach = 'build_on_motivation';
        guidance.response = `Great that you're thinking about the gym! Your Care Plan Directive emphasizes ${exerciseCPD.content}. I can suggest some gym activities that perfectly match your doctor's recommendations.`;
      }
      
      guidance.featureRecommendation = 'ew-support';
    }
  }
  
  return guidance;
};
```

### 5. Preference Learning System

**Behavioral Pattern Recognition:**
```typescript
interface UserPreferenceLearning {
  featureUsageTracking: Map<string, number>;
  conversationTopics: string[];
  responsePreferences: {
    brevity: 'concise' | 'detailed';
    tone: 'formal' | 'casual';
    focusAreas: string[];
  };
  achievementMotivation: {
    badgeInterest: boolean;
    rewardResponsiveness: number;
    competitiveElements: boolean;
  };
}

const learnFromUserInteraction = (
  interaction: UserInteraction,
  previousPreferences: UserPreferenceLearning
): UserPreferenceLearning => {
  
  const updatedPreferences = { ...previousPreferences };
  
  // Track feature engagement
  if (interaction.featureAccessed) {
    const currentUsage = updatedPreferences.featureUsageTracking.get(interaction.featureAccessed) || 0;
    updatedPreferences.featureUsageTracking.set(interaction.featureAccessed, currentUsage + 1);
  }
  
  // Analyze conversation length preferences
  if (interaction.responseLength === 'truncated' || interaction.userFeedback === 'too_long') {
    updatedPreferences.responsePreferences.brevity = 'concise';
  } else if (interaction.requestedMoreDetail) {
    updatedPreferences.responsePreferences.brevity = 'detailed';
  }
  
  // Track achievement responsiveness
  if (interaction.type === 'achievement_notification') {
    if (interaction.userEngagement > 0.8) {
      updatedPreferences.achievementMotivation.badgeInterest = true;
      updatedPreferences.achievementMotivation.rewardResponsiveness += 0.1;
    }
  }
  
  return updatedPreferences;
};

// Apply learned preferences to response generation
const generatePersonalizedResponse = (
  systemResponse: string,
  userPreferences: UserPreferenceLearning,
  context: ConversationContext
): string => {
  
  let personalizedResponse = systemResponse;
  
  // Adjust for brevity preference
  if (userPreferences.responsePreferences.brevity === 'concise') {
    personalizedResponse = summarizeResponse(systemResponse);
  }
  
  // Add achievement motivation if user is responsive
  if (userPreferences.achievementMotivation.badgeInterest && context.recentScore >= 7) {
    personalizedResponse += `\n\n🏆 Keep up this excellent work and you'll be on track for your next achievement badge!`;
  }
  
  // Suggest preferred features
  const mostUsedFeature = getMostUsedFeature(userPreferences.featureUsageTracking);
  if (mostUsedFeature && shouldSuggestFeature(context)) {
    personalizedResponse += `\n\nSince you've found the ${mostUsedFeature} feature helpful before, you might also be interested in exploring it again for this goal.`;
  }
  
  return personalizedResponse;
};
```

### 6. Achievement Badge Integration

**Badge Recognition System:**
```typescript
interface AchievementBadgeSystem {
  recognizeProgress: (healthData: HealthMetrics[]) => Badge[];
  celebrateAchievements: (newBadges: Badge[]) => string;
  motivateTowardsBadges: (currentProgress: number, nextBadge: Badge) => string;
}

const generateAchievementMotivation = (
  currentScores: HealthMetrics,
  badgeProgress: BadgeProgress[],
  userPreferences: UserPreferenceLearning
): string => {
  
  const motivationalMessages = [];
  
  // Check for near-badge achievements
  const nearBadges = badgeProgress.filter(progress => progress.completionPercentage >= 80);
  
  if (nearBadges.length > 0) {
    const nextBadge = nearBadges[0];
    motivationalMessages.push(
      `🎯 You're ${100 - nextBadge.completionPercentage}% away from earning the "${nextBadge.badgeName}" achievement! ${nextBadge.encouragementMessage}`
    );
  }
  
  // Recognize consistent high performance
  const avgScore = (currentScores.dietScore + currentScores.exerciseScore + currentScores.medicationScore) / 3;
  if (avgScore >= 8.5) {
    motivationalMessages.push(
      "⭐ Your consistency in maintaining scores above 8 is exceptional! This level of self-care discipline is what leads to lasting health improvements."
    );
  }
  
  return motivationalMessages.join('\n\n');
};
```

## Complete Chat Interface Implementation

### Enhanced Supervisor Agent Component

```typescript
// File: client/src/components/chatbot/EnhancedSupervisorAgent.tsx - Complete Version
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Send, Brain, MapPin, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { speakText, stopSpeaking, createSpeechRecognition } from '@/lib/speechUtils';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  localRecommendations?: LocalRecommendation[];
  achievementUpdate?: Achievement;
  cpdAlignment?: string;
}

interface EnhancedSupervisorAgentProps {
  userId: number;
  healthMetrics?: any;
  userCPDs?: any[];
  voiceEnabled?: boolean;
  onRecommendationAccepted?: (feature: string) => void;
  hideHeader?: boolean;
  className?: string;
}

const EnhancedSupervisorAgent: React.FC<EnhancedSupervisorAgentProps> = ({
  userId,
  healthMetrics,
  userCPDs = [],
  voiceEnabled = false,
  onRecommendationAccepted,
  hideHeader = false,
  className = ""
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingMessage, setActiveSpeakingMessage] = useState<number | null>(null);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<any>({});
  const [recommendationPills, setRecommendationPills] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if (voiceEnabled) {
      const recognition = createSpeechRecognition();
      if (recognition) {
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
        };
        
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        
        setSpeechRecognition(recognition);
      }
    }
  }, [voiceEnabled]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const preferences = await apiRequest('GET', `/api/users/${userId}/preferences`);
        setUserPreferences(preferences || {});
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    };
    
    if (userId) {
      loadUserPreferences();
    }
  }, [userId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Analyze message for CPD alignment and local recommendations
      const analysisResult = await analyzeMessageForCPDAlignment(
        inputValue.trim(),
        userCPDs,
        healthMetrics
      );

      // Generate AI response with context
      const aiResponse = await generateAIResponse(
        inputValue.trim(),
        {
          healthMetrics,
          cpds: userCPDs,
          userPreferences,
          analysisResult
        }
      );

      const assistantMessage: Message = {
        id: Date.now() + 1,
        text: aiResponse.text,
        isUser: false,
        timestamp: new Date(),
        localRecommendations: aiResponse.localRecommendations,
        achievementUpdate: aiResponse.achievementUpdate,
        cpdAlignment: analysisResult.cpdAlignment
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak if voice is enabled
      if (voiceEnabled && aiResponse.text) {
        speakText(aiResponse.text);
        setIsSpeaking(true);
        setActiveSpeakingMessage(assistantMessage.id);
      }

      // Update recommendation pills
      if (aiResponse.recommendedFeatures?.length > 0) {
        setRecommendationPills(aiResponse.recommendedFeatures);
      }

      // Track user interaction for preference learning
      updateUserPreferences(userMessage.text, assistantMessage.text);

    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Communication Error",
        description: "I'm having trouble responding right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const analyzeMessageForCPDAlignment = async (
    message: string,
    cpds: any[],
    healthMetrics: any
  ) => {
    // Analyze user message against their Care Plan Directives
    const keywords = {
      exercise: ['walk', 'exercise', 'gym', 'workout', 'tired', 'energy', 'activity'],
      nutrition: ['eat', 'food', 'meal', 'hungry', 'cook', 'diet', 'healthy'],
      medication: ['medicine', 'pills', 'medication', 'forgot', 'remember', 'side effects']
    };

    const analysis = {
      primaryCategory: null,
      cpdAlignment: null,
      complianceOpportunity: false,
      localRecommendationNeeded: false,
      locationMentioned: null
    };

    // Check for category mentions
    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      if (categoryKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
        analysis.primaryCategory = category;
        
        // Find relevant CPD
        const relevantCPD = cpds.find(cpd => cpd.category === category);
        if (relevantCPD) {
          analysis.cpdAlignment = relevantCPD.content;
          analysis.complianceOpportunity = true;
        }
        break;
      }
    }

    // Check for location mentions for local recommendations
    const locationKeywords = ['near me', 'nearby', 'local', 'around here', 'in my area'];
    if (locationKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      analysis.localRecommendationNeeded = true;
    }

    return analysis;
  };

  const generateAIResponse = async (
    userMessage: string,
    context: any
  ) => {
    // Create comprehensive system prompt with CPD context
    const systemPrompt = `You are KGC (Keep Going Care), a personal health assistant specializing in Australian healthcare.

USER CONTEXT:
- Care Plan Directives: ${context.cpds.map(cpd => `${cpd.category}: ${cpd.content}`).join(', ')}
- Recent Health Scores: Diet ${context.healthMetrics?.dietScore}/10, Exercise ${context.healthMetrics?.exerciseScore}/10, Medication ${context.healthMetrics?.medicationScore}/10
- User Preferences: ${JSON.stringify(context.userPreferences)}

RESPONSE GUIDELINES:
1. Always align recommendations with the user's Care Plan Directives
2. Provide local Australian recommendations when requested
3. Subtly guide toward 8-10 health scores through positive reinforcement
4. Recognize achievements and progress
5. Use Australian English (no colloquialisms)
6. Never provide medical diagnosis
7. Suggest relevant KGC features naturally

AVAILABLE KGC FEATURES:
- Daily Self-Scores: Health adherence tracking with rewards
- Inspiration Machine D: Meal planning aligned with CPDs
- Exercise & Wellness Support: Local fitness recommendations
- MBP Wizard: Medication price comparison
- Progress Milestones: Achievement tracking
- Journaling: Health journey documentation
- Food Database: Australian nutritional information

Respond naturally and supportively to: "${userMessage}"`;

    try {
      const response = await apiRequest('POST', '/api/ai/chat', {
        message: userMessage,
        systemPrompt,
        context
      });

      return {
        text: response.text,
        localRecommendations: response.localRecommendations || [],
        achievementUpdate: response.achievementUpdate,
        recommendedFeatures: response.recommendedFeatures || []
      };
    } catch (error) {
      // Fallback response
      return {
        text: "I'm here to help with your health journey. Could you tell me more about what you'd like to discuss?",
        localRecommendations: [],
        achievementUpdate: null,
        recommendedFeatures: []
      };
    }
  };

  const updateUserPreferences = (userMessage: string, aiResponse: string) => {
    // Track interaction patterns for learning
    const interaction = {
      timestamp: new Date(),
      userMessage,
      aiResponse,
      responseLength: aiResponse.length,
      voiceUsed: voiceEnabled && isSpeaking
    };

    // Store in localStorage for persistence
    const interactions = JSON.parse(localStorage.getItem('userInteractions') || '[]');
    interactions.push(interaction);
    
    // Keep only last 50 interactions
    if (interactions.length > 50) {
      interactions.splice(0, interactions.length - 50);
    }
    
    localStorage.setItem('userInteractions', JSON.stringify(interactions));
  };

  const toggleListening = () => {
    if (!speechRecognition) return;

    if (isListening) {
      speechRecognition.stop();
    } else {
      setIsListening(true);
      speechRecognition.start();
    }
  };

  const toggleSpeaking = (messageId: number, text: string) => {
    if (isSpeaking && activeSpeakingMessage === messageId) {
      stopSpeaking();
      setIsSpeaking(false);
      setActiveSpeakingMessage(null);
    } else {
      if (isSpeaking) stopSpeaking();
      speakText(text);
      setIsSpeaking(true);
      setActiveSpeakingMessage(messageId);
    }
  };

  const renderMessage = (message: Message) => {
    const isCurrentlySpeaking = isSpeaking && activeSpeakingMessage === message.id;

    return (
      <div
        key={message.id}
        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`flex max-w-[80%] ${
            message.isUser ? 'flex-row-reverse' : 'flex-row'
          } items-start gap-2`}
        >
          {!message.isUser && (
            <Avatar className="w-8 h-8 mt-1">
              <AvatarFallback className="bg-blue-100 text-blue-700">
                <Brain className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          )}
          
          <div
            className={`rounded-lg p-3 shadow-sm ${
              message.isUser
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
              {message.text}
            </p>
            
            {/* CPD Alignment Indicator */}
            {message.cpdAlignment && (
              <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                <strong>Aligned with your Care Plan:</strong> {message.cpdAlignment}
              </div>
            )}
            
            {/* Local Recommendations */}
            {message.localRecommendations && message.localRecommendations.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                  <MapPin className="h-3 w-3" />
                  Local Recommendations
                </div>
                {message.localRecommendations.map((rec, index) => (
                  <div key={index} className="bg-blue-50 rounded p-2 text-xs">
                    <div className="font-medium">{rec.name}</div>
                    <div className="text-gray-600">{rec.description}</div>
                    <div className="text-blue-600 mt-1">{rec.cpdAlignment}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Achievement Update */}
            {message.achievementUpdate && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                <div className="flex items-center gap-1 text-yellow-700">
                  <Award className="h-3 w-3" />
                  <strong>Achievement Unlocked!</strong>
                </div>
                <div className="text-yellow-600">{message.achievementUpdate.name}</div>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs opacity-60">
                {message.timestamp.toLocaleTimeString()}
              </span>
              
              {/* Voice Controls */}
              {!message.isUser && voiceEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSpeaking(message.id, message.text)}
                  className={`h-6 w-6 p-0 ${
                    isCurrentlySpeaking ? 'text-orange-500' : 'text-gray-500'
                  }`}
                >
                  {isCurrentlySpeaking ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {message.isUser && (
            <Avatar className="w-8 h-8 mt-1">
              <AvatarFallback className="bg-gray-100">
                You
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Welcome to your KGC Health Assistant
            </h3>
            <p className="text-gray-500">
              I'm here to support your health journey with personalized guidance
              aligned with your Care Plan Directives.
            </p>
          </div>
        )}
        
        {messages.map(renderMessage)}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  <Brain className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Recommendation Pills */}
      {recommendationPills.length > 0 && (
        <div className="px-4 py-2 border-t bg-blue-50">
          <div className="text-xs text-blue-600 mb-2">Recommended KGC Features:</div>
          <div className="flex flex-wrap gap-2">
            {recommendationPills.map((feature, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => onRecommendationAccepted?.(feature)}
              >
                {feature.replace('-', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          {voiceEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleListening}
              className={`${isListening ? 'bg-green-100 text-green-700' : ''}`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about your health goals, request local recommendations, or explore KGC features..."
            className="flex-1"
            disabled={isListening}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="bg-[#2E8BC0] hover:bg-[#267cad]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {isListening && (
          <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Listening... Speak now
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSupervisorAgent;
```

## Implementation Checklist for AI Agents

### Core Chatbot Features
- [ ] Welcome dialogue with 4-step onboarding flow
- [ ] Text-to-speech with Australian English voice settings
- [ ] Voice recognition for hands-free interaction
- [ ] CPD-aligned response generation
- [ ] Local recommendations engine
- [ ] Achievement badge recognition and motivation

### Supervisor Agent Intelligence
- [ ] Preference learning from interaction patterns
- [ ] Subtle compliance guidance toward 8-10 scores
- [ ] Feature recommendation based on usage history
- [ ] Context-aware response personalization
- [ ] Emergency detection and safety protocols

### UI/UX Components
- [ ] Gradient background with metallic blue branding
- [ ] Message bubbles with voice controls
- [ ] Recommendation pills overlay
- [ ] Achievement notifications
- [ ] CPD alignment indicators
- [ ] Local recommendation cards

### Data Integration
- [ ] User preferences persistence
- [ ] Care Plan Directives context loading
- [ ] Health metrics integration
- [ ] Feature usage tracking
- [ ] Location-based recommendations API

This comprehensive implementation guide provides your AI agents with everything needed to create a sophisticated, healthcare-compliant chatbot that subtly guides patients toward better health outcomes while maintaining engagement through personalized, CPD-aligned recommendations.