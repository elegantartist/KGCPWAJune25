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
import Layout from "@/components/layout/Layout";
import HealthProgressChart from "@/components/health/HealthProgressChart";

// Types
type Scores = { diet: number; exercise: number; medication: number; };

interface HealthMetric {
  createdAt: string;
  diet: number;
  exercise: number;
  medication: number;
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
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  // Load historical health metrics
  useEffect(() => {
    console.log('Loading health metrics...');
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    fetch('/api/patients/me/health-metrics/history', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Raw health metrics data:', data);
        // Backend returns camelCase: dietScore, exerciseScore, medicationScore
        const formattedMetrics = data.map((metric: any) => ({
          createdAt: metric.date,
          diet: metric.dietScore,
          exercise: metric.exerciseScore,
          medication: metric.medicationScore
        }));
        console.log('Formatted metrics for chart:', formattedMetrics);
        setMetrics(formattedMetrics);
      })
      .catch(err => {
        console.error('Error loading health metrics:', err);
        // Show user-friendly error message
        console.error('Failed to load historical data. Please check your connection and try again.');
      });
  }, []);

  const handleSlider = (field: keyof Scores, value: number) => {
    setScores({ ...scores, [field]: value });
  };

  const canSubmit = Object.values(scores).every(score => score >= 1 && score <= 10);

  const handleSubmit = async () => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('No authentication token found for submission');
      alert('Please log in again to submit your scores.');
      return;
    }

    try {
      const response = await fetch('/api/patients/me/scores', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicationScore: scores.medication,
          dietScore: scores.diet,
          exerciseScore: scores.exercise
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit scores: ${response.status} ${response.statusText}`);
      }

      setSubmitted(true);
      setTimeout(() => setShowDiscuss(true), 800);
      
      // Refresh metrics after successful submission
      const refreshResponse = await fetch('/api/patients/me/health-metrics/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const formattedMetrics = data.map((metric: any) => ({
          createdAt: metric.date,
          diet: metric.dietScore,
          exercise: metric.exerciseScore,
          medication: metric.medicationScore
        }));
        setMetrics(formattedMetrics);
        console.log('Metrics refreshed after submission:', formattedMetrics);
      }
    } catch (error) {
      console.error('Failed to submit scores:', error);
      alert('Failed to submit your scores. Please try again.');
    }
  };

  const handleScoresSubmitted = () => {
    setLocation('/chatbot?recent=' + encodeURIComponent(JSON.stringify(scores)));
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
      <div>
        <h1 className="text-2xl font-bold mt-8 mb-4 text-center">Daily Self-Scores</h1>
        
        {/* Progress Chart - Only show if historical data exists */}
        {metrics.length > 0 ? (
          <HealthProgressChart metrics={metrics} />
        ) : (
          <div className="mb-6 bg-yellow-50 p-4 rounded border">
            <p className="text-sm text-gray-600">No historical data yet. Submit your first scores to see the progress chart!</p>
          </div>
        )}
        
        {/* Daily Self-Scores Input Form */}
        <div className="p-4 bg-white rounded shadow max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Daily Self-Scores</h2>
          {(['diet', 'exercise', 'medication'] as const).map(field => (
            <div key={field} className="mb-4">
              <label className="block capitalize mb-2">{field}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={scores[field]}
                onChange={e => handleSlider(field, Number(e.target.value))}
                className="w-full"
              />
              <span className="ml-2">{scores[field]}</span>
            </div>
          ))}
          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={"w-full py-2 rounded font-semibold " + (canSubmit ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400")}
          >
            Submit
          </button>
          {submitted && <div className="text-green-500 mt-4 animate-bounce">Submitted!</div>}
        </div>
      </div>
    </Layout>
  );
}

/**
 * HEALTH SCORE ANALYSIS UTILITIES
 * 
 * These functions provide score analysis capabilities for the AI agent
 */

export function getLowestScoringArea(
  dietScore: number, 
  exerciseScore: number, 
  medicationScore: number
): 'diet' | 'exercise' | 'medication' {
  if (dietScore <= exerciseScore && dietScore <= medicationScore) return 'diet';
  if (exerciseScore <= dietScore && exerciseScore <= medicationScore) return 'exercise';
  return 'medication';
}

export function generateDetailedAnalysis(
  dietScore: number,
  exerciseScore: number,
  medicationScore: number,
  useAustralianEnglish = true
): string {
  let analysis = '';
  
  // Diet Analysis
  if (dietScore <= 3) {
    analysis += `Your diet adherence score of ${dietScore}/10 indicates significant challenges in following your nutritional plan. This is the area requiring the most immediate attention.\n\n`;
  } else if (dietScore >= 8) {
    analysis += `Your diet adherence score of ${dietScore}/10 shows excellent commitment to your nutritional guidelines. Well done on maintaining this ${useAustralianEnglish ? 'behaviour' : 'behavior'}.\n\n`;
  } else {
    analysis += `Your diet adherence score of ${dietScore}/10 shows moderate success with room for improvement.\n\n`;
  }
  
  // Exercise Analysis
  if (exerciseScore <= 3) {
    analysis += `Your exercise score of ${exerciseScore}/10 suggests difficulty maintaining regular activity. Consider a tailored plan.\n\n`;
  } else if (exerciseScore >= 8) {
    analysis += `Your exercise score of ${exerciseScore}/10 demonstrates strong commitment. This consistency will yield significant benefits.\n\n`;
  } else {
    analysis += `Your exercise score of ${exerciseScore}/10 indicates moderate levels. Try to make it more enjoyable and regular.\n\n`;
  }
  
  // Medication Analysis
  if (medicationScore <= 3) {
    analysis += `Your medication score of ${medicationScore}/10 indicates challenges with adherence. This is critical to address for treatment efficacy.\n\n`;
  } else if (medicationScore >= 8) {
    analysis += `Excellent medication adherence (${medicationScore}/10). Keep up this important routine.\n\n`;
  } else {
    analysis += `Your medication adherence is moderate (${medicationScore}/10). Seek support if you're struggling to keep on track.\n\n`;
  }
  
  return analysis.trim();
}

/**
 * AI AGENT PROMPT FOR SCORE ANALYSIS
 * 
 * You are the KGC Health Assistant Supervisor Agent. When a patient submits daily self-scores 
 * and selects "yes" to view analysis, your task is to:
 * 
 * 1. AUTOMATICALLY generate a complete analysis of their self-scores without requiring further 
 *    prompts or user confirmation.
 * 2. NEVER show your internal processing, questions, or deliberations in the chat UI - only 
 *    present the final analysis.
 * 3. In your analysis, include:
 *    - Trends across all three domains (medication, diet, exercise)
 *    - Personalized insights based on Care Plan Directives
 *    - Specific observations for scores that are concerning (≤3) or excellent (≥8)
 *    - Recognition of improvement or consistency in maintaining good scores (≥7 for 3+ days)
 * 4. If any score is below 5, gently flag this with supportive advice and suggest relevant 
 *    resources or features.
 * 5. Use a motivational, encouraging tone.
 */