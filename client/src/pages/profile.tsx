import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

type Scores = { diet: number; exercise: number; medication: number; };

export default function DailySelfScores() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [scores, setScores] = useState<Scores>({ diet: 5, exercise: 5, medication: 5 });
  const [submitted, setSubmitted] = useState(false);
  const [showDiscuss, setShowDiscuss] = useState(false);

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
    } catch (error) {
      console.error('Failed to submit scores:', error);
    }
  };

  const handleScoresSubmitted = () => {
    // Route to chatbot with recent scores
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
      <div className="p-4 bg-white rounded shadow max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Daily Self-Scores</h2>
        <p className="text-sm text-gray-600 mb-6">Rate your performance today on a scale of 1-10</p>
        
        {(['diet', 'exercise', 'medication'] as const).map(field => (
          <div key={field} className="mb-4">
            <label className="block capitalize mb-2 font-medium">
              {field}: {scores[field]}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={scores[field]}
              onChange={e => handleSlider(field, Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        ))}
        
        <button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={"w-full py-2 rounded font-semibold transition-colors " + 
            (canSubmit ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400")}
        >
          Submit Daily Scores
        </button>
        
        {submitted && (
          <div className="text-green-500 mt-4 animate-bounce text-center">
            Scores Submitted!
          </div>
        )}
      </div>
    </Layout>
  );
}

function ScoreDiscussionDialog({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded p-6 w-80 text-center">
        <h3 className="text-lg font-semibold mb-4">Great job submitting your scores!</h3>
        <p className="mb-6 text-gray-600">
          Would you like to discuss your scores with the health assistant?
        </p>
        <div className="flex gap-4 justify-center">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors" 
            onClick={onYes}
          >
            Yes, Let's Discuss
          </button>
          <button 
            className="bg-gray-300 hover:bg-gray-400 px-6 py-2 rounded transition-colors" 
            onClick={onNo}
          >
            No, Return Home
          </button>
        </div>
      </div>
    </div>
  );
}