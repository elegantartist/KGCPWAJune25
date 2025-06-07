import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";
import { HealthProgressChart } from "@/components/HealthProgressChart";

type Scores = { diet: number; exercise: number; medication: number; };

interface HealthMetric {
  createdAt: string;
  diet: number;
  exercise: number;
  medication: number;
}

export default function DailySelfScores() {
  const [, setLocation] = useLocation();
  const [scores, setScores] = useState<Scores>({ diet: 5, exercise: 5, medication: 5 });
  const [submitted, setSubmitted] = useState(false);
  const [showDiscuss, setShowDiscuss] = useState(false);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  useEffect(() => {
    fetch('/api/patients/me/health-metrics/history')
      .then(res => res.json())
      .then(data => {
        // Convert our database format to chart format
        const formattedMetrics = data.map((metric: any) => ({
          createdAt: metric.date,
          diet: metric.dietScore,
          exercise: metric.exerciseScore,
          medication: metric.medicationScore
        }));
        setMetrics(formattedMetrics);
      })
      .catch(console.error);
  }, []);

  const handleSlider = (field: keyof Scores, value: number) => {
    setScores({ ...scores, [field]: value });
  };

  const canSubmit = Object.values(scores).every(score => score >= 1 && score <= 10);

  const handleSubmit = async () => {
    try {
      await fetch('/api/patients/me/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationScore: scores.medication,
          dietScore: scores.diet,
          exerciseScore: scores.exercise
        }),
      });
      setSubmitted(true);
      setTimeout(() => setShowDiscuss(true), 800);
      
      // Refresh metrics after submission
      fetch('/api/patients/me/health-metrics/history')
        .then(res => res.json())
        .then(data => {
          const formattedMetrics = data.map((metric: any) => ({
            createdAt: metric.date,
            diet: metric.dietScore,
            exercise: metric.exerciseScore,
            medication: metric.medicationScore
          }));
          setMetrics(formattedMetrics);
        });
    } catch (error) {
      console.error('Failed to submit scores:', error);
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
        
        {/* Progress Chart */}
        {metrics.length > 0 && <HealthProgressChart metrics={metrics} />}
        
        {/* Daily Self-Scores Input */}
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