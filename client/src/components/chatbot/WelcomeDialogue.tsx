import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Volume2, VolumeX } from "lucide-react";

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

export default WelcomeDialogue;
