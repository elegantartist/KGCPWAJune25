import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useSimpleToast } from '@/hooks/simple-toast';
import { apiRequest } from '@/lib/queryClient';
import { ScoreAnalysisReport } from './ScoreAnalysisReport';

interface DailySelfScoresProps {
  onSubmitted: (scores: { diet: number; exercise: number; medication: number }) => void;
  onClose: () => void;
}

interface AnalysisData {
  summary: string;
  // Add other fields from the analysis response
  [key: string]: any;
}

const DailySelfScores: React.FC<DailySelfScoresProps> = ({ onSubmitted, onClose }) => {
  const [dietScore, setDietScore] = useState(5);
  const [exerciseScore, setExerciseScore] = useState(5);
  const [medicationScore, setMedicationScore] = useState(5);
  const [view, setView] = useState<'form' | 'analysis'>('form');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useSimpleToast();

  const handleShowAnalysis = async () => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setView('analysis');
    try {
      const data = await apiRequest('GET', '/api/scores/analysis');
      setAnalysisData(data);
    } catch (error) {
      console.error("Failed to fetch score analysis:", error);
      setAnalysisError("We couldn't fetch your analysis right now. Please try again later.");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true); // Disable the form after submission
    const scores = {
      diet: dietScore,
      exercise: exerciseScore,
      medication: medicationScore,
    };
    onSubmitted(scores);

    // Show the toast with Yes/No options
    toast({
      title: "Scores Submitted!",
      description: "Thank you for your daily health update. Would you like to see your analysis?",
      duration: 20000,
      action: (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleShowAnalysis}>Yes</Button>
        </div>
      ),
    });
  };

  if (view === 'analysis') {
    return (
      <ScoreAnalysisReport
        isLoading={isLoadingAnalysis}
        analysisData={analysisData}
        error={analysisError}
        onClose={onClose} // The main close button will now close the entire dialog
      />
    );
  }

  return (
    <div className="p-4 space-y-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="diet-slider" className="text-lg font-medium text-green-700">Healthy Meal Plan ({dietScore})</Label>
          <Slider
            id="diet-slider"
            min={1} max={10} step={1}
            value={[dietScore]}
            onValueChange={(value) => setDietScore(value[0])}
            disabled={isSubmitted}
            className="[&>span:first-child]:bg-green-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exercise-slider" className="text-lg font-medium text-blue-700">Exercise and Wellness ({exerciseScore})</Label>
          <Slider
            id="exercise-slider"
            min={1} max={10} step={1}
            value={[exerciseScore]}
            onValueChange={(value) => setExerciseScore(value[0])}
            disabled={isSubmitted}
            className="[&>span:first-child]:bg-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="medication-slider" className="text-lg font-medium text-red-700">Prescription Medication ({medicationScore})</Label>
          <Slider
            id="medication-slider"
            min={1} max={10} step={1}
            value={[medicationScore]}
            onValueChange={(value) => setMedicationScore(value[0])}
            disabled={isSubmitted}
            className="[&>span:first-child]:bg-red-500"
          />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmit} disabled={isSubmitted} className="w-full">
          {isSubmitted ? "Scores Submitted for Today" : "Submit Daily Scores"}
        </Button>
      </div>
    </div>
  );
};

export default DailySelfScores;