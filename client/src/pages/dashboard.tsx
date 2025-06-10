import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, BarChart, ArrowRight, ArrowLeft } from 'lucide-react';
import { LogoutButton } from "@/components/ui/LogoutButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useNotificationStore } from '../stores/notificationStore';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { createHapticFeedback } from "@/lib/hapticFeedback";
import EnhancedImageStore from "@/lib/enhancedImageStore";
import HealthImageCarousel from "@/components/health/HealthImageCarousel";
import { KeepGoingFeature } from "@/components/keep-going/KeepGoingFeature";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { apiRequest } from "../lib/apiRequest";
import Layout from "@/components/layout/Layout";
// Removed unused User import

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
  
  // Get responsive layout information
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Visual connectivity system hooks
  const isOnline = useOnlineStatus();
  const { hasNewChatMessages, pendingMessageCount, clearNotifications } = useNotificationStore();

  // Connectivity change listener removed - app now requires internet connection

  // --- START: NEW DATA-FETCHING LOGIC ---
  const { user } = useAuth();
  const { data: patientData, isLoading, error } = useQuery({
      queryKey: ['patientDashboardData', user?.id],
      queryFn: () => apiRequest('/api/patients/me/dashboard'),
      enabled: !!user,
  });
  // --- END: NEW DATA-FETCHING LOGIC ---

  // Handle returning to admin dashboard (clear patient impersonation)
  const handleReturnToAdminDashboard = async () => {
    try {
      const response = await fetch('/api/admin/clear-impersonation-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear patient impersonation context.');
      }

      console.log('[FRONTEND DEBUG] Admin cleared patient impersonation. Redirecting to /admin-dashboard');
      setLocation('/admin-dashboard');
    } catch (error: any) {
      console.error('Error clearing patient impersonation:', error);
      toast({
        title: "Return Failed",
        description: error.message || "Could not return to admin dashboard.",
        variant: "destructive",
      });
    }
  };

  // Fetch the motivational image from the database
  const { data: savedImage } = useQuery({
    queryKey: ['/api/users', user?.id, 'motivational-image'],
    queryFn: async () => {
      try {
        if (!user?.id) return null;
        const response = await fetch(`/api/users/${user.id}/motivational-image`);
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error('Failed to fetch motivational image');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching motivational image:', error);
        return null;
      }
    },
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Set the motivational image when data is available
  useEffect(() => {
    if (savedImage && savedImage.imageData) {
      console.log("Dashboard: Found saved image in database");
      setMotivationalImage(savedImage.imageData);

      // Update window variable for cross-component compatibility
      if (typeof window !== 'undefined') {
        window.__KGC_ENHANCED_IMAGE__ = savedImage.imageData;
      }

      // Also update EnhancedImageStore
      EnhancedImageStore.setImage(savedImage.imageData);
    } else {
      // Fallback to window variable or EnhancedImageStore
      console.log("Dashboard: Checking local storage");
      try {
        const windowImage = typeof window !== 'undefined' ? window.__KGC_ENHANCED_IMAGE__ : null;
        const storeImage = EnhancedImageStore.getImage();

        if (windowImage) {
          console.log("Dashboard: Found image in window variable");
          setMotivationalImage(windowImage);
        } else if (storeImage) {
          console.log("Dashboard: Found image in enhanced image store");
          setMotivationalImage(storeImage);
        } else {
          console.log("Dashboard: No motivational image found");
        }
      } catch (error) {
        console.error('Error accessing motivational image:', error);
      }
    }
  }, [savedImage]);

  // Function to trigger vibration with iOS compatibility and sound for main buttons
  const triggerVibration = (buttonType: 'chat' | 'keepGoing' | 'scores') => {
    try {
      // Create haptic-like feedback using audio WITH sound for these main buttons
      // Second parameter true indicates to play the gong sound
      createHapticFeedback(2000, true);

      // Set the animation state for the specific button (visual effect) - extended to 3 seconds to match therapeutic gong duration
      if (buttonType === 'chat') {
        setChatVibrating(true);
        setTimeout(() => setChatVibrating(false), 3000); // 3 seconds matching therapeutic gong duration
      } else if (buttonType === 'keepGoing') {
        setKeepGoingVibrating(true);
        setTimeout(() => setKeepGoingVibrating(false), 3000); // 3 seconds
      } else if (buttonType === 'scores') {
        setScoresVibrating(true);
        setTimeout(() => setScoresVibrating(false), 3000); // 3 seconds
      }
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
      // Fallback - just set the visual animation state without the haptic feedback
      if (buttonType === 'chat') setChatVibrating(true);
      else if (buttonType === 'keepGoing') setKeepGoingVibrating(true);
      else if (buttonType === 'scores') setScoresVibrating(true);

      // Reset visual state after 3 seconds regardless to match therapeutic gong duration
      setTimeout(() => {
        if (buttonType === 'chat') setChatVibrating(false);
        else if (buttonType === 'keepGoing') setKeepGoingVibrating(false);
        else if (buttonType === 'scores') setScoresVibrating(false);
      }, 3000);
    }
  };

  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <div className={cn("space-y-6", isMobile && "relative min-h-screen")}>
        {/* Logout Button */}
        <div className={cn(
          "flex justify-end mb-3",
          isMobile && "fixed top-4 right-4 z-50"
        )}>
          <LogoutButton userRole="patient" />
        </div>

      {/* The carousel should go here but we'll move it back into the card */}

      <Card className={cn(
        "border-[#2E8BC0]/20",
        isMobile ? "bg-transparent border-0 shadow-none relative z-20 mt-12" : "bg-[#fdfdfd]"
      )}>
        <CardContent className={cn(
          "p-6", 
          isMobile && "p-4 bg-transparent"
        )}>
          {/* Health image carousel - for both mobile and desktop */}
          <HealthImageCarousel 
            className={isMobile ? "h-80 w-full mb-4" : "h-[250px] sm:h-[280px] md:h-[300px] w-full mt-4 mb-2"} 
            fullscreenBackground={false} 
          />

          {/* Action buttons - moved up slightly */}
          <div className={cn(
            "space-y-5", 
            isMobile ? "fixed bottom-40 left-4 right-4 z-50" : "mt-4" // Moved up by changing bottom-28 to bottom-40
          )}>
            {/* First row - Chat and Keep Going (now using our safe new component) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="w-full">
                <Button 
                  className={cn(
                    "w-full h-20 text-lg md:text-xl font-semibold flex items-center justify-center text-white rounded-lg",
                    "metallic-blue", // Apply metallic-blue to all device sizes
                    chatVibrating && "btn-vibrate"
                  )} 
                  size="lg"
                  onClick={() => {
                    try {
                      triggerVibration('chat');
                      // Clear notifications when navigating to chatbot
                      clearNotifications();
                      
                      // Ensure current user is stored properly for the chatbot page
                      if (user) {
                        localStorage.setItem('currentUser', JSON.stringify({
                          id: user.id,
                          name: user.name,
                          role: user.role
                        }));
                        console.log('Dashboard: Stored user data for chatbot:', user);
                      }

                      // Longer delay before navigation to allow full therapeutic gong sound and animation to complete
                      setTimeout(() => {
                        // Use React routing via wouter to maintain React context
                        try {
                          // Use Link programmatic navigation
                          window.history.pushState({}, '', '/enhanced-chatbot');
                          window.dispatchEvent(new Event('popstate'));
                        } catch (e) {
                          // Fallback to traditional navigation
                          window.location.href = '/enhanced-chatbot';
                        }
                      }, 3000);
                    } catch (error) {
                      console.error('Error navigating to chat:', error);
                      // Fallback navigation without delay
                      window.location.href = '/chatbot';
                    }
                  }}
                >
                  <div className="relative">
                    <MessageCircle className="h-6 w-6 mr-2 flex-shrink-0" />
                    <span>Chat</span>
                    {/* Notification badges */}
                    {(hasNewChatMessages || pendingMessageCount > 0) && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {pendingMessageCount > 0 ? pendingMessageCount : '!'}
                      </div>
                    )}
                    {!isOnline && pendingMessageCount > 0 && (
                      <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        <span className="text-[10px]">⏱</span>
                      </div>
                    )}
                  </div>
                </Button>
              </div>
              <div className="w-full">
                {/* Our new safer Keep Going component */}
                {user?.id && (
                  <KeepGoingFeature
                    userId={user.id}
                    overlayImage={motivationalImage}
                  />
                )}
              </div>
            </div>

            {/* Second row - Daily Self-Scores (full width) */}
            <div>
              <div className="w-full">
                <Button 
                  className={cn(
                    "w-full h-20 text-lg md:text-xl font-semibold flex items-center justify-center text-white rounded-lg",
                    "metallic-blue", // Apply metallic-blue to all device sizes
                    scoresVibrating && "btn-vibrate"
                  )} 
                  size="lg"
                  onClick={() => {
                    triggerVibration('scores');

                    // Longer delay before navigation to allow full therapeutic gong sound and animation to complete
                    setTimeout(() => {
                      try {
                        // Use wouter's setLocation for proper React navigation
                        setLocation('/profile');
                        console.log("Navigating to Daily Self-Scores (/profile)");
                      } catch (error) {
                        console.error("Navigation error:", error);
                        // Fallback to traditional navigation
                        window.location.href = '/profile';
                      }
                    }, 3000);
                  }}
                >
                  <BarChart className="h-6 w-6 mr-2 flex-shrink-0" />
                  <span>Daily Self-Scores</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Welcome text - moved to bottom */}
          <div className={cn(
            "mt-8 pt-4",
            isMobile ? "fixed bottom-6 left-4 right-4 bg-white/90 rounded-lg p-4 backdrop-blur-sm shadow-md z-40" : "border-t border-gray-100"
          )}>
            <h2 className={cn(
              "text-2xl font-bold mb-2", 
              isMobile ? "text-[#2E8BC0]" : "text-[#676767]" 
            )}>
              Welcome, {user?.name}!
            </h2>
            <p className={cn(
              "mb-2",
              isMobile ? "text-gray-700" : "text-[#a4a4a4]"
            )}>
              Let's keep your health on track today.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;