/**
 * Patient Dashboard - MCP Architecture
 * 
 * This dashboard is now powered by the Model Context Protocol (MCP) architecture
 * where all KGC features are server-side "tools" that the client-side MCP host
 * agent coordinates to provide an enhanced patient experience focused on the
 * prime directive: ensuring patients consistently comply with CPDs and honestly
 * self-score 8-10 through CBT and MI techniques.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, 
  Brain, 
  Utensils, 
  Activity, 
  Pill, 
  MessageCircle, 
  Target,
  TrendingUp,
  Star,
  Lightbulb,
  Play,
  Info
} from 'lucide-react';
import { useMCPHost } from '@/hooks/useMCPHost';
import { DailyScoreReminderToast } from '@/components/patient/DailyScoreReminderToast';
import { apiRequest } from '@/lib/queryClient';
import OrientationVideo from '@/components/orientation/OrientationVideo';

// Types for MCP responses
interface MCPInsight {
  type: 'cbt' | 'motivational' | 'cpd_alignment' | 'recommendation';
  content: string;
  urgency: 'low' | 'medium' | 'high';
  relatedFeature?: string;
}

interface DashboardData {
  healthMetrics: any;
  cpdCompliance: any;
  insights: MCPInsight[];
  recommendations: string[];
  suggestedFeatures: any[];
}

export default function PatientDashboard() {
  const [userQuery, setUserQuery] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOrientationVideo, setShowOrientationVideo] = useState(false);
  const { toast } = useToast();

  // Get user session data
  const { data: sessionData } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const userId = sessionData?.id || 2; // Default to Reuben Collins for demo

  // Get patient details for personalized welcome
  const { data: patientData } = useQuery({
    queryKey: ['/api/patient/profile', userId],
    queryFn: async () => {
      const res = await fetch(`/api/patient/profile?patientId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch patient profile');
      return res.json();
    },
    retry: false,
  });

  // Initialize MCP Host
  const {
    isConnected,
    isInitialized,
    error: mcpError,
    availableTools,
    processPatientQuery,
    getHealthMetrics,
    getHealthTrends,
    callTool
  } = useMCPHost(userId);

  /**
   * Load initial dashboard data using MCP tools
   */
  useEffect(() => {
    if (isConnected && isInitialized) {
      loadDashboardData();
    }
  }, [isConnected, isInitialized]);

  const loadDashboardData = async () => {
    try {
      setIsProcessing(true);

      // Use multiple MCP tools to gather dashboard data
      const [healthMetrics, healthTrends, cpdStatus] = await Promise.allSettled([
        getHealthMetrics(),
        getHealthTrends('7days'),
        callTool('care-plan-directives', { action: 'get_status' })
      ]);

      // Process results and generate insights
      const dashboardContext = {
        healthMetrics: healthMetrics.status === 'fulfilled' ? healthMetrics.value : null,
        healthTrends: healthTrends.status === 'fulfilled' ? healthTrends.value : null,
        cpdStatus: cpdStatus.status === 'fulfilled' ? cpdStatus.value : null
      };

      // Generate initial CBT and MI insights based on current state
      const insights = await generateInitialInsights(dashboardContext);

      setDashboardData({
        healthMetrics: dashboardContext.healthMetrics,
        cpdCompliance: dashboardContext.cpdStatus,
        insights,
        recommendations: extractRecommendations(dashboardContext),
        suggestedFeatures: extractFeatureSuggestions(dashboardContext)
      });

    } catch (error) {
      console.error('[Patient Dashboard] Error loading data:', error);
      toast({
        title: "Dashboard Loading Error",
        description: "Some dashboard features may not be available. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Process patient query through MCP architecture
   */
  const handlePatientQuery = async () => {
    if (!userQuery.trim() || !isConnected) return;

    try {
      setIsProcessing(true);

      // Process query through MCP host agent
      const response = await processPatientQuery(userQuery, {
        currentDashboardData: dashboardData,
        primeDirective: 'cpd_compliance_and_honest_scoring'
      });

      // Update dashboard with new insights and recommendations
      if (response.toolResults && response.toolResults.length > 0) {
        const newInsights = generateInsightsFromResponse(response);
        
        setDashboardData(prev => prev ? {
          ...prev,
          insights: [...prev.insights, ...newInsights],
          recommendations: [...prev.recommendations, ...response.recommendations],
          suggestedFeatures: [...prev.suggestedFeatures, ...response.suggestedFeatures]
        } : null);

        toast({
          title: "Query Processed",
          description: `Found ${response.toolResults.length} relevant insights for your question.`
        });
      }

      setUserQuery(''); // Clear input

    } catch (error) {
      console.error('[Patient Dashboard] Query processing error:', error);
      toast({
        title: "Query Processing Error",
        description: "Unable to process your question. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Quick action handlers using MCP tools
   */
  const handleQuickAction = async (action: string) => {
    try {
      setIsProcessing(true);

      let response;
      switch (action) {
        case 'daily_scores':
          response = await callTool('health-metrics', { 
            action: 'get_latest',
            motivationalPrompt: true 
          });
          break;
        case 'meal_ideas':
          response = await callTool('inspiration-machine-d', { 
            action: 'get_ideas',
            motivationLevel: 'medium' 
          });
          break;
        case 'medication_help':
          response = await callTool('mbp-wizard', { 
            action: 'analyze_adherence',
            generateMotivation: true 
          });
          break;
        case 'progress_check':
          response = await callTool('progress-milestones', { 
            action: 'get_status',
            includeRewards: true 
          });
          break;
        default:
          return;
      }

      if (response) {
        const newInsights = generateInsightsFromToolResponse(action, response);
        
        setDashboardData(prev => prev ? {
          ...prev,
          insights: [...prev.insights, ...newInsights]
        } : null);

        toast({
          title: "Action Completed",
          description: `Generated new insights for ${action.replace('_', ' ')}.`
        });
      }

    } catch (error) {
      console.error('[Patient Dashboard] Quick action error:', error);
      toast({
        title: "Action Error",
        description: "Unable to complete action. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Initializing your personalized health assistant...</p>
          {mcpError && (
            <p className="mt-2 text-red-600">Connection error: {mcpError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Connection Status Only */}
      <div className="flex justify-end items-center">
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant="outline">
            {availableTools.length} Tools Available
          </Badge>
        </div>
      </div>

      {/* MCP Query Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>Ask Your Health Assistant</span>
          </CardTitle>
          <CardDescription>
            Ask questions about your health goals, medications, diet, exercise, or get personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: How can I improve my diet scores? What meals align with my care plan? How am I progressing with my medication adherence?"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            rows={3}
          />
          <div className="flex space-x-2">
            <Button 
              onClick={handlePatientQuery}
              disabled={!userQuery.trim() || isProcessing}
              className="flex-1"
            >
              {isProcessing ? "Processing..." : "Get Personalized Insights"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get instant insights and support for your health goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => handleQuickAction('daily_scores')}
              disabled={isProcessing}
              className="h-20 flex flex-col items-center space-y-1"
            >
              <Target className="w-6 h-6" />
              <span className="text-sm">Daily Scores</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickAction('meal_ideas')}
              disabled={isProcessing}
              className="h-20 flex flex-col items-center space-y-1"
            >
              <Utensils className="w-6 h-6" />
              <span className="text-sm">Meal Ideas</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickAction('medication_help')}
              disabled={isProcessing}
              className="h-20 flex flex-col items-center space-y-1"
            >
              <Pill className="w-6 h-6" />
              <span className="text-sm">Medication</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickAction('progress_check')}
              disabled={isProcessing}
              className="h-20 flex flex-col items-center space-y-1"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Progress</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Data Display */}
      {dashboardData && (
        <>
          {/* Health Metrics Overview */}
          {dashboardData.healthMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>Your Current Health Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {dashboardData.healthMetrics.currentMetrics?.medicationScore || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-600">Medication Score</p>
                    <Progress 
                      value={(dashboardData.healthMetrics.currentMetrics?.medicationScore || 0) * 10} 
                      className="mt-2" 
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardData.healthMetrics.currentMetrics?.dietScore || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-600">Diet Score</p>
                    <Progress 
                      value={(dashboardData.healthMetrics.currentMetrics?.dietScore || 0) * 10} 
                      className="mt-2" 
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {dashboardData.healthMetrics.currentMetrics?.exerciseScore || 'N/A'}
                    </div>
                    <p className="text-sm text-gray-600">Exercise Score</p>
                    <Progress 
                      value={(dashboardData.healthMetrics.currentMetrics?.exerciseScore || 0) * 10} 
                      className="mt-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI-Generated Insights */}
          {dashboardData.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>Personalized Insights</span>
                </CardTitle>
                <CardDescription>
                  CBT and motivational insights tailored to your progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.insights.slice(0, 5).map((insight, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Badge variant={
                        insight.urgency === 'high' ? 'destructive' : 
                        insight.urgency === 'medium' ? 'default' : 'secondary'
                      }>
                        {insight.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{insight.content}</p>
                        {insight.relatedFeature && (
                          <p className="text-xs text-gray-500 mt-1">
                            Related: {insight.relatedFeature}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {dashboardData.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>Today's Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dashboardData.recommendations.slice(0, 5).map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggested Features */}
          {dashboardData.suggestedFeatures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested KGC Features</CardTitle>
                <CardDescription>
                  Personalized feature recommendations based on your current needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.suggestedFeatures.slice(0, 4).map((feature, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-semibold">{feature.feature}</h4>
                      <p className="text-sm text-gray-600 mt-1">{feature.reason}</p>
                      <Badge 
                        variant={feature.urgency === 'high' ? 'destructive' : 'default'}
                        className="mt-2"
                      >
                        {feature.urgency} priority
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-center">Processing your request...</p>
          </div>
        </div>
      )}

      {/* Daily Score Reminder Toast Component */}
      <DailyScoreReminderToast userId={2} enabled={true} />
    </div>
  );
}

/**
 * Helper Functions for MCP Integration
 */

async function generateInitialInsights(dashboardContext: any): Promise<MCPInsight[]> {
  const insights: MCPInsight[] = [];

  if (dashboardContext.healthMetrics?.currentMetrics) {
    const metrics = dashboardContext.healthMetrics.currentMetrics;
    
    // CBT insights based on scores
    if (metrics.medicationScore < 6) {
      insights.push({
        type: 'cbt',
        content: "Challenge the thought: 'I always forget my medications' → 'I can develop systems to help me remember consistently'",
        urgency: 'high',
        relatedFeature: 'MBP Wizard'
      });
    }

    if (metrics.dietScore >= 8) {
      insights.push({
        type: 'motivational',
        content: "Your excellent diet scores show real commitment to your health goals - you're building sustainable habits!",
        urgency: 'low',
        relatedFeature: 'Inspiration Machine D'
      });
    }

    // CPD alignment insights
    if (metrics.exerciseScore < 7) {
      insights.push({
        type: 'cpd_alignment',
        content: "Your exercise scores suggest room for improvement in meeting your care plan directives. Small, consistent steps lead to lasting change.",
        urgency: 'medium',
        relatedFeature: 'E&W Support'
      });
    }
  }

  return insights;
}

function extractRecommendations(dashboardContext: any): string[] {
  const recommendations = [];

  if (dashboardContext.healthMetrics?.recommendations) {
    recommendations.push(...dashboardContext.healthMetrics.recommendations);
  }

  if (dashboardContext.cpdStatus?.recommendations) {
    recommendations.push(...dashboardContext.cpdStatus.recommendations);
  }

  return recommendations;
}

function extractFeatureSuggestions(dashboardContext: any): any[] {
  const suggestions = [];

  if (dashboardContext.healthMetrics?.kgcFeatureSuggestions) {
    suggestions.push(...dashboardContext.healthMetrics.kgcFeatureSuggestions);
  }

  return suggestions;
}

function generateInsightsFromResponse(response: any): MCPInsight[] {
  const insights: MCPInsight[] = [];

  response.toolResults.forEach((result: any) => {
    if (result.result?.cbtInsights) {
      result.result.cbtInsights.forEach((insight: string) => {
        insights.push({
          type: 'cbt',
          content: insight,
          urgency: 'medium',
          relatedFeature: result.tool
        });
      });
    }

    if (result.result?.motivationalPrompts) {
      result.result.motivationalPrompts.forEach((prompt: string) => {
        insights.push({
          type: 'motivational',
          content: prompt,
          urgency: 'low',
          relatedFeature: result.tool
        });
      });
    }
  });

  return insights;
}

function generateInsightsFromToolResponse(action: string, response: any): MCPInsight[] {
  const insights: MCPInsight[] = [];

  if (response.cbtInsights) {
    response.cbtInsights.forEach((insight: string) => {
      insights.push({
        type: 'cbt',
        content: insight,
        urgency: 'medium',
        relatedFeature: action
      });
    });
  }

  if (response.motivationalPrompts) {
    response.motivationalPrompts.forEach((prompt: string) => {
      insights.push({
        type: 'motivational',
        content: prompt,
        urgency: 'low',
        relatedFeature: action
      });
    });
  }

  return insights;
}