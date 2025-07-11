import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the props based on usage in enhanced-chatbot.tsx

// Assuming SimpleHealthScores will be defined/imported here or in a shared types file
// For now, defining it locally for this component.
interface SimpleHealthScores { // Definition copied from enhanced-chatbot.tsx for now
  diet: number;
  exercise: number;
  medication: number;
  date: string; // ISO string
}

interface EnhancedSupervisorAgentProps {
  userId: number;
  healthMetrics: SimpleHealthScores | null; // Updated type
  onRecommendationAccepted: (feature: string) => void;
  onFeedbackSubmitted: (feedback: string) => void;
  hideHeader?: boolean;
  initialMessage?: string;
}

const EnhancedSupervisorAgent: React.FC<EnhancedSupervisorAgentProps> = ({
  userId,
  healthMetrics,
  onRecommendationAccepted,
  onFeedbackSubmitted,
  hideHeader = false,
  initialMessage,
}) => {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Log received props for debugging
    console.log('EnhancedSupervisorAgent Props:', {
      userId,
      healthMetrics,
      hideHeader,
      initialMessage,
    });

    if (initialMessage) {
      setMessages([{ sender: 'assistant', text: initialMessage }]);
    } else {
      setMessages([{ sender: 'assistant', text: 'Hello! How can I help you today?' }]);
    }
  }, [userId, healthMetrics, hideHeader, initialMessage]);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { sender: 'user', text: input }]);
      // Here you would typically call an API to get the assistant's response
      // For this placeholder, we'll just simulate a simple echo or canned response
      setTimeout(() => {
        setMessages(prev => [...prev, { sender: 'assistant', text: `I received: "${input}". Full chat logic is pending.` }]);
      }, 500);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {!hideHeader && (
        <CardHeader className="pb-2 px-0">
          <CardTitle>KGC Health Assistant</CardTitle>
        </CardHeader>
      )}
      <ScrollArea className="flex-grow mb-4 p-2 border rounded-md bg-white min-h-[200px]">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-2 p-2 rounded-lg max-w-[80%] ${
              msg.sender === 'user'
                ? 'bg-blue-500 text-white self-end ml-auto'
                : 'bg-gray-200 text-gray-800 self-start mr-auto'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </ScrollArea>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend}>Send</Button>
      </div>
      {/* Placeholder for recommendation/feedback buttons if needed later */}
      {/* <Button onClick={() => onRecommendationAccepted("some-feature")}>Test Accept Rec</Button> */}
      {/* <Button onClick={() => onFeedbackSubmitted("great service!")}>Test Submit Feedback</Button> */}
    </div>
  );
};

export default EnhancedSupervisorAgent;