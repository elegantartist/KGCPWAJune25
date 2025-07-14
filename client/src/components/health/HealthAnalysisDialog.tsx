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

        // Generate personalized recommendations based on scores using CBT/MI principles
        const recommendations = [];

        if (dietScore < 6) {
          recommendations.push({
            category: 'nutrition',
            message: 'Consider using the Inspiration Machine D feature for meal planning ideas aligned with your care plan.',
            feature: 'inspiration-d',
            priority: 'high',
            cbtTechnique: 'behavioral activation',
            miApproach: 'exploring importance of nutrition goals'
          });
        }

        if (exerciseScore < 6) {
          recommendations.push({
            category: 'exercise',
            message: 'The Exercise & Wellness Support feature can help you find local fitness options that match your preferences.',
            feature: 'ew-support',
            priority: 'high',
            cbtTechnique: 'activity scheduling',
            miApproach: 'building confidence in exercise abilities'
          });
        }

        if (medicationScore < 8) {
          recommendations.push({
            category: 'medication',
            message: 'Consider using the Journaling feature to track medication adherence patterns and identify any barriers.',
            feature: 'journaling',
            priority: 'medium',
            cbtTechnique: 'self-monitoring',
            miApproach: 'resolving ambivalence about medication importance'
          });
        }

        // Add positive reinforcement for high scores
        if (overallScore >= 7) {
          recommendations.push({
            category: 'achievement',
            message: 'Great progress! Check the Progress Milestones feature to see what rewards you\'ve earned.',
            feature: 'progress-milestones',
            priority: 'low',
            cbtTechnique: 'positive reinforcement',
            miApproach: 'affirming progress and building motivation'
          });
        }

        analysisContext.recommendations = recommendations;
        setAnalysisData(analysisContext);
        setAnalysisComplete(true);
      };
      
      performAnalysis();
    }
  }, [open, dietScore, exerciseScore, medicationScore, userId, userCPDs, analysisComplete]);

  // Reset analysis when dialog closes
  useEffect(() => {
    if (!open) {
      setAnalysisComplete(false);
      setAnalysisData(null);
    }
  }, [open]);

  // Prepare initial message for Supervisor Agent with CBT/MI framing
  const getInitialAgentMessage = () => {
    const scoreDescription = [];
    if (dietScore >= 7) scoreDescription.push("good nutrition adherence");
    else scoreDescription.push("room for nutrition improvement");

    if (exerciseScore >= 7) scoreDescription.push("strong exercise commitment");
    else scoreDescription.push("exercise motivation opportunities");

    if (medicationScore >= 8) scoreDescription.push("excellent medication adherence");
    else scoreDescription.push("medication consistency challenges");

    const message = `I've just submitted my daily self-scores: Diet ${dietScore}/10, Exercise ${exerciseScore}/10, Medication ${medicationScore}/10. I notice ${scoreDescription.join(", ")}. Can you help me understand these patterns and explore ways to build on my strengths while addressing any challenges?`;

    return [{
      id: Date.now(),
      text: message,
      isUser: true,
      timestamp: new Date()
    }];
  };

  // Get appropriate congratulatory message based on scores
  const getCongratulationMessage = () => {
    if (overallScore >= 8) {
      return "Excellent work! Your commitment to your health journey is evident in these strong scores.";
    } else if (overallScore >= 6) {
      return "Good progress! You're building positive health habits that will serve you well.";
    } else {
      return "Thank you for your honesty in scoring. This awareness is an important first step toward positive change.";
    }
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
            KGC Supervisor Agent analysis of your daily self-scores using CBT and MI techniques
          </DialogDescription>
        </DialogHeader>
        
        {!analysisComplete ? (
          // Loading state with educational content
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 mb-2">Analyzing your health scores...</p>
              <p className="text-sm text-gray-500">Using Cognitive Behavioral Therapy and Motivational Interviewing techniques to provide personalized insights that build on your strengths and address challenges with compassion.</p>
            </div>
          </div>
        ) : (
          // Analysis results
          <div className="space-y-6">
            {/* Motivational Header */}
            <Card className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardContent className="p-4">
                <p className="text-center text-gray-700 italic">{getCongratulationMessage()}</p>
              </CardContent>
            </Card>

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

            {/* Individual Score Breakdown with CBT insights */}
            <div className="grid grid-cols-3 gap-4">
              <Card className={dietScore >= 7 ? "ring-2 ring-green-200" : ""}>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{dietScore}</div>
                  <div className="text-sm text-gray-600 mb-2">Nutrition</div>
                  <div className="text-xs text-gray-500">
                    {dietScore >= 7 ? "Strong foundation" : "Growth opportunity"}
                  </div>
                </CardContent>
              </Card>
              <Card className={exerciseScore >= 7 ? "ring-2 ring-blue-200" : ""}>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{exerciseScore}</div>
                  <div className="text-sm text-gray-600 mb-2">Exercise</div>
                  <div className="text-xs text-gray-500">
                    {exerciseScore >= 7 ? "Building momentum" : "Ready for support"}
                  </div>
                </CardContent>
              </Card>
              <Card className={medicationScore >= 8 ? "ring-2 ring-red-200" : ""}>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{medicationScore}</div>
                  <div className="text-sm text-gray-600 mb-2">Medication</div>
                  <div className="text-xs text-gray-500">
                    {medicationScore >= 8 ? "Excellent adherence" : "Worth exploring"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Supervisor Agent Chat Interface */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Discuss with KGC Health Assistant
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Your health assistant uses evidence-based therapeutic approaches to help you explore your health journey with empathy and practical guidance.
              </p>
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

            {/* Personalized Recommendations with CBT/MI Context */}
            {analysisData?.recommendations?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    Personalized Next Steps
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Based on your scores, here are some features that might support your health journey:
                  </p>
                  <div className="space-y-3">
                    {analysisData.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-gray-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{rec.message}</p>
                            {rec.cbtTechnique && (
                              <p className="text-xs text-gray-500 mt-1">
                                Approach: {rec.cbtTechnique} • {rec.miApproach}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Therapeutic Reflection Questions */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Reflection Questions</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• What do you notice about the pattern of your scores today?</p>
                  <p>• Which area feels most manageable to focus on next?</p>
                  <p>• What has worked well for you in the past with similar challenges?</p>
                  <p>• How important is it to you to make changes in these areas?</p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  These questions use Motivational Interviewing principles to help you explore your own motivation and readiness for change.
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                Analysis uses CBT and MI evidence-based approaches
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // Store the analysis for future reference
                    localStorage.setItem('lastHealthAnalysisResult', JSON.stringify({
                      ...analysisData,
                      viewedAt: new Date().toISOString()
                    }));
                    onOpenChange(false);
                  }}
                  className="bg-[#2E8BC0] hover:bg-[#267cad]"
                >
                  Continue Journey
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HealthAnalysisDialog;
