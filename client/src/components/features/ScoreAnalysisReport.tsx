import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Lightbulb, CheckCircle } from 'lucide-react';

interface AnalysisData {
  summary: string;
  medicationObservation: string;
  dietObservation: string;
  exerciseObservation: string;
  recommendations: string[];
  recognition: string | null;
}

interface ScoreAnalysisReportProps {
  isLoading: boolean;
  analysisData: AnalysisData | null;
  error: string | null;
  onClose: () => void;
}

export const ScoreAnalysisReport: React.FC<ScoreAnalysisReportProps> = ({ isLoading, analysisData, error, onClose }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-muted-foreground">Generating your personalized analysis...</p>
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <p className="text-red-500">{error || "An unknown error occurred."}</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CardHeader className="text-center p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-blue-800">Health Score Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg flex items-center mb-2"><FileText className="mr-2 h-5 w-5 text-blue-600" /> Score Summary</h3>
          <p className="text-muted-foreground">{analysisData.summary}</p>
        </div>

        {analysisData.recognition && (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 flex items-center"><CheckCircle className="mr-2 h-5 w-5" /> Recognition</h4>
            <p className="text-green-700 mt-1">{analysisData.recognition}</p>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-lg mb-2">Detailed Analysis</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Diet:</strong> {analysisData.dietObservation}</li>
            <li><strong>Exercise:</strong> {analysisData.exerciseObservation}</li>
            <li><strong>Medication:</strong> {analysisData.medicationObservation}</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-lg flex items-center mb-2"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500" /> Recommendations</h3>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            {analysisData.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
          </ul>
        </div>
        <p className="text-xs text-center text-muted-foreground pt-4">You can discuss this analysis further in the KGC Chatbot.</p>
        <Button onClick={onClose} className="w-full">Close</Button>
      </CardContent>
    </div>
  );
};