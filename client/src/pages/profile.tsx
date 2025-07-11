/**
 * DAILY SELF-SCORES FEATURE - Complete Implementation
 * 
 * This file contains the complete Daily Self-Scores feature for the Patient Dashboard.
 * Features:
 * - Daily score input (Diet, Exercise, Medication) with 1-10 sliders
 * - Progress chart showing historical data with Recharts
 * - Submit confirmation and discussion dialog
 * - Integration with chatbot for score analysis
 * - Layout template integration for consistent UI
 * 
 * Colors: Diet=Red, Exercise=Blue, Medication=Green
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBadgeAward } from '@/context/BadgeAwardContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/apiRequest';
import Layout from "@/components/layout/Layout";
import { HealthProgressChart } from '@/components/HealthProgressChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';

// Types
type Scores = { diet: number; exercise: number; medication: number; };

interface HealthMetric {
  date: string; // ISO date string from the database
  dietScore: number;
  exerciseScore: number;
  medicationScore: number;
}

// Discussion Dialog Component
interface ScoreDiscussionDialogProps {
  analysis: { summary?: string; recommendations?: string[] } | null;
  onYes: () => void;
  onNo: () => void;
}

function ScoreDiscussionDialog({ analysis, onYes, onNo }: ScoreDiscussionDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Scores Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {analysis && analysis.summary && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <h4 className="font-semibold mb-1 text-blue-700">Quick Summary:</h4>
              <p className="text-gray-700">{analysis.summary}</p>
            </div>
          )}
          <p className="mb-6 text-gray-800">
            Would you like to discuss your scores and this analysis further with the KGC Health Assistant?
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={onYes} className="bg-blue-600 hover:bg-blue-700">Yes, Discuss</Button>
            <Button onClick={onNo} variant="outline">No, Thanks</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Daily Self-Scores Component
export default function DailySelfScoresPage() { // Renamed to avoid conflict if DailySelfScores component is imported
  const [, setLocation] = useLocation();
  const [scores, setScores] = useState<Scores>({ diet: 5, exercise: 5, medication: 5 });
  const [submitted, setSubmitted] = useState(false);
  const [showDiscuss, setShowDiscuss] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null); // Added state for analysis
  const { showAward } = useBadgeAward();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch historical health metrics using React Query
  const { data: metrics = [], isLoading: isLoadingMetrics } = useQuery<HealthMetric[]>({
    queryKey: ['healthMetricsHistory'],
    queryFn: () => apiRequest('GET', '/api/patients/me/health-metrics/history'),
    onError: (error) => {
      toast({
        title: "Error Loading Data",
        description: "Could not load your health progress chart. Please try refreshing.",
        variant: "destructive",
      });
    },
  });

  // Mutation for submitting scores
  const submitScoresMutation = useMutation({
    mutationFn: (newScores: Scores) => apiRequest('POST', '/api/scores', {
      medicationScore: newScores.medication,
      dietScore: newScores.diet,
      exerciseScore: newScores.exercise
    }),
    onSuccess: (result) => { // result now includes { success, newlyEarnedBadges, analysis }
      queryClient.invalidateQueries({ queryKey: ['healthMetricsHistory'] });

      if (result && result.newlyEarnedBadges && result.newlyEarnedBadges.length > 0) {
        result.newlyEarnedBadges.forEach((badge: any) => {
          showAward(badge);
        });
      }

      localStorage.setItem('lastHealthMetrics', JSON.stringify({
        ...scores, // These are the raw scores { diet, exercise, medication }
        date: new Date().toISOString()
      }));

      // Store the analysis for the dialog
      if (result && result.analysis) {
        setCurrentAnalysis(result.analysis); // Store analysis in state
        localStorage.setItem('lastScoreAnalysis', JSON.stringify(result.analysis)); // Also in localStorage if needed elsewhere
      } else {
        setCurrentAnalysis(null);
        localStorage.removeItem('lastScoreAnalysis'); // Clear if no analysis
      }

      setSubmitted(true);
      setTimeout(() => setShowDiscuss(true), 800); // Trigger discussion dialog
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your scores. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSlider = (field: keyof Scores, value: number) => {
    setScores({ ...scores, [field]: value });
  };

  const canSubmit = Object.values(scores).every(score => score >= 1 && score <= 10);

  const handleSubmit = async () => {
    submitScoresMutation.mutate(scores);
  };

  const handleScoresSubmitted = () => {
    // Save the analysis to localStorage so enhanced-chatbot can pick it up if needed as part of its initialMessage logic
    // The initialMessage logic in enhanced-chatbot.tsx uses 'lastHealthMetrics'
    // We can add analysis to 'lastHealthMetrics' or keep it separate.
    // For now, 'lastHealthMetrics' already stores raw scores and date.
    // The chatbot will primarily use the raw scores to initiate discussion.
    setLocation('/enhanced-chatbot');
  };

  // Removed useEffect for setting currentAnalysis from localStorage here,
  // as it's directly set in the mutation's onSuccess.

  if (showDiscuss) {
    return (
      <Layout>
        <ScoreDiscussionDialog
          analysis={currentAnalysis} // Pass currentAnalysis to the dialog
          onYes={() => {
            setShowDiscuss(false); // Close dialog
            handleScoresSubmitted(); // Navigate
          }}
          onNo={() => {
            setShowDiscuss(false); // Close dialog
            setLocation('/'); // Navigate home
          }}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 md:p-0"> {/* Added padding for mobile */}
        <h1 className="text-2xl font-bold mt-8 mb-4 text-center">Daily Self-Scores</h1>
        
        {/* Progress Chart */}
        {isLoadingMetrics ? (
          <Card className="mb-6 flex items-center justify-center h-72">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </Card>
        ) : metrics.length > 0 ? (
          <HealthProgressChart metrics={metrics} />
        ) : !isLoadingMetrics && metrics.length === 0 ? (
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
            <AlertTitle>Welcome!</AlertTitle>
            <AlertDescription>
              Submit your first scores below to start tracking your health progress.
            </AlertDescription>
          </Alert>
        ) : null}
        
        {/* Daily Self-Scores Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Your Scores</CardTitle>
            <CardDescription>Rate your adherence from 1 (low) to 10 (high) for today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(['diet', 'exercise', 'medication'] as const).map(field => (
              <div key={field} className="space-y-2">
                <div className="flex justify-between">
                  <label className="capitalize font-medium">{field}</label>
                  <span className="font-bold text-lg text-blue-600">{scores[field]}</span>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[scores[field]]}
                  onValueChange={(vals) => handleSlider(field, vals[0])}
                />
              </div>
            ))}
            <Button
              disabled={!canSubmit || submitted || submitScoresMutation.isPending}
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {submitScoresMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : submitted ? (
                "Submitted!"
              ) : "Submit Scores"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}