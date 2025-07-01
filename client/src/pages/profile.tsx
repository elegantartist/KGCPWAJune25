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
function ScoreDiscussionDialog({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded p-6 w-80 text-center">
        <p className="mb-6">Would you like to discuss your scores with the health assistant?</p>
        <div className="flex gap-4 justify-center">
          <button className="bg-blue-600 text-white px-6 py-2 rounded" onClick={onYes}>Yes</button>
          <button className="bg-gray-300 px-6 py-2 rounded" onClick={onNo}>No</button>
        </div>
      </div>
    </div>
  );
}

// Main Daily Self-Scores Component
export default function DailySelfScores() {
  const [, setLocation] = useLocation();
  const [scores, setScores] = useState<Scores>({ diet: 5, exercise: 5, medication: 5 });
  const [submitted, setSubmitted] = useState(false);
  const [showDiscuss, setShowDiscuss] = useState(false);
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
    onSuccess: (result) => {
      // Invalidate the query to refetch the chart data automatically
      queryClient.invalidateQueries({ queryKey: ['healthMetricsHistory'] });

      // Check for newly earned badges
      if (result && result.newlyEarnedBadges && result.newlyEarnedBadges.length > 0) {
        result.newlyEarnedBadges.forEach((badge: any) => {
          showAward(badge);
        });
      }

      // Save scores to localStorage for the chatbot
      localStorage.setItem('lastHealthMetrics', JSON.stringify({
        ...scores,
        date: new Date().toISOString()
      }));

      setSubmitted(true);
      setTimeout(() => setShowDiscuss(true), 800);
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
    // Navigate to the correct chatbot page, which will read the scores from localStorage.
    setLocation('/enhanced-chatbot');
  };
  if (showDiscuss) {
    return (
      <Layout>
        <ScoreDiscussionDialog
          onYes={() => handleScoresSubmitted()}
          onNo={() => setLocation('/')}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
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