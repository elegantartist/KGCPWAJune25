import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import { BarChart } from "lucide-react";

const DailySelfScoreEntry: React.FC = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current authenticated user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user/current-context'],
    retry: false
  });

  const userId = currentUser?.patientId || currentUser?.id;
  
  // State for slider values
  const [medicationScore, setMedicationScore] = useState<number[]>([5]);
  const [dietScore, setDietScore] = useState<number[]>([5]);
  const [exerciseScore, setExerciseScore] = useState<number[]>([5]);
  const [notes, setNotes] = useState<string>("");
  
  // State to track if user has submitted today
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  
  // Check if user has already submitted today
  useEffect(() => {
    const lastSubmitDate = localStorage.getItem('lastScoreSubmitDate');
    if (lastSubmitDate) {
      const today = new Date().toISOString().split('T')[0];
      if (lastSubmitDate === today) {
        setIsSubmitted(true);
      }
    }
  }, []);

  // Mutation to submit daily scores
  const submitScoreMutation = useMutation({
    mutationFn: async (scoreData: {
      patientId: number;
      scoreDate: string;
      exerciseSelfScore: number;
      mealPlanSelfScore: number;
      medicationSelfScore: number;
      notes?: string;
    }) => {
      return apiRequest('/api/patient-scores', {
        method: 'POST',
        body: JSON.stringify(scoreData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your daily self-scores have been submitted successfully!",
      });
      
      // Mark as submitted for today
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('lastScoreSubmitDate', today);
      setIsSubmitted(true);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/health-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'health-metrics'] });
    },
    onError: (error) => {
      console.error('Error submitting scores:', error);
      toast({
        title: "Error",
        description: "Failed to submit your daily self-scores. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to handle submission
  const handleSubmit = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Create haptic feedback
    createHapticFeedback('light');
    
    const today = new Date().toISOString().split('T')[0];
    
    const scoreData = {
      patientId: userId,
      scoreDate: today,
      exerciseSelfScore: exerciseScore[0],
      mealPlanSelfScore: dietScore[0],
      medicationSelfScore: medicationScore[0],
      notes: notes.trim() || undefined,
    };

    submitScoreMutation.mutate(scoreData);
  };

  // Function to get score description
  const getScoreDescription = (score: number): string => {
    if (score >= 9) return "Excellent";
    if (score >= 7) return "Good";
    if (score >= 5) return "Fair";
    if (score >= 3) return "Poor";
    return "Very Poor";
  };

  // Function to get score color
  const getScoreColor = (score: number): string => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  if (!userId) {
    return (
      <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-gray-600">Please log in to access daily self-scores.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
      <CardHeader>
        <CardTitle className="text-[#676767] flex items-center">
          <BarChart className="w-6 h-6 text-[#2E8BC0] mr-2" />
          <span>Daily Self-Scores</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isSubmitted ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Scores Submitted Today
              </h3>
              <p className="text-gray-600">
                You've already submitted your daily self-scores for today. Come back tomorrow!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                How are you feeling today?
              </h3>
              <p className="text-gray-600 text-sm">
                Rate each area on a scale of 1-10 (1 = Poor, 10 = Excellent)
              </p>
            </div>

            {/* Medication Score */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                  Medication Adherence
                </label>
                <span className={cn("text-sm font-semibold", getScoreColor(medicationScore[0]))}>
                  {medicationScore[0]} - {getScoreDescription(medicationScore[0])}
                </span>
              </div>
              <Slider
                value={medicationScore}
                onValueChange={setMedicationScore}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                How well did you follow your medication schedule?
              </p>
            </div>

            {/* Diet Score */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                  Diet & Nutrition
                </label>
                <span className={cn("text-sm font-semibold", getScoreColor(dietScore[0]))}>
                  {dietScore[0]} - {getScoreDescription(dietScore[0])}
                </span>
              </div>
              <Slider
                value={dietScore}
                onValueChange={setDietScore}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                How well did you follow your meal plan and nutrition goals?
              </p>
            </div>

            {/* Exercise Score */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">
                  Exercise & Activity
                </label>
                <span className={cn("text-sm font-semibold", getScoreColor(exerciseScore[0]))}>
                  {exerciseScore[0]} - {getScoreDescription(exerciseScore[0])}
                </span>
              </div>
              <Slider
                value={exerciseScore}
                onValueChange={setExerciseScore}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                How well did you meet your exercise and activity goals?
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Additional Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling? Any challenges or successes to share?"
                className="min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {notes.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitScoreMutation.isPending}
              className="w-full bg-[#2E8BC0] hover:bg-[#2E8BC0]/90 text-white"
              size="lg"
            >
              {submitScoreMutation.isPending ? "Submitting..." : "Submit Today's Scores"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySelfScoreEntry;