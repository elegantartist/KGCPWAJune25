import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, BarChart, ArrowRight, ArrowLeft } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import EnhancedImageStore from "@/lib/enhancedImageStore";
import SimpleCarousel from "@/components/health/SimpleCarousel";
import KeepGoingButton from "@/components/KeepGoingButton";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/../../shared/schema";
import Layout from "@/components/layout/Layout";


// Define global window types for TypeScript
declare global {
  interface Window {
    __KGC_ENHANCED_IMAGE__: string | null;
  }
}



const Dashboard: React.FC = () => {
  // Define all state hooks at the top of the component
  const [chatVibrating, setChatVibrating] = useState(false);
  const [keepGoingVibrating, setKeepGoingVibrating] = useState(false);
  const [scoresVibrating, setScoresVibrating] = useState(false);
  const [motivationalImage, setMotivationalImage] = useState<string | null>(null);
  // Connectivity level state removed - app now requires internet connection
  // const [connectivityLevel, setConnectivityLevel] = useState(ConnectivityLevel.FULL);

  // Get responsive layout information
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Connectivity change listener removed - app now requires internet connection

  // Fetch current email auth status
  const { data: authStatus, isLoading: isLoadingAuth } = useQuery<{
    authenticated: boolean;
    dashboardType: string;
    email: string;
    userId?: number;
  }>({
    queryKey: ["/api/email-auth/status"],
    staleTime: 0,
    retry: false,
  });

  const isAdminImpersonatingPatient = false; // Not needed with email auth
  const patientToDisplayId = authStatus?.userId || 2; // Default to Reuben Collins (userId: 2)

  // Fetch actual patient data using the determined ID
  const { data: patient, isLoading: isLoadingPatient } = useQuery<User>({
    queryKey: ["/api/user", patientToDisplayId],
    queryFn: async () => {
      const res = await fetch(`/api/user/${patientToDisplayId}`);
      if (!res.ok) throw new Error('Failed to fetch patient data');
      return res.json();
    },
    enabled: !!patientToDisplayId,
    retry: false,
  });

  // Handle returning to admin dashboard (clear patient impersonation)
  const handleReturnToAdminDashboard = async () => {
    try {
      const response = await fetch('/api/admin/clear-impersonation-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to clear impersonation');
      }

      // Redirect to admin dashboard
      setLocation('/admin-dashboard');
    } catch (error) {
      console.error('Error clearing impersonation:', error);
      toast({
        title: "Error",
        description: "Failed to return to admin dashboard",
        variant: "destructive",
      });
    }
  };

  // Create a ref for the audio to handle play promises
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Vibration helper with enhanced audio feedback
  const triggerVibration = (type: 'chat' | 'keepGoing' | 'scores') => {
    // Play metallic gong sound for therapeutic effect
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Audio autoplay prevented:", error);
        });
      }
    }

    // Visual vibration effect
    switch (type) {
      case 'chat':
        setChatVibrating(true);
        setTimeout(() => setChatVibrating(false), 3000);
        break;
      case 'keepGoing':
        setKeepGoingVibrating(true);
        setTimeout(() => setKeepGoingVibrating(false), 3000);
        break;
      case 'scores':
        setScoresVibrating(true);
        setTimeout(() => setScoresVibrating(false), 3000);
        break;
    }

    // Device haptic feedback
    createHapticFeedback();
  };

  // Enhanced image loading with multiple strategies
  useEffect(() => {
    console.log("Dashboard: Checking local storage");
    
    // Strategy 1: Check sessionStorage flag
    const hasUploadedImage = sessionStorage.getItem('hasUploadedMotivationalImage');
    if (hasUploadedImage) {
      console.log("Found image flag in sessionStorage");
      
      // Strategy 2: Check direct memory store first
      const directImage = EnhancedImageStore.getImage();
      if (directImage) {
        console.log("Found image in direct memory store");
        setMotivationalImage(directImage);
        return;
      } else {
        console.log("No image found in direct memory store");
      }
    }

    // If no image found yet, check if we're in a state where we should have one
    if (!motivationalImage) {
      console.log("Dashboard: No motivational image found");
    }
  }, [motivationalImage]);

  // Enhanced image fetching from database with better error handling
  useEffect(() => {
    const fetchMotivationalImage = async () => {
      if (!patientToDisplayId) return;
      
      try {
        const response = await fetch(`/api/users/${patientToDisplayId}/motivational-image`);
        if (response.ok) {
          const data = await response.json();
          if (data?.imageData) {
            console.log("Dashboard: Found saved image in database");
            setMotivationalImage(data.imageData);
            // Update the enhanced store for consistency
            EnhancedImageStore.setImage(data.imageData);
            sessionStorage.setItem('hasUploadedMotivationalImage', 'true');
          }
        }
      } catch (error) {
        console.error("Error fetching motivational image:", error);
      }
    };

    if (patientToDisplayId && !motivationalImage) {
      fetchMotivationalImage();
    }
  }, [patientToDisplayId, motivationalImage]);

  // Show loading state
  if (isLoadingAuth || isLoadingPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Show error state if not authenticated - redirect to landing
  if (!authStatus?.authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Authentication Required</h2>
              <p className="text-sm text-gray-600">
                Please log in to access the patient dashboard.
              </p>
              <Button 
                onClick={() => window.location.href = '/'} 
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      {/* Hidden audio element for therapeutic gong sound */}
      <audio 
        ref={audioRef}
        preload="auto"
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+nytmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+ny"
      />



      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className={cn(
          "max-w-6xl mx-auto space-y-8",
          isMobile && "pb-20" // Reduced padding since buttons can overlap carousel
        )}>
          {/* Admin Impersonation Banner */}
          {isAdminImpersonatingPatient && (
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="text-yellow-800 font-medium">
                    👑 Admin View: {patient?.name || 'Patient'} Dashboard
                  </div>
                </div>
                <Button
                  onClick={handleReturnToAdminDashboard}
                  variant="outline"
                  size="sm"
                  className="text-yellow-800 border-yellow-400 hover:bg-yellow-200"
                >
                  Return to Admin Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Health Images Carousel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Health Images Carousel */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-80 sm:h-96 md:h-[400px] lg:h-[500px]">
                    <SimpleCarousel className="w-full h-full" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Action Buttons (Desktop only) */}
            <div className="lg:col-span-1 hidden lg:block">
              <div className="space-y-4">
                {/* Chat with KGC Assistant */}
                <div className="relative">
                  <Button
                    className={cn(
                      "w-full flex items-center justify-center text-white rounded-xl",
                      "metallic-blue",
                      "h-16 sm:h-18 md:h-20",
                      "text-sm sm:text-base md:text-lg font-semibold",
                      "transition-all duration-300 hover:scale-105",
                      chatVibrating && "btn-vibrate"
                    )}
                    size="lg"
                    onClick={() => {
                      triggerVibration('chat');
                      setTimeout(() => {
                        try {
                          setLocation('/chatbot');
                          console.log("Navigating to Enhanced Chatbot (/chatbot)");
                        } catch (error) {
                          console.error("Navigation error:", error);
                          window.location.href = '/chatbot';
                        }
                      }, 3000);
                    }}
                  >
                    <MessageCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Chat with KGC Assistant</span>
                  </Button>
                </div>

                {/* Keep Going Button */}
                <div className="relative">
                  <KeepGoingButton
                    userId={patientToDisplayId || 2}
                    className={cn(
                      "w-full",
                      keepGoingVibrating && "btn-vibrate"
                    )}
                  />
                </div>

                {/* Daily Self-Scores */}
                <div className="relative">
                  <Button
                    className={cn(
                      "w-full flex items-center justify-center text-white rounded-xl",
                      "metallic-blue",
                      "h-16 sm:h-18 md:h-20",
                      "text-sm sm:text-base md:text-lg font-semibold",
                      "transition-all duration-300 hover:scale-105",
                      scoresVibrating && "btn-vibrate"
                    )} 
                      size="lg"
                      onClick={() => {
                        triggerVibration('scores');
                        setTimeout(() => {
                          try {
                            setLocation('/daily-self-scores');
                            console.log("Navigating to Daily Self-Scores (/daily-self-scores)");
                          } catch (error) {
                            console.error("Navigation error:", error);
                            window.location.href = '/daily-self-scores';
                          }
                        }, 3000);
                      }}
                  >
                    <BarChart className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Daily Self-Scores</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout - Floating Action Buttons */}
          {isMobile && (
            <div className="fixed bottom-4 left-4 right-4 z-50">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Chat Button */}
                <Button
                  className={cn(
                    "flex items-center justify-center text-white rounded-xl shadow-lg",
                    "metallic-blue opacity-85",
                    "h-40",
                    "text-xl font-semibold",
                    "transition-all duration-300 hover:scale-105 hover:opacity-100",
                    chatVibrating && "btn-vibrate"
                  )}
                  size="lg"
                  onClick={() => {
                    triggerVibration('chat');
                    setTimeout(() => {
                      try {
                        setLocation('/chatbot');
                        console.log("Navigating to Enhanced Chatbot (/chatbot)");
                      } catch (error) {
                        console.error("Navigation error:", error);
                        window.location.href = '/chatbot';
                      }
                    }, 3000);
                  }}
                >
                  <MessageCircle className="h-8 w-8 mr-3 flex-shrink-0" />
                  <span>Chat</span>
                </Button>

                {/* Keep Going Button */}
                <KeepGoingButton
                  userId={patientToDisplayId || 2}
                  className={cn(
                    "h-40 shadow-lg text-xl opacity-85 hover:opacity-100",
                    keepGoingVibrating && "btn-vibrate"
                  )}
                />
              </div>
              
              {/* Daily Self-Scores - Full Width */}
              <div className="w-full">
                <Button
                  className={cn(
                    "w-full flex items-center justify-center text-white rounded-xl shadow-lg",
                    "metallic-blue opacity-85",
                    "h-40",
                    "text-xl font-semibold",
                    "transition-all duration-300 hover:scale-105 hover:opacity-100",
                    scoresVibrating && "btn-vibrate"
                  )}
                  size="lg"
                  onClick={() => {
                    triggerVibration('scores');
                    setTimeout(() => {
                      try {
                        setLocation('/daily-self-scores');
                        console.log("Navigating to Daily Self-Scores (/daily-self-scores)");
                      } catch (error) {
                        console.error("Navigation error:", error);
                        window.location.href = '/daily-self-scores';
                      }
                    }, 3000);
                  }}
                >
                  <BarChart className="h-8 w-8 mr-3 flex-shrink-0" />
                  <span>Daily Self-Scores</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;