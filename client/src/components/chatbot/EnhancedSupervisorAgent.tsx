import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface EnhancedSupervisorAgentProps {
  userId: number;
  healthMetrics: any; // Define a proper type later
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle initial message from prop
    if (initialMessage) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `ai-initial-${Date.now()}`,
          text: initialMessage,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } else {
      // Default welcome message if no initial message
      setMessages([
        {
          id: `ai-welcome-${Date.now()}`,
          text: "Hello! I'm your KGC Health Assistant. How can I help you today?",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  }, [initialMessage]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: userInput,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // Actual API call to the backend
      const response = await apiRequest('/api/chat/send', 'POST', {
        userId,
        message: userInput,
        healthMetrics, // Sending current healthMetrics, define proper type later
      });

      if (response && response.reply) {
        const aiResponse: Message = {
          id: `ai-${Date.now()}`,
          text: response.reply,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, aiResponse]);

        // Example of handling a recommendation
        if (response.recommendedFeature) {
          onRecommendationAccepted(response.recommendedFeature);
        }

      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        text: `Error: ${error instanceof Error ? error.message : 'Could not connect to the AI assistant. Please try again.'}`,
        sender: 'ai', // Show error as an AI message
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
    // setUserInput(''); // Already cleared before API call
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-background text-foreground">
      {!hideHeader && (
        <header className="mb-4">
          <h2 className="text-xl font-semibold">KGC Health Assistant</h2>
        </header>
      )}
      <ScrollArea className="flex-grow mb-4 pr-4" ref={scrollAreaRef as any}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 ${
                msg.sender === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/assets/kgc-logo-prominent.png" alt="AI Avatar" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`p-3 rounded-lg max-w-xs lg:max-w-md xl:max-w-lg break-words ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs text-muted-foreground/80 mt-1 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.sender === 'user' && (
                <Avatar className="h-8 w-8">
                  {/* Placeholder for user avatar if needed */}
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/assets/kgc-logo-prominent.png" alt="AI Avatar" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm italic">KGC Assistant is typing...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="flex items-center space-x-2 border-t pt-4">
        <Input
          type="text"
          placeholder="Type your message..."
          value={userInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className="flex-grow"
        />
        <Button onClick={handleSendMessage} disabled={isLoading || userInput.trim() === ''}>
          <Send className="h-5 w-5" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  );
};

export default EnhancedSupervisorAgent;