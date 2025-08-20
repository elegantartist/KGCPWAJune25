import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Volume2, VolumeX, Mic, CheckCircle, ArrowRight } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/speechUtils';

interface WelcomeDialogueProps {
  userName: string;
  onComplete: (settings: WelcomeSettings) => void;
  isVisible: boolean;
}

interface WelcomeSettings {
  voiceEnabled: boolean;
  autoSpeak: boolean;
  speechRecognition: boolean;
}

const WelcomeDialogue: React.FC<WelcomeDialogueProps> = ({ 
  userName, 
  onComplete, 
  isVisible 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState<WelcomeSettings>({
    voiceEnabled: false,
    autoSpeak: false,
    speechRecognition: false
  });

  const welcomeSteps = [
    {
      id: 'greeting',
      title: `Hello ${userName}!`,
      message: "Welcome to your Keep Going Care Personal Health Assistant.",
      description: "I'm here to support your health journey with personalized guidance based on your Care Plan Directives from your doctor.",
      icon: Brain,
      primaryAction: "Continue",
      showProgress: true
    },
    {
      id: 'features',
      title: "How I Can Help",
      message: "I can assist you with meal planning, exercise suggestions, medication reminders, and local health recommendations.",
      description: "All my suggestions are tailored to your specific health goals and medical guidance. I can also track your progress and celebrate your achievements.",
      icon: CheckCircle,
      primaryAction: "That's Great!",
      showProgress: true
    },
    {
      id: 'voice-setup',
      title: "Voice Interaction",
      message: "Would you like to enable voice features?",
      description: "I can speak my responses aloud and listen to your voice commands. This makes our conversations more natural and hands-free.",
      icon: Volume2,
      primaryAction: "Enable Voice Features",
      secondaryAction: "Text Only for Now",
      showVoiceOptions: true,
      showProgress: true
    },
    {
      id: 'ready',
      title: "All Set!",
      message: "Perfect! I'm ready to assist you with your health journey.",
      description: "You can ask me about your health scores, request local recommendations, explore KGC features, or just chat about your wellness goals.",
      icon: ArrowRight,
      primaryAction: "Start Chatting",
      showProgress: false
    }
  ];

  const currentWelcome = welcomeSteps[currentStep];

  // Auto-speak welcome messages if voice is being set up
  useEffect(() => {
    if (currentWelcome && settings.voiceEnabled && currentStep > 0) {
      const messageToSpeak = `${currentWelcome.title}. ${currentWelcome.message}`;
      setTimeout(() => {
        speakText(messageToSpeak);
      }, 500);
    }
    
    return () => {
      stopSpeaking();
    };
  }, [currentStep, settings.voiceEnabled, currentWelcome]);

  const handleNext = (enableVoice = false) => {
    if (currentStep === 2) {
      // Voice setup step
      setSettings({
        voiceEnabled: enableVoice,
        autoSpeak: enableVoice,
        speechRecognition: enableVoice
      });
    }
    
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete the welcome flow
      onComplete(settings);
    }
  };

  const handleVoiceTest = () => {
    const testMessage = "Hello! This is how I'll sound when speaking my responses to you.";
    speakText(testMessage);
  };

  if (!isVisible) return null;

  const IconComponent = currentWelcome.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full shadow-2xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <IconComponent className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {currentWelcome.title}
            </h2>
            <p className="text-lg text-gray-700 mb-2">
              {currentWelcome.message}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {currentWelcome.description}
            </p>
          </div>
          
          {/* Voice Options (Step 3) */}
          {currentWelcome.showVoiceOptions && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Voice Features Include:</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-blue-600" />
                  <span>Text-to-speech for all my responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-blue-600" />
                  <span>Voice commands and questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>Hands-free interaction</span>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoiceTest}
                className="mt-3 w-full"
              >
                Test Voice
              </Button>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => handleNext(currentStep === 2)}
              className="bg-[#2E8BC0] hover:bg-[#267cad] w-full text-white py-3 text-base font-medium"
            >
              {currentStep === 2 && <Volume2 className="h-5 w-5 mr-2" />}
              {currentWelcome.primaryAction}
            </Button>
            
            {currentWelcome.secondaryAction && (
              <Button 
                onClick={() => handleNext(false)}
                variant="outline"
                className="w-full py-3 text-base"
              >
                <VolumeX className="h-5 w-5 mr-2" />
                {currentWelcome.secondaryAction}
              </Button>
            )}
          </div>
          
          {/* Progress Indicators */}
          {currentWelcome.showProgress && (
            <div className="flex justify-center mt-6 gap-2">
              {welcomeSteps.slice(0, -1).map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentStep 
                      ? 'bg-blue-500' 
                      : index < currentStep 
                        ? 'bg-blue-300' 
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
          
          {/* Skip Option */}
          {currentStep < welcomeSteps.length - 1 && (
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onComplete({ voiceEnabled: false, autoSpeak: false, speechRecognition: false })}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip Welcome
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeDialogue;