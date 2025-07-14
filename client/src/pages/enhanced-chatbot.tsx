import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import SupervisorAgent, { SupervisorMessage } from '@/components/chatbot/SupervisorAgent';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import ConnectivityBanner from '@/components/ui/connectivity-banner';

const EnhancedChatbot: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isOnline = useOnlineStatus();

  // Get initial message from localStorage if available
  const getInitialMessage = (): SupervisorMessage[] => {
    const lastMetrics = localStorage.getItem('lastHealthMetrics');
    if (lastMetrics) {
      try {
        const metrics = JSON.parse(lastMetrics);
        const today = new Date().toISOString().split('T')[0];
        
        // Check if the scores were submitted today
        if (metrics.date === today) {
          // Clear it so it's only used once
          localStorage.removeItem('lastHealthMetrics');
          
          const analysisMessage = `I've just submitted my daily scores: Diet ${metrics.dietScore}/10, Exercise ${metrics.exerciseScore}/10, Medication ${metrics.medicationScore}/10. Can you help me understand these scores and suggest ways to improve?`;
          
          return [{
            id: Date.now(),
            text: analysisMessage,
            isUser: true,
            timestamp: new Date()
          }];
        }
      } catch (e) {
        console.error('Error parsing health metrics from localStorage:', e);
      }
    }
    return [];
  };

  const [initialMessages] = useState<SupervisorMessage[]>(getInitialMessage);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <p className="mb-4">You must be logged in to use the chatbot.</p>
        <Button onClick={() => setLocation('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b bg-white shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-lg font-semibold text-gray-800">KGC Health Assistant</h1>
        <div className="w-24"></div> {/* Spacer */}
      </header>

      {/* Connectivity Banner */}
      {!isOnline && <ConnectivityBanner />}

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden p-4">
        <SupervisorAgent
          userId={user.id}
          initialMessages={initialMessages}
          className="h-full"
        />
      </main>
    </div>
  );
};

export default EnhancedChatbot;