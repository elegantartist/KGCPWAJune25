import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PatientProfile from "@/components/patient/PatientProfile";
import HealthProgressChart from "@/components/health/HealthProgressChart";
import DailyHealthScore from "@/components/health/DailyHealthScore";
import HealthInspiration from "@/components/health/HealthInspiration";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";

const Profile: React.FC = () => {
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/user"],
  });
  
  const { data: healthMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: [user ? `/api/users/${user.id}/health-metrics` : null],
    enabled: !!user && !!user.id,
  });
  
  const isMobile = useIsMobile();
  
  if (isLoadingUser || isLoadingMetrics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[180px] w-full" />
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }
  
  if (!user || !healthMetrics || !Array.isArray(healthMetrics) || healthMetrics.length === 0) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-gray-800">No data available</h2>
        <p className="text-gray-600 mt-2">User profile or health metrics not found.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-3">
        <Button 
          variant="outline" 
          className="flex items-center text-gray-600 hover:text-gray-900"
          onClick={(e) => {
            e.preventDefault(); // Prevent any default behavior
            
            // Direct approach - Store the current user role as admin in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
              id: 1, // Admin ID 
              name: 'Admin User',
              role: 'admin'
            }));
            
            // Clear any previous data from session storage that might interfere
            sessionStorage.clear();
            
            // Direct URL navigation using multiple approaches to ensure it works
            try {
              console.log("Navigating to Admin Dashboard");
              
              // Use the most direct method - doesn't rely on React router
              document.location.href = '/admin-dashboard';
              
              // Failsafe approach
              setTimeout(() => {
                // If we're still not on the admin dashboard, try a direct reload
                if (window.location.pathname !== '/admin-dashboard') {
                  console.log("Failsafe navigation to Admin Dashboard");
                  window.location.replace('/admin-dashboard');
                }
              }, 200);
            } catch (error) {
              console.error("Navigation failed:", error);
              // Final fallback - hardcoded URL
              window.location.href = '/admin-dashboard';
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to Admin
        </Button>
      </div>
      <PatientProfile user={user} />
      
      {/* Desktop: Two columns layout */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <HealthProgressChart metrics={healthMetrics} />
          </div>
          <div>
            <HealthInspiration />
          </div>
        </div>
      )}
      
      {/* Mobile: Stack vertically */}
      {isMobile && (
        <>
          <HealthProgressChart metrics={healthMetrics} />
          <HealthInspiration />
        </>
      )}
      
      <DailyHealthScore metric={healthMetrics[0]} />
    </div>
  );
};

export default Profile;
