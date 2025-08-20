import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DailyHealthScore from "@/components/health/DailyHealthScore";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Target, TrendingUp, Activity } from "lucide-react";
import { useLocation } from "wouter";

const DailySelfScores: React.FC = () => {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [submittedScores, setSubmittedScores] = useState<{medication: number; diet: number; exercise: number} | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  
  // Get current user (fallback to patient ID 2 for demo)
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/user"],
  });
  
  const userId = (user as any)?.id || 2; // Fallback to Reuben Collins (Patient)
  
  // Get user's Care Plan Directives for feature recommendations
  const { data: cpds, isLoading: isLoadingCPDs } = useQuery({
    queryKey: [`/api/users/${userId}/care-plan-directives/active`],
    enabled: !!userId,
  });
  
  // Get health metrics for the user
  const { data: healthMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: [`/api/users/${userId}/health-metrics`],
    enabled: !!userId,
  });
  
  if (isLoadingUser || isLoadingMetrics || isLoadingCPDs) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }
  
  // Generate KGC feature recommendations based on CPDs and scores
  const getKGCFeatureRecommendations = (scores: {medication: number; diet: number; exercise: number}) => {
    const recommendations = [];
    const cpdArray = Array.isArray(cpds) ? cpds : [];
    
    // Diet-based recommendations
    if (scores.diet < 8) {
      const dietCPD = cpdArray.find(cpd => cpd.category === 'diet');
      if (dietCPD) {
        recommendations.push({
          feature: 'Inspiration Machine D',
          reason: `Your meal planning score is ${scores.diet}/10. This feature provides personalized meal recommendations aligned with your doctor's directive: "${dietCPD.directive}"`,
          route: '/inspiration-d',
          icon: '🍽️',
          priority: scores.diet < 6 ? 'High' : 'Medium'
        });
        
        recommendations.push({
          feature: 'Food Database',
          reason: 'Explore nutritional information for Australian foods to support your healthy eating goals.',
          route: '/food-database',
          icon: '📊',
          priority: 'Medium'
        });
      }
    }
    
    // Exercise-based recommendations
    if (scores.exercise < 8) {
      const exerciseCPD = cpdArray.find(cpd => cpd.category === 'exercise');
      if (exerciseCPD) {
        recommendations.push({
          feature: 'Exercise & Wellness Support',
          reason: `Your exercise score is ${scores.exercise}/10. Find local fitness options and wellness activities that match your doctor's plan: "${exerciseCPD.directive}"`,
          route: '/ew-support',
          icon: '💪',
          priority: scores.exercise < 6 ? 'High' : 'Medium'
        });
      }
    }
    
    // Medication-based recommendations
    if (scores.medication < 9) {
      const medicationCPD = cpdArray.find(cpd => cpd.category === 'medication');
      if (medicationCPD) {
        recommendations.push({
          feature: 'MBP Wizard',
          reason: `Your medication adherence score is ${scores.medication}/10. Compare medication prices and set up adherence reminders in line with: "${medicationCPD.directive}"`,
          route: '/mbp-wiz',
          icon: '💊',
          priority: scores.medication < 7 ? 'High' : 'Medium'
        });
        
        recommendations.push({
          feature: 'Journaling',
          reason: 'Track your medication experiences and identify any barriers to consistent adherence.',
          route: '/journaling',
          icon: '📝',
          priority: 'Low'
        });
      }
    }
    
    // Always recommend Progress Milestones for tracking
    const overallScore = Math.round((scores.medication + scores.diet + scores.exercise) / 3);
    if (overallScore >= 7) {
      recommendations.push({
        feature: 'Progress Milestones',
        reason: `Great scores! Check your achievement badges and progress toward your $100 healthy experiences voucher.`,
        route: '/progress-milestones',
        icon: '🏆',
        priority: 'Medium'
      });
    }
    
    return recommendations;
  };
  
  // Create a default health metric if none exists
  const defaultMetric = {
    id: 1,
    userId: userId,
    medicationScore: 8,
    dietScore: 7,
    exerciseScore: 6,
    date: new Date(),
    createdAt: new Date()
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
        <DailyHealthScore 
          metric={latestMetric}
          userId={userId}
          onScoreSubmit={(scores: { medication: number; diet: number; exercise: number }) => {
            // Store submitted scores and show simple summary
            setSubmittedScores(scores);
            setShowSummary(true);
          }}
          isSubmitting={false}
        />
        
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
        
        {/* Simple Score Summary and CPD-Based Recommendations */}
        {showSummary && submittedScores && (
          <>
            {/* Score Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Target className="h-5 w-5" />
                  Today's Score Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{submittedScores.diet}</div>
                    <div className="text-sm text-green-600">Healthy Meal Plan</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{submittedScores.exercise}</div>
                    <div className="text-sm text-blue-600">Exercise & Wellness</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">{submittedScores.medication}</div>
                    <div className="text-sm text-red-600">Prescription Medication</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
                  <div className="text-lg font-semibold text-gray-800">
                    Overall Score: {Math.round((submittedScores.medication + submittedScores.diet + submittedScores.exercise) / 3)}/10
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {Math.round((submittedScores.medication + submittedScores.diet + submittedScores.exercise) / 3) >= 8 
                      ? "Excellent work! Keep up the great progress." 
                      : Math.round((submittedScores.medication + submittedScores.diet + submittedScores.exercise) / 3) >= 6
                      ? "Good progress! Consider the recommendations below."
                      : "Focus on the KGC features below to improve your health journey."
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KGC Feature Recommendations Based on CPDs */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <TrendingUp className="h-5 w-5" />
                  KGC Feature Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getKGCFeatureRecommendations(submittedScores).map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      rec.priority === 'High' ? 'border-red-500 bg-red-50' : 
                      rec.priority === 'Medium' ? 'border-yellow-500 bg-yellow-50' : 
                      'border-green-500 bg-green-50'
                    }`} onClick={() => setLocation(rec.route)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{rec.icon}</span>
                            <h4 className="font-semibold text-gray-800">{rec.feature}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              rec.priority === 'High' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{rec.reason}</p>
                        </div>
                        <Activity className="h-5 w-5 text-gray-400 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
                
                {getKGCFeatureRecommendations(submittedScores).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-semibold">Excellent scores!</p>
                    <p className="text-sm">You're doing great with your health goals. Keep up the momentum!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default DailySelfScores;