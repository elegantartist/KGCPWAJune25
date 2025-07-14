import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DailyHealthScore from "@/components/health/DailyHealthScore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth"; // Corrected import

const DailySelfScores: React.FC = () => {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { user, isLoading: isLoadingUser } = useAuth(); // Use the hook

  const userId = user?.id;

  // Get health metrics for the user
  const { data: healthMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: [`/api/users/${userId}/health-metrics`],
    enabled: !!userId,
  });

  if (isLoadingUser || isLoadingMetrics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  // Create a default health metric if none exists
  const defaultMetric = {
    id: 1,
    userId: userId || 1, // Fallback for safety
    medicationScore: 8,
    dietScore: 7,
    exerciseScore: 6,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const metricsArray = Array.isArray(healthMetrics) ? healthMetrics : [];
  const latestMetric = metricsArray.length > 0
    ? metricsArray[metricsArray.length - 1]
    : defaultMetric;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            className="flex items-center text-gray-600 hover:text-gray-900"
            onClick={() => setLocation('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Daily Self-Scores</h1>
          <p className="text-gray-600">Rate how well you're doing today on a scale of 1-10</p>
        </div>

        {/* Daily Health Score Component */}
        <DailyHealthScore metric={latestMetric} />

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">How to use Daily Self-Scores:</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="font-medium text-green-600 mr-2">•</span>
              <span><strong>Healthy Meal Plan:</strong> Rate how well you followed your nutrition goals today</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium text-blue-600 mr-2">•</span>
              <span><strong>Exercise and Wellness:</strong> Rate your physical activity and wellness practices</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium text-red-600 mr-2">•</span>
              <span><strong>Prescription Medication:</strong> Rate your adherence to prescribed medications</span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Your scores help the Keep Going Care system provide personalized recommendations and track your progress over time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailySelfScores;
