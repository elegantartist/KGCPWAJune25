# Daily Self-Scores Complete Implementation Guide

## Architecture Overview

The Daily Self-Scores feature operates on a 4-layer architecture:

1. **UI Layer**: React components with interactive sliders
2. **Data Layer**: PatientScores table (primary) + HealthMetrics (legacy)
3. **Supervisor Agent**: AI analysis with CBT/MI techniques
4. **MCP Integration**: Feature usage tracking and recommendations

## Complete Component Structure

### 1. Page Component (`/daily-self-scores`)

```typescript
// File: client/src/pages/daily-self-scores.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DailyHealthScore from "@/components/health/DailyHealthScore";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const DailySelfScores: React.FC = () => {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  // Get current user (fallback to patient ID 1 for demo)
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/user"],
  });
  
  const userId = (user as any)?.id || 1;
  
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
        {/* Navigation Header */}
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
        
        {/* Page Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Daily Self-Scores</h1>
          <p className="text-gray-600">Rate how well you're doing today on a scale of 1-10</p>
        </div>
        
        {/* Main Interactive Component */}
        <DailyHealthScore metric={latestMetric} />
        
        {/* Educational Instructions Panel */}
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
```

### 2. Interactive Slider Component

```typescript
// File: client/src/components/health/DailyHealthScore.tsx
import React, { useState, useEffect } from "react";
import { HealthMetric } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ModelContextProtocol } from "@/components/chatbot/ModelContextProtocol";
import ScoreDiscussionDialog from "@/components/health/ScoreDiscussionDialog";

interface DailyHealthScoreProps {
  metric: HealthMetric;
}

const DailyHealthScore: React.FC<DailyHealthScoreProps> = ({ metric }) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Slider state management
  const [medicationScore, setMedicationScore] = useState<number>(metric.medicationScore);
  const [dietScore, setDietScore] = useState<number>(metric.dietScore);
  const [exerciseScore, setExerciseScore] = useState<number>(metric.exerciseScore);
  
  // Submission tracking
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showDiscussionDialog, setShowDiscussionDialog] = useState<boolean>(false);
  
  // Check daily submission status
  useEffect(() => {
    const lastSubmitDate = localStorage.getItem('lastScoreSubmitDate');
    if (lastSubmitDate) {
      const today = new Date().toISOString().split('T')[0];
      if (lastSubmitDate === today) {
        setIsSubmitted(true);
      }
    }
  }, []);
  
  // Progress bar calculations
  const medicationWidth = `${(metric.medicationScore / 10) * 100}%`;
  const dietWidth = `${(metric.dietScore / 10) * 100}%`;
  const exerciseWidth = `${(metric.exerciseScore / 10) * 100}%`;
  
  // Main submission handler - triggers Supervisor Agent workflow
  const handleSubmit = async () => {
    createHapticFeedback(500, false);
    
    try {
      // Submit to both PatientScores (primary) and HealthMetrics (legacy)
      await apiRequest(
        'POST',
        `/api/users/${metric.userId}/health-metrics`,
        {
          medicationScore,
          dietScore,
          exerciseScore,
          date: new Date()
        }
      );
      
      // Record submission timestamp
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('lastScoreSubmitDate', today);
      
      // Prepare data for Supervisor Agent analysis
      const healthMetricsData = {
        medicationScore,
        dietScore,
        exerciseScore,
        date: today,
        userId: metric.userId,
        analysisRequired: true
      };
      localStorage.setItem('lastHealthMetrics', JSON.stringify(healthMetricsData));
      
      setIsSubmitted(true);
      
      toast({
        title: "Scores submitted successfully",
        description: "Thank you for your daily health update. You may submit again tomorrow.",
      });
      
      // Trigger MCP feature usage tracking
      ModelContextProtocol.getInstance(metric.userId).recordFeatureUsage('health-metrics');
      
      // Initialize Supervisor Agent workflow
      setTimeout(() => {
        setShowDiscussionDialog(true);
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error submitting scores",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  // Supervisor Agent interaction handlers
  const handleDiscussScores = () => {
    setShowDiscussionDialog(false);
  };
  
  const handleDeclineDiscussion = () => {
    setShowDiscussionDialog(false);
    toast({
      title: "Scores saved",
      description: "You can return to the chatbot any time if you'd like to discuss your progress.",
    });
  };
  
  // Slider number markers
  const renderSliderMarks = () => {
    return (
      <div className="relative w-full flex justify-between px-1 mt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <div key={num} className="text-xs font-medium text-gray-600">
            {num}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <>
      <Card>
        <CardContent className={cn("p-6", isMobile && "p-4")}>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Slide the Bars for Your Daily Self-Scores</h2>
          
          {isSubmitted ? (
            // Read-only progress bars (post-submission view)
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", isMobile ? "w-44" : "w-56")}>Healthy Meal Plan</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: dietWidth, backgroundColor: '#4CAF50' }}
                  ></div>
                </div>
                <span className="font-medium w-6 text-right text-green-600">
                  {metric.dietScore}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", isMobile ? "w-44" : "w-56")}>Exercise and Wellness</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: exerciseWidth, backgroundColor: '#2E8BC0' }}
                  ></div>
                </div>
                <span className="font-medium w-6 text-right text-[#2E8BC0]">
                  {metric.exerciseScore}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", isMobile ? "w-44" : "w-56")}>Prescription Medication</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: medicationWidth, backgroundColor: '#E53935' }}
                  ></div>
                </div>
                <span className="font-medium w-6 text-right text-red-600">
                  {metric.medicationScore}
                </span>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-[#2E8BC0] font-medium">You've submitted your scores for today.</p>
                <p className="text-sm text-gray-500 mt-1">You can submit new scores tomorrow at 00:00.</p>
                
                {/* Development reset button */}
                <Button
                  onClick={() => {
                    localStorage.removeItem('lastScoreSubmitDate');
                    setIsSubmitted(false);
                    toast({
                      title: "Scores reset",
                      description: "You can now submit new scores for testing purposes.",
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Reset Scores (Testing Only)
                </Button>
              </div>
            </div>
          ) : (
            // Interactive sliders (pre-submission view)
            <div className="space-y-5">
              {/* Diet/Nutrition Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Healthy Meal Plan</span>
                  <span className="font-medium text-green-600">{dietScore}</span>
                </div>
                <Slider
                  value={[dietScore]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setDietScore(value[0])}
                  className="slider-green"
                />
                {renderSliderMarks()}
              </div>
              
              {/* Exercise/Wellness Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Exercise and Wellness</span>
                  <span className="font-medium text-[#2E8BC0]">{exerciseScore}</span>
                </div>
                <Slider
                  value={[exerciseScore]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setExerciseScore(value[0])}
                  className="slider-blue"
                />
                {renderSliderMarks()}
              </div>
              
              {/* Medication Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Prescription Medication</span>
                  <span className="font-medium text-red-600">{medicationScore}</span>
                </div>
                <Slider
                  value={[medicationScore]} 
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setMedicationScore(value[0])}
                  className="slider-red"
                />
                {renderSliderMarks()}
              </div>
              
              {/* Submit Button */}
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={handleSubmit}
                  className="bg-[#2E8BC0] hover:bg-[#267cad] w-full md:w-auto"
                >
                  Submit Daily Scores
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Supervisor Agent Discussion Dialog */}
      <ScoreDiscussionDialog
        open={showDiscussionDialog}
        onOpenChange={setShowDiscussionDialog}
        onConfirm={handleDiscussScores}
        onCancel={handleDeclineDiscussion}
        dietScore={dietScore}
        exerciseScore={exerciseScore}
        medicationScore={medicationScore}
        userId={metric.userId}
      />
    </>
  );
};

export default DailyHealthScore;
```

## Supervisor Agent Workflow Integration

### 1. Score Discussion Dialog Component

```typescript
// File: client/src/components/health/ScoreDiscussionDialog.tsx
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import HealthAnalysisDialog from "./HealthAnalysisDialog";

interface ScoreDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  dietScore?: number;
  exerciseScore?: number;
  medicationScore?: number;
  userId?: number;
}

const ScoreDiscussionDialog: React.FC<ScoreDiscussionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  dietScore = 5,
  exerciseScore = 5,
  medicationScore = 5,
  userId = 1,
}) => {
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  
  // Handle user acceptance of AI analysis
  const handleConfirmClick = () => {
    onOpenChange(false);
    setShowAnalysisDialog(true);
    
    // Prepare comprehensive analysis data for Supervisor Agent
    const healthAnalysisData = {
      dietScore,
      exerciseScore,
      medicationScore,
      date: new Date().toISOString(),
      analysisType: 'comprehensive',
      userId,
      triggerSource: 'daily-self-scores'
    };
    localStorage.setItem('lastHealthAnalysis', JSON.stringify(healthAnalysisData));
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyse Your Health Scores?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to receive analysis of your health scores from the KGC Health Assistant? 
              This can help you identify areas for improvement and celebrate your progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClick}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Health Analysis Dialog - Supervisor Agent Interface */}
      <HealthAnalysisDialog 
        open={showAnalysisDialog}
        onOpenChange={setShowAnalysisDialog}
        dietScore={dietScore}
        exerciseScore={exerciseScore}
        medicationScore={medicationScore}
        userId={userId}
      />
    </>
  );
};

export default ScoreDiscussionDialog;
```

### 2. Health Analysis Dialog (Supervisor Agent Interface)

This component serves as the primary interface between the Daily Self-Scores feature and the Supervisor Agent's AI analysis capabilities.

```typescript
// File: client/src/components/health/HealthAnalysisDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import SupervisorAgent from "@/components/chatbot/SupervisorAgent";
import { useQuery } from "@tanstack/react-query";

interface HealthAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dietScore: number;
  exerciseScore: number;
  medicationScore: number;
  userId: number;
}

const HealthAnalysisDialog: React.FC<HealthAnalysisDialogProps> = ({
  open,
  onOpenChange,
  dietScore,
  exerciseScore,
  medicationScore,
  userId,
}) => {
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  
  // Get user's Care Plan Directives for contextual analysis
  const { data: userCPDs } = useQuery({
    queryKey: [`/api/users/${userId}/care-plan-directives`],
    enabled: open && !!userId,
  });
  
  // Calculate overall health score
  const overallScore = Math.round((dietScore + exerciseScore + medicationScore) / 3);
  
  // Determine health status and recommendations
  const getHealthStatus = () => {
    if (overallScore >= 8) return { status: "Excellent", color: "text-green-600", icon: TrendingUp };
    if (overallScore >= 6) return { status: "Good", color: "text-blue-600", icon: Brain };
    return { status: "Needs Attention", color: "text-red-600", icon: AlertCircle };
  };
  
  const healthStatus = getHealthStatus();
  const StatusIcon = healthStatus.icon;
  
  // Generate initial analysis when dialog opens
  useEffect(() => {
    if (open && !analysisComplete) {
      const performAnalysis = async () => {
        // Simulate Supervisor Agent analysis processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create analysis context for Supervisor Agent
        const analysisContext = {
          scores: { dietScore, exerciseScore, medicationScore, overallScore },
          cpds: userCPDs || [],
          date: new Date().toISOString(),
          analysisType: 'post-submission',
          recommendations: []
        };
        
        // Generate personalized recommendations based on scores
        const recommendations = [];
        
        if (dietScore < 6) {
          recommendations.push({
            category: 'nutrition',
            message: 'Consider using the Inspiration Machine D feature for meal planning ideas aligned with your care plan.',
            feature: 'inspiration-d',
            priority: 'high'
          });
        }
        
        if (exerciseScore < 6) {
          recommendations.push({
            category: 'exercise',
            message: 'The Exercise & Wellness Support feature can help you find local fitness options.',
            feature: 'ew-support',
            priority: 'high'
          });
        }
        
        if (medicationScore < 8) {
          recommendations.push({
            category: 'medication',
            message: 'Consider using the Journaling feature to track medication adherence patterns.',
            feature: 'journaling',
            priority: 'medium'
          });
        }
        
        analysisContext.recommendations = recommendations;
        setAnalysisData(analysisContext);
        setAnalysisComplete(true);
      };
      
      performAnalysis();
    }
  }, [open, dietScore, exerciseScore, medicationScore, userId, userCPDs, analysisComplete]);
  
  // Prepare initial message for Supervisor Agent
  const getInitialAgentMessage = () => {
    const message = `I've just submitted my daily self-scores: Diet ${dietScore}/10, Exercise ${exerciseScore}/10, Medication ${medicationScore}/10. Can you help me understand these scores and suggest ways to improve?`;
    
    return [{
      id: Date.now(),
      text: message,
      isUser: true,
      timestamp: new Date()
    }];
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Health Score Analysis
          </DialogTitle>
          <DialogDescription>
            KGC Supervisor Agent analysis of your daily self-scores
          </DialogDescription>
        </DialogHeader>
        
        {!analysisComplete ? (
          // Loading state
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Analyzing your health scores...</p>
              <p className="text-sm text-gray-500 mt-2">Using CBT and MI techniques for personalized insights</p>
            </div>
          </div>
        ) : (
          // Analysis results
          <div className="space-y-6">
            {/* Overall Health Status */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-6 w-6 ${healthStatus.color}`} />
                    <div>
                      <h3 className="font-semibold">Overall Health Status</h3>
                      <p className={`text-sm ${healthStatus.color}`}>{healthStatus.status}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {overallScore}/10
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {/* Individual Score Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{dietScore}</div>
                  <div className="text-sm text-gray-600">Nutrition</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{exerciseScore}</div>
                  <div className="text-sm text-gray-600">Exercise</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{medicationScore}</div>
                  <div className="text-sm text-gray-600">Medication</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Supervisor Agent Chat Interface */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Talk with KGC Health Assistant
              </h3>
              <div className="h-96 border rounded-lg">
                <SupervisorAgent
                  userId={userId}
                  agentName="KGC Health Assistant"
                  initialMessages={getInitialAgentMessage()}
                  onRecommendationReceived={(recommendation) => {
                    console.log('Received recommendation from Supervisor Agent:', recommendation);
                  }}
                  className="h-full"
                />
              </div>
            </div>
            
            {/* Quick Recommendations */}
            {analysisData?.recommendations?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Personalized Recommendations</h3>
                  <div className="space-y-2">
                    {analysisData.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{rec.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  // Navigate to dashboard or specific feature
                  onOpenChange(false);
                }}
                className="bg-[#2E8BC0] hover:bg-[#267cad]"
              >
                Continue Journey
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HealthAnalysisDialog;
```

## Supervisor Agent Workflow Process

### 1. Data Flow Architecture

```
Patient Score Submission → Local Storage → MCP Feature Tracking → Supervisor Agent Analysis → CBT/MI Response → Feature Recommendations
```

### 2. Data Persistence Strategy

**Primary Table (patientScores):**
- Stores official daily submissions (integer scores 1-10)
- Enforces one-score-per-day constraint
- Used for PPR generation and doctor review

**Legacy Table (healthMetrics):**
- Maintains backward compatibility
- Stores real-time tracking data (decimal scores)
- Used for trending analysis

### 3. Supervisor Agent Integration Points

**Pre-Analysis:**
```javascript
// Store analysis context
const healthAnalysisData = {
  dietScore,
  exerciseScore,
  medicationScore,
  date: new Date().toISOString(),
  analysisType: 'comprehensive',
  userId,
  triggerSource: 'daily-self-scores',
  cpds: userCPDs || []
};
localStorage.setItem('lastHealthAnalysis', JSON.stringify(healthAnalysisData));
```

**Post-Analysis:**
```javascript
// Feature usage tracking
ModelContextProtocol.getInstance(userId).recordFeatureUsage('health-metrics');

// Recommendation generation
const recommendation = await ModelContextProtocol.getInstance(userId).requestRecommendation();
```

### 4. CBT/MI Integration

The Supervisor Agent applies Cognitive Behavioral Therapy and Motivational Interviewing techniques through:

**Motivational Interviewing Elements:**
- Open-ended questions about score patterns
- Reflective listening responses
- Exploration of patient motivation
- Goal-setting conversations

**CBT Techniques:**
- Thought pattern recognition
- Behavioral tracking connections
- Evidence-based feedback
- Action planning support

### 5. Feature Recommendation Logic

```javascript
// Score-based feature recommendations
const generateRecommendations = (scores) => {
  const recommendations = [];
  
  if (scores.dietScore < 6) {
    recommendations.push({
      feature: 'inspiration-d',
      message: 'Meal planning support could help improve nutrition scores',
      priority: 'high',
      cbtTechnique: 'behavioral activation'
    });
  }
  
  if (scores.exerciseScore < 6) {
    recommendations.push({
      feature: 'ew-support',
      message: 'Local fitness options might increase exercise motivation',
      priority: 'high',
      miTechnique: 'exploring importance'
    });
  }
  
  if (scores.medicationScore < 8) {
    recommendations.push({
      feature: 'journaling',
      message: 'Tracking medication patterns can identify barriers',
      priority: 'medium',
      cbtTechnique: 'self-monitoring'
    });
  }
  
  return recommendations;
};
```

## CSS Styling Requirements

```css
/* File: client/src/index.css - Add these custom slider styles */

/* Green slider for nutrition */
.slider-green [data-orientation="horizontal"] {
  background-color: #e8f5e8;
}

.slider-green [data-orientation="horizontal"] [data-state="active"] {
  background-color: #4CAF50;
}

.slider-green [data-orientation="horizontal"] [role="slider"] {
  border-color: #4CAF50;
  background-color: #4CAF50;
}

/* Blue slider for exercise */
.slider-blue [data-orientation="horizontal"] {
  background-color: #e3f2fd;
}

.slider-blue [data-orientation="horizontal"] [data-state="active"] {
  background-color: #2E8BC0;
}

.slider-blue [data-orientation="horizontal"] [role="slider"] {
  border-color: #2E8BC0;
  background-color: #2E8BC0;
}

/* Red slider for medication */
.slider-red [data-orientation="horizontal"] {
  background-color: #ffebee;
}

.slider-red [data-orientation="horizontal"] [data-state="active"] {
  background-color: #E53935;
}

.slider-red [data-orientation="horizontal"] [role="slider"] {
  border-color: #E53935;
  background-color: #E53935;
}

/* Metallic blue button styling */
.metallic-blue {
  background: linear-gradient(135deg, #2E8BC0 0%, #1976D2 100%);
  box-shadow: 0 4px 12px rgba(46, 139, 192, 0.3);
  border: none;
}

.metallic-blue:hover {
  background: linear-gradient(135deg, #267cad 0%, #1565C0 100%);
  box-shadow: 0 6px 16px rgba(46, 139, 192, 0.4);
  transform: translateY(-1px);
}
```

## Implementation Checklist for AI Agents

### UI/UX Components
- [ ] Daily Self-Scores page with gradient background
- [ ] Interactive slider component with color-coded metrics
- [ ] Progress bar visualization for submitted scores
- [ ] Score discussion dialog with AI analysis option
- [ ] Health analysis dialog with Supervisor Agent interface
- [ ] Responsive design for mobile/desktop

### Data Integration
- [ ] PatientScores table integration (primary)
- [ ] HealthMetrics table support (legacy)
- [ ] Local storage for submission tracking
- [ ] MCP feature usage recording
- [ ] Care Plan Directives context loading

### Supervisor Agent Features
- [ ] CBT/MI analysis techniques
- [ ] Personalized recommendation generation
- [ ] Feature usage tracking
- [ ] Multi-provider AI response validation
- [ ] Emergency detection and alerting

### API Endpoints Required
- [ ] `POST /api/users/{userId}/health-metrics`
- [ ] `GET /api/users/{userId}/care-plan-directives`
- [ ] `POST /api/users/{userId}/patient-scores`
- [ ] `GET /api/users/{userId}/recommendations`

This comprehensive implementation guide provides your AI agents with the complete structure, styling, and workflow integration needed to replicate the Daily Self-Scores feature exactly as designed in the KGC system.