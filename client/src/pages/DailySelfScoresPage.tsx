import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/apiRequest';
import { useAuth } from '@/hooks/useAuth';
import ScoreDiscussionDialog from '@/components/features/ScoreDiscussionDialog';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ScoreSliderProps {
  label: string;
  description: string;
  value: number;
  onValueChange: (value: number) => void;
  color: string;
  sliderClass: string;
}

const ScoreSlider: React.FC<ScoreSliderProps> = ({ label, description, value, onValueChange, color, sliderClass }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <div>
        <h3 className="font-medium">{label}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
    </div>
    <Slider
      value={[value]}
      min={1}
      max={10}
      step={1}
      onValueChange={(val) => onValueChange(val[0])}
      className={sliderClass}
      aria-label={`${label} score from 1 to 10`}
    />
    <div className="flex justify-between text-xs text-gray-500 mt-1">
      <span>1</span>
      <span>10</span>
    </div>
  </div>
);

interface SubmittedScoreProps {
  label: string;
  score: number;
  color: string;
}

const SubmittedScore: React.FC<SubmittedScoreProps> = ({ label, score, color }) => (
  <div className="flex items-center gap-2">
    <span className="font-medium w-48 sm:w-56">{label}</span>
    <div className="flex-1">
      <Progress value={score * 10} style={{ '--progress-background': color } as React.CSSProperties} />
    </div>
    <span className="font-medium w-6 text-right" style={{ color }}>{score}</span>
  </div>
);

const useSubmitScores = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (scores: { dietScore: number; exerciseScore: number; medicationScore: number; date: string }) =>
      apiRequest('/api/health-scores', 'POST', scores),
    onSuccess: () => {
      // Invalidate queries to refetch data that depends on scores, like milestones.
      queryClient.invalidateQueries({ queryKey: ['milestones', user?.id] });
    },
  });
};

const DailySelfScoresPage: React.FC = () => {
  const { toast } = useToast();
  const [dietScore, setDietScore] = useState(5);
  const [exerciseScore, setExerciseScore] = useState(5);
  const [medicationScore, setMedicationScore] = useState(5);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDiscussionDialog, setShowDiscussionDialog] = useState(false);

  const submitScoresMutation = useSubmitScores();

  const handleSubmit = async () => {
    const scoreData = {
      dietScore,
      exerciseScore,
      medicationScore,
      date: format(new Date(), 'yyyy-MM-dd'),
    };

    submitScoresMutation.mutate(scoreData, {
      onSuccess: () => {
        toast({
          title: "Scores Submitted!",
          description: "Your daily scores have been recorded successfully.",
        });
        setIsSubmitted(true);
        // Trigger discussion dialog after a short delay
        setTimeout(() => {
          setShowDiscussionDialog(true);
        }, 1000);
      },
      onError: (error: any) => {
        toast({
          title: "Submission Failed",
          description: error.message || "Could not submit your scores. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-blue-800">Daily Self-Scores</CardTitle>
            <CardDescription className="text-gray-600">
              {isSubmitted
                ? "Here are the scores you submitted for today. Great job!"
                : "Rate how well you followed your care plan today from 1 (low) to 10 (high)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {!isSubmitted ? (
              <>
                <ScoreSlider
                  label="Healthy Meal Plan"
                  description="Rate how well you followed your nutrition goals today"
                  value={dietScore}
                  onValueChange={setDietScore}
                  color="#4CAF50"
                  sliderClass="slider-green"
                />
                <ScoreSlider
                  label="Exercise and Wellness"
                  description="Rate your physical activity and wellness practices"
                  value={exerciseScore}
                  onValueChange={setExerciseScore}
                  color="#2E8BC0"
                  sliderClass="slider-blue"
                />
                <ScoreSlider
                  label="Prescription Medication"
                  description="Rate your adherence to prescribed medications"
                  value={medicationScore}
                  onValueChange={setMedicationScore}
                  color="#E53935"
                  sliderClass="slider-red"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={submitScoresMutation.isPending}
                  className="w-full bg-[#2E8BC0] hover:bg-[#267cad] text-lg py-6"
                >
                  {submitScoresMutation.isPending ? (
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  ) : (
                    "Submit Daily Scores"
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-5">
                <SubmittedScore label="Healthy Meal Plan" score={dietScore} color="#4CAF50" />
                <SubmittedScore label="Exercise and Wellness" score={exerciseScore} color="#2E8BC0" />
                <SubmittedScore label="Prescription Medication" score={medicationScore} color="#E53935" />
                <p className="text-center text-sm text-gray-500 pt-4">You can update your scores for today by submitting again.</p>
                 <Button
                  onClick={() => setIsSubmitted(false)}
                  variant="outline"
                  className="w-full"
                >
                  Edit Scores
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ScoreDiscussionDialog
        isOpen={showDiscussionDialog}
        onClose={() => setShowDiscussionDialog(false)}
        scores={{ dietScore, exerciseScore, medicationScore }}
      />
    </div>
  );
};

export default DailySelfScoresPage;