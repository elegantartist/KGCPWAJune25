import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSimpleToast } from "@/hooks/simple-toast";
import { Brain, Wifi } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import EnhancedSupervisorAgent from "@/components/chatbot/EnhancedSupervisorAgent";
// ConnectivityLevel is still needed for the SupervisorAgent interface
import { ConnectivityLevel } from "@shared/types";
import { ConnectivityBanner } from "@/components/ui/connectivity-banner";
import { useConnectivity } from "@/hooks/useConnectivity";

// Sample response templates for different connectivity levels
const CONNECTIVITY_RESPONSES = {
  [ConnectivityLevel.OFFLINE]: [
    "I'm currently in offline mode, but I can still help with basic information. Remember to track your health scores daily for better insights when you're back online.",
    "I'm working in offline mode right now. I can provide general health advice based on previously cached information.",
    "Limited connectivity detected. I'm operating with reduced capabilities, but I'm still here to support your health journey with essential guidance.",
    "Network connection unavailable. I'm using cached data to provide basic support. For emergency health situations, please call 000 immediately."
  ],
  // We no longer use MINIMAL and FUNCTIONAL connectivity levels
  // App is now online or offline only
  
  [ConnectivityLevel.FULL]: [
    "I'm operating at full capacity with excellent connectivity. All features are available, including multi-model validation for the most accurate health guidance.",
    "Full connectivity detected. I can provide comprehensive health support with access to all features, including advanced analytics and personalised recommendations.",
    "I'm working with optimal connectivity. I can provide the most accurate and personalised health guidance using multiple AI validation systems.",
    "I have full access to all systems. I can provide detailed analysis of your health metrics, multi-validated recommendations, and complete feature access."
  ]
};

// Enhanced chatbot page with connectivity awareness
const EnhancedChatbot: React.FC = () => {
  const [userId, setUserId] = useState<number>(1); // Default user ID
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [recommendedFeature, setRecommendedFeature] = useState<string | null>(null);
  const { connectivityLevel, isOffline } = useConnectivity();
  const [chatKey, setChatKey] = useState<string>(`chatbot-${Date.now()}`);
  const [initialMessage, setInitialMessage] = useState<string>('');
  const { toast } = useSimpleToast();

  // forceRemount callback removed - app now requires internet connection

  // Set up the initial message with timeout (15 seconds)
  useEffect(() => {
    // Check if there are health metrics in localStorage
    const lastHealthMetricsStr = localStorage.getItem('lastHealthMetrics');
    
    if (lastHealthMetricsStr) {
      try {
        const parsedMetrics = JSON.parse(lastHealthMetricsStr);
        const metricDate = new Date(parsedMetrics.date);
        const now = new Date();
        const diffMs = now.getTime() - metricDate.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        // Only show the health scores message if submitted within the last 5 minutes
        if (diffMinutes < 5) {
          const scoreMessage = 'Hello! I can see you\'ve just submitted your health scores. Would you like to discuss them together? I can provide personalised feedback and recommend helpful KGC features based on your scores.';
          setInitialMessage(scoreMessage);
          
          // Set a timeout to clear the message after 15 seconds
          const timeoutId = setTimeout(() => {
            console.log('Enhanced Chatbot: Clearing health scores message due to timeout (15 seconds)');
            setInitialMessage('');
            setChatKey(`chatbot-${Date.now()}-reset`); // Reset the chatbot to show welcome message
          }, 15000); // 15 seconds timeout
          
          return () => clearTimeout(timeoutId); // Clean up timeout on component unmount
        }
      } catch (e) {
        console.error('Error parsing health metrics from localStorage:', e);
      }
    }
  }, []);

  // Fetch the user ID and health metrics on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserData = async () => {
      try {
        // Fetch user basic info
        const user = await apiRequest<{ id: number; name: string; email: string }>('GET', '/api/user');
        if (!isMounted) return;
        
        if (user && typeof user.id === 'number') {
          setUserId(user.id);
          
          // Check if there are recently submitted metrics in localStorage
          const lastHealthMetricsStr = localStorage.getItem('lastHealthMetrics');
          let redirectedFromHealthMetrics = false;
          let metrics = null;
          
          if (lastHealthMetricsStr) {
            try {
              const parsedMetrics = JSON.parse(lastHealthMetricsStr);
              // Check if these metrics were submitted recently (within the last 5 minutes)
              const metricDate = new Date(parsedMetrics.date);
              const now = new Date();
              const diffMs = now.getTime() - metricDate.getTime();
              const diffMinutes = diffMs / (1000 * 60);
              
              if (diffMinutes < 5) {
                console.log('Enhanced Chatbot: Using health metrics from localStorage:', parsedMetrics);
                console.log('Enhanced Chatbot: Time since metrics were submitted:', Math.round(diffMinutes * 60), 'seconds ago');
                metrics = {
                  dietScore: parsedMetrics.dietScore,
                  exerciseScore: parsedMetrics.exerciseScore,
                  medicationScore: parsedMetrics.medicationScore,
                  date: metricDate
                };
                redirectedFromHealthMetrics = true;
                setHealthMetrics(metrics);
                console.log('Enhanced Chatbot: Using recently submitted health metrics for analysis');
                
                // Force chatbot remount to ensure it uses the new metrics
                setChatKey(`chatbot-${Date.now()}-metrics-${metrics.dietScore}-${metrics.exerciseScore}-${metrics.medicationScore}`);
              }
            } catch (e) {
              console.error('Error parsing health metrics from localStorage:', e);
            }
          }
          
          // If no recent metrics in localStorage, fetch from server
          if (!redirectedFromHealthMetrics) {
            try {
              const serverMetrics = await apiRequest('GET', `/api/users/${user.id}/health-metrics/latest`);
              if (!isMounted) return;
              
              console.log('Enhanced Chatbot: Fetched latest health metrics from server:', serverMetrics);
              
              if (serverMetrics && typeof serverMetrics.dietScore === 'number') {
                setHealthMetrics(serverMetrics);
              }
            } catch (healthError) {
              console.error("Error fetching health metrics:", healthError);
            }
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
  }, []);
  
  // Handle when a recommendation is accepted
  const handleRecommendationAccepted = (feature: string) => {
    console.log('Enhanced Chatbot: Recommendation accepted:', feature);
    setRecommendedFeature(feature);
    
    // Format the feature name nicely
    const formattedFeature = feature
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Show toast notification
    toast({
      title: "Health Recommendation",
      description: `Focus on: ${formattedFeature}`,
      duration: 5000,
    });
  };
  
  // Handle when feedback is submitted
  const handleFeedbackSubmitted = (feedback: string) => {
    console.log('Enhanced Chatbot: Feedback submitted:', feedback);
    
    // Show toast notification
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback!",
      duration: 3000,
    });
  };
  
  // Get a random response for the current connectivity level
  const getConnectivityLevelResponse = (): string => {
    const level = isOffline ? ConnectivityLevel.OFFLINE : ConnectivityLevel.FULL;
    const responses = CONNECTIVITY_RESPONSES[level] || CONNECTIVITY_RESPONSES[ConnectivityLevel.FULL];
    return responses[Math.floor(Math.random() * responses.length)];
  };
  
  // Import our new ConnectivityBanner component at the top of the file
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">KGC Health Assistant</h2>
        </div>
        
        {recommendedFeature && (
          <div className="flex items-center">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-xs">
                {recommendedFeature.split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Add connectivity banner at the top of the chat area */}
      <ConnectivityBanner level={connectivityLevel} />
      
      <div className="grid grid-cols-1 gap-4 flex-1">
        <div className="relative h-full">
          <EnhancedSupervisorAgent
            key={chatKey}
            userId={userId}
            healthMetrics={healthMetrics}
            onRecommendationAccepted={handleRecommendationAccepted}
            onFeedbackSubmitted={handleFeedbackSubmitted}
            hideHeader={true} // Hide the component's header since we already have one in this page
            initialMessage={initialMessage} // Use the state variable that has the timeout logic
            connectivityLevel={connectivityLevel}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatbot;