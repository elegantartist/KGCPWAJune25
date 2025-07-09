import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useSimpleToast } from "@/hooks/simple-toast";
import { Brain, Heart, LogOut, Star, MessageSquare } from "lucide-react";
import { EnhancedSupervisorAgent } from "@/components/chatbot/EnhancedSupervisorAgent";
import Layout from "@/components/layout/Layout";
import { ConnectivityLevel } from "@shared/types";
import { ConnectivityBanner } from "@/components/ui/connectivity-banner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import DailySelfScores from "@/components/features/DailySelfScores";
import { useBadgeAward } from "@/context/BadgeAwardContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import KeepGoingSequenceModal from "@/components/features/KeepGoingSequenceModal";
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { useAuth } from '@/context/auth-context';

const carouselImages = [
  '/assets/carousel-image-1.jpg', // Replace with your actual image file
  '/assets/carousel-image-2.jpg', // Replace with your actual image file
  '/assets/carousel-image-3.jpg', // Replace with your actual image file
  '/assets/carousel-image-4.jpg', // Replace with your actual image file
  '/assets/carousel-image-5.jpg', // Replace with your actual image file
  '/assets/carousel-image-6.jpg', // Replace with your actual image file
  '/assets/carousel-image-7.jpg', // Replace with your actual image file
];

// Enhanced chatbot page with connectivity awareness
const EnhancedChatbot: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [recommendedFeature, setRecommendedFeature] = useState<string | null>(null);
  const isOnline = useOnlineStatus();
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string>('');
  const [showKeepGoing, setShowKeepGoing] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const { toast } = useSimpleToast();
  const { showAward } = useBadgeAward();

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
            setInitialMessage(''); // This will cause the chatbot to show its default welcome.
          }, 15000); // 15 seconds timeout
          
          return () => clearTimeout(timeoutId); // Clean up timeout on component unmount
        }
      } catch (e) {
        console.error('Error parsing health metrics from localStorage:', e);
      }
    }
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
  
  const handleScoresSubmitted = async (scores: { diet: number; exercise: number; medication: number; }) => {
    try {
      // Call the new backend endpoint to save scores and check for badges
      const response = await apiRequest<any>('POST', '/api/scores', scores);

      // The toast with the analysis option is now handled inside DailySelfScores.
      // This parent component just needs to handle the badge award.
      if (response && response.newlyEarnedBadges && response.newlyEarnedBadges.length > 0) {
        response.newlyEarnedBadges.forEach((badge: any) => {
          showAward(badge); // Trigger the celebration modal for each new badge
        });
      }
    } catch (error) {
      console.error("Error submitting scores:", error);
      toast({ title: "Error", description: "Could not submit scores. Please try again.", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    // In a real app, you would also call a backend endpoint to invalidate the session/token
    console.log('User logging out...');
    // For now, we can clear relevant local storage and redirect
    localStorage.clear(); // Or selectively remove items: localStorage.removeItem('authToken');
    window.location.href = '/login'; // Redirect to a login page
  };
  
  return (
    <Layout>
      <div className="relative flex flex-col h-full max-h-[calc(100vh-6rem)] text-white">
        <ImageCarousel images={carouselImages} />
        <ConnectivityBanner isOnline={isOnline} />

        <div className="relative z-10 flex flex-col flex-grow">
          <div className="absolute top-4 right-4">
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20 hover:text-white">
                <LogOut className="h-5 w-5 mr-1" /> Logout
              </Button>
          </div>

          <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
            <img src="/assets/kgc-logo-prominent.png" alt="Keep Going Care Logo" className="w-32 h-32 mb-4" />
            <h1 className="text-4xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>Keep Going Care</h1>
            <p className="mt-2 text-lg" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>Your partner in a healthier lifestyle.</p>
          </div>

          {/* Main Buttons */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
            <Button
              onClick={() => setShowScoresModal(true)}
              className="h-24 text-lg bg-blue-600/80 backdrop-blur-sm border border-white/20 hover:bg-blue-700/80"
            >
              <Star className="mr-2 h-6 w-6" /> Daily Self-Scores
            </Button>
            <Button
              onClick={() => setShowChatbot(true)}
              className="h-24 text-lg bg-blue-600/80 backdrop-blur-sm border border-white/20 hover:bg-blue-700/80"
            >
              <Brain className="mr-2 h-6 w-6" /> Chat with KGC
            </Button>
            <Button
              onClick={() => setShowKeepGoing(true)}
              className="h-24 text-lg bg-green-500/80 backdrop-blur-sm border border-white/20 hover:bg-green-600/80"
            >
              <Heart className="mr-2 h-6 w-6" /> Keep Going
            </Button>
          </div>
        </div>

        <Dialog open={showScoresModal} onOpenChange={setShowScoresModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Your Daily Self-Scores</DialogTitle>
            </DialogHeader>
            <DailySelfScores onSubmitted={handleScoresSubmitted} onClose={() => setShowScoresModal(false)} />
          </DialogContent>
        </Dialog>

        <KeepGoingSequenceModal isOpen={showKeepGoing} onClose={() => setShowKeepGoing(false)} />

        <Dialog open={showChatbot} onOpenChange={setShowChatbot}>
          <DialogContent className="sm:max-w-[80vw] md:max-w-[60vw] lg:max-w-[40vw] h-[80vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                KGC Health Assistant
              </DialogTitle>
              <DialogDescription>
                Your personal AI health assistant.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto">
              {userId && (
                <EnhancedSupervisorAgent userId={userId} healthMetrics={healthMetrics} onRecommendationAccepted={handleRecommendationAccepted} onFeedbackSubmitted={handleFeedbackSubmitted} hideHeader={true} initialMessage={initialMessage} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default EnhancedChatbot;