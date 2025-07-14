import React, { useState } from 'react';

// Define the Message interface to be used throughout the component
export interface SupervisorMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface SupervisorAgentProps {
  userId: number;
  agentName?: string;
  agentAvatar?: string;
  initialMessages?: SupervisorMessage[];
  onMessageSent?: (message: string) => void;
  onRecommendationReceived?: (recommendation: any | null) => void;
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

  return (
    <div className={`flex flex-col h-full bg-background border rounded-lg shadow-sm ${className}`}>
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
              <p>{message.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Supervisor Agent chat functionality will be implemented in the next feature.
        </p>
      </div>
    </div>
  );
}
