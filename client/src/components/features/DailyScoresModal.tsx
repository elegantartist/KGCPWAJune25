import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';
import ScoreDiscussionDialog from './ScoreDiscussionDialog';
import { generateScoreAnalysisMessage } from '@/lib/scoreAnalysis';
 
interface DailyScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScoreSlider = ({ label, value, onChange, colorClass }: { label: string, value: number, onChange: (value: number) => void, colorClass: string }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Label className="text-lg font-medium text-gray-700">{label}</Label>
      <span className={`w-12 text-center text-lg font-bold text-white rounded-md ${colorClass}`}>
        {value}
      </span>
    </div>
    <Slider
      defaultValue={[value]}
      max={10}
      step={1}
      onValueChange={(values) => onChange(values[0])}
    />
  </div>
);

const DailyScoresModal: React.FC<DailyScoresModalProps> = ({ isOpen, onClose }) => {
  const [scores, setScores] = useState({ dietScore: 5, exerciseScore: 5, medicationScore: 5 });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [analysis, setAnalysis] = useState<{ isLoading: boolean; message: string; error: boolean }>({
    isLoading: false,
    message: '',
    error: false,
  });

  const submitScoresMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/patient/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(scores),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to submit scores.');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success!', description: 'Your scores have been recorded. Keep up the great work!' });
      queryClient.invalidateQueries({ queryKey: ['healthMetricsHistory'] }); // Assuming this key is used for charts

      // Per the design, save scores to localStorage for the chatbot to access
      localStorage.setItem('lastHealthMetrics', JSON.stringify({ ...scores, date: new Date().toISOString() }));

      // Trigger the AI-powered analysis
      handleAnalyzeScores();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleAnalyzeScores = async () => {
    setAnalysis({ isLoading: true, message: 'Our AI Supervisor is analyzing your scores...', error: false });
    setShowDiscussion(true); // Show the dialog in a loading state

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/analyze-health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(scores),
      });

      if (!response.ok) throw new Error('Server error during analysis');

      const data = await response.json();
      setAnalysis({ isLoading: false, message: data.analysis, error: false });
    } catch (error) {
      console.error("Failed to fetch AI analysis:", error);
      const fallbackMessage = `Thanks for submitting your scores! We couldn't get a personalized analysis right now, but here's some general feedback based on your input:\n\n${generateScoreAnalysisMessage(scores.dietScore, scores.exerciseScore, scores.medicationScore)}`;
      setAnalysis({ isLoading: false, message: fallbackMessage, error: true });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitScoresMutation.mutate();
  };

  const handleConfirmDiscussion = () => {
    // Store the message for the chatbot page to pick up
    sessionStorage.setItem('kgc_chatbot_init_message', analysis.message);

    setShowDiscussion(false);
    onClose(); // Close the scores modal
    // Navigate to the main dashboard, which will trigger the chat modal
    setLocation('/patient-dashboard');
  };

  return (
    <>
      <Dialog open={isOpen && !showDiscussion} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl">Daily Self-Scores</DialogTitle>
            <DialogDescription>
              Rate how well you followed your care plan today from 1 (not at all) to 10 (perfectly).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-8">
            <ScoreSlider
              label="Healthy Meal Plan"
              value={scores.dietScore}
              onChange={(val) => setScores(prev => ({ ...prev, dietScore: val }))}
              colorClass="bg-green-500"
            />
            <ScoreSlider
              label="Exercise & Wellness"
              value={scores.exerciseScore}
              onChange={(val) => setScores(prev => ({ ...prev, exerciseScore: val }))}
              colorClass="bg-blue-600"
            />
            <ScoreSlider
              label="Prescribed Medication"
              value={scores.medicationScore}
              onChange={(val) => setScores(prev => ({ ...prev, medicationScore: val }))}
              colorClass="bg-red-500"
            />
            <Button type="submit" className="w-full text-lg py-6" disabled={submitScoresMutation.isPending}>
              {submitScoresMutation.isPending ? <Loader2 className="h-6 w-6 mr-2 animate-spin" /> : 'Submit My Scores'}
            </Button>
          </form>
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4 rounded-full">
            <X className="h-6 w-6" />
          </Button>
        </DialogContent>
      </Dialog>
      <ScoreDiscussionDialog
        isOpen={showDiscussion}
        onClose={() => { setShowDiscussion(false); onClose(); }} // Close both dialogs
        onConfirm={handleConfirmDiscussion}
        analysis={analysis}
      />
    </>
  );
};

export default DailyScoresModal;