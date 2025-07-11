import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useSimpleToast } from '@/hooks/simple-toast';
import { apiRequest } from '@/lib/queryClient';
import { ScoreAnalysisReport } from './ScoreAnalysisReport';

interface AnalysisData {
  summary?: string;
  recommendations?: string[];
  trendAnalysis?: string;
  isImproving?: boolean;
  // Adding fields from the other analysis structure for flexibility
  medicationObservation?: string;
  dietObservation?: string;
  exerciseObservation?: string;
  recognition?: string | null;
  [key: string]: any; // Keep for other potential fields
}

interface DailySelfScoresProps {
  onSubmitted: (scores: { diet: number; exercise: number; medication: number }, analysis?: AnalysisData | null) => void; // Pass analysis back
  onClose: () => void;
  initialAnalysis?: AnalysisData | null; // Allow passing analysis if already fetched by parent
}


const DailySelfScores: React.FC<DailySelfScoresProps> = ({ onSubmitted, onClose, initialAnalysis }) => {
  const [dietScore, setDietScore] = useState(5);
  const [exerciseScore, setExerciseScore] = useState(5);
  const [medicationScore, setMedicationScore] = useState(5);
  const [view, setView] = useState<'form' | 'analysis'>('form');
  // Use initialAnalysis if provided, otherwise fetch on demand (though fetching on demand will be removed)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(initialAnalysis || null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false); // Kept if we need a loading state for viewing
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useSimpleToast();

  useEffect(() => {
    if (initialAnalysis) {
      setAnalysisData(initialAnalysis);
      // If initialAnalysis is present, and user was in 'form' view but submitted,
      // and then clicked "Yes" on a toast, they might expect to see it.
      // This logic will be simplified as parent (`enhanced-chatbot`) will control view.
    }
  }, [initialAnalysis]);

  const showAnalysisView = (data: AnalysisData | null) => {
    setAnalysisData(data);
    setView('analysis');
    if (!data && !isLoadingAnalysis) { // If no data and not already loading
        setAnalysisError("Analysis data is not available.");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    const scores = {
      diet: dietScore,
      exercise: exerciseScore,
      medication: medicationScore,
    };
    // The onSubmitted callback (from enhanced-chatbot.tsx) will handle the API call
    // and receive the analysis. It will then decide whether to show the analysis view.
    onSubmitted(scores);

    // The toast is now handled by the parent component (enhanced-chatbot.tsx)
    // which has access to the analysis data from the POST response.
  };

  if (view === 'analysis') {
    return (
      <ScoreAnalysisReport
        isLoading={isLoadingAnalysis} // Parent can set this if needed
        analysisData={analysisData}   // Passed from parent
        error={analysisError}         // Passed from parent
        onClose={onClose}
      />
    );
  }

  // This component now primarily focuses on the form.
  // The parent (enhanced-chatbot.tsx) will manage showing the analysis.
  // For this component to show analysis directly, `setView` would be called by parent,
  // or `initialAnalysis` would be updated causing a re-render.
  // For now, let's assume parent controls the view state for analysis.

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

// Ensure ScoreAnalysisReport component is defined or imported if it's separate
// For now, adding a placeholder if it's not found elsewhere, based on its usage.
// interface ScoreAnalysisReportProps {
//   isLoading: boolean;
//   analysisData: AnalysisData | null;
//   error: string | null;
//   onClose: () => void;
// }

// const ScoreAnalysisReport: React.FC<ScoreAnalysisReportProps> = ({ isLoading, analysisData, error, onClose }) => {
//   if (isLoading) return <div className="p-4 text-center">Loading analysis...</div>;
//   if (error) return <div className="p-4 text-center text-red-600">{error}</div>;
//   if (!analysisData) return <div className="p-4 text-center">No analysis data available.</div>;

//   return (
//     <div className="p-4 space-y-4">
//       <h3 className="text-xl font-semibold">Your Score Analysis</h3>
//       <p><strong>Summary:</strong> {analysisData.summary}</p>
//       {analysisData.recommendations && analysisData.recommendations.length > 0 && (
//         <div>
//           <strong>Recommendations:</strong>
//           <ul className="list-disc pl-5">
//             {analysisData.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
//           </ul>
//         </div>
//       )}
//       <Button onClick={onClose} className="w-full">Close Analysis</Button>
//     </div>
//   );
// };