import React, { useState, useEffect } from "react";
import { HealthMetric } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ModelContextProtocol } from "@/components/chatbot/ModelContextProtocol";
import ScoreDiscussionDialog from "@/components/health/ScoreDiscussionDialog";

interface DailyHealthScoreProps {
  metric: HealthMetric;
}

const DailyHealthScore: React.FC<DailyHealthScoreProps> = ({ metric }) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Provide default values if metric is undefined or properties are missing
  const defaultMetric = {
    medicationScore: metric?.medicationScore || 5,
    dietScore: metric?.dietScore || 5,
    exerciseScore: metric?.exerciseScore || 5,
    userId: metric?.userId || 0,
    id: metric?.id || 0,
    date: metric?.date || new Date()
  };
  
  // State for slider values
  const [medicationScore, setMedicationScore] = useState<number>(defaultMetric.medicationScore || 5);
  const [dietScore, setDietScore] = useState<number>(defaultMetric.dietScore || 5);
  const [exerciseScore, setExerciseScore] = useState<number>(defaultMetric.exerciseScore || 5);
  
  // State to track if user has submitted today
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  // State for discussion dialog
  const [showDiscussionDialog, setShowDiscussionDialog] = useState<boolean>(false);
  
  // Check if user has already submitted today (based on local storage)
  useEffect(() => {
    const lastSubmitDate = localStorage.getItem('lastScoreSubmitDate');
    if (lastSubmitDate) {
      const today = new Date().toISOString().split('T')[0];
      if (lastSubmitDate === today) {
        setIsSubmitted(true);
      }
    }
  }, []);
  
  // Calculate the width percentage for progress bars
  const medicationWidth = `${(defaultMetric.medicationScore / 10) * 100}%`;
  const dietWidth = `${(defaultMetric.dietScore / 10) * 100}%`;
  const exerciseWidth = `${(defaultMetric.exerciseScore / 10) * 100}%`;
  
  // Function to handle submission
  const handleSubmit = async () => {
    createHapticFeedback(500, false);
    
    try {
      // This would normally send the data to the server
      // Since we're using in-memory storage, we'll simulate the update
      await apiRequest(
        'POST',
        `/api/users/${defaultMetric.userId}/health-metrics`,
        {
          medicationScore,
          dietScore,
          exerciseScore,
          date: new Date()
        }
      );
      
      // Record submission date in local storage
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('lastScoreSubmitDate', today);
      
      // Save health metrics for chatbot conversation
      localStorage.setItem('lastHealthMetrics', JSON.stringify({
        medicationScore,
        dietScore,
        exerciseScore,
        date: today
      }));
      
      setIsSubmitted(true);
      
      toast({
        title: "Scores submitted successfully",
        description: "Thank you for your daily health update. You may submit again tomorrow.",
      });
      
      // Initialize a conversation about the health scores
      // Mark this feature usage in MCP
      ModelContextProtocol.getInstance(defaultMetric.userId).recordFeatureUsage('health-metrics');
      
      // Show the discussion dialog after a short delay
      setTimeout(() => {
        setShowDiscussionDialog(true);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error submitting scores",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle discussing with the chatbot
  const handleDiscussScores = () => {
    // This function is now handled by ScoreDiscussionDialog's internal logic
    // No need to set chatbot flags or navigate - the dialog handles everything
    setShowDiscussionDialog(false);
  };
  
  // Function to handle declining discussion
  const handleDeclineDiscussion = () => {
    setShowDiscussionDialog(false);
    toast({
      title: "Scores saved",
      description: "You can return to the chatbot any time if you'd like to discuss your progress.",
    });
  };
  
  // Function to render numbered marks on the slider
  const renderSliderMarks = () => {
    return (
      <div className="relative w-full flex justify-between px-1 mt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <div key={num} className="text-xs font-medium text-gray-600">
            {num}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <>
      <Card>
        <CardContent className={cn("p-6", isMobile && "p-4")}>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Slide the Bars for Your Daily Self-Scores</h2>
          
          {isSubmitted ? (
            // Show read-only view when submitted
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", isMobile ? "w-44" : "w-56")}>Healthy Meal Plan</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: dietWidth, backgroundColor: '#4CAF50' }}
                  ></div>
                </div>
                <span className="font-medium w-6 text-right text-green-600">
                  {metric.dietScore}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", isMobile ? "w-44" : "w-56")}>Exercise and Wellness</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: exerciseWidth, backgroundColor: '#2E8BC0' }}
                  ></div>
                </div>
                <span className="font-medium w-6 text-right text-[#2E8BC0]">
                  {metric.exerciseScore}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", isMobile ? "w-44" : "w-56")}>Prescription Medication</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: medicationWidth, backgroundColor: '#E53935' }}
                  ></div>
                </div>
                <span className="font-medium w-6 text-right text-red-600">
                  {metric.medicationScore}
                </span>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-[#2E8BC0] font-medium">You've submitted your scores for today.</p>
                <p className="text-sm text-gray-500 mt-1">You can submit new scores tomorrow at 00:00.</p>
                
                {/* Developer testing tool - normally would be removed in production */}
                <Button
                  onClick={() => {
                    localStorage.removeItem('lastScoreSubmitDate');
                    setIsSubmitted(false);
                    toast({
                      title: "Scores reset",
                      description: "You can now submit new scores for testing purposes.",
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Reset Scores (Testing Only)
                </Button>
              </div>
            </div>
          ) : (
            // Show interactive sliders when not submitted
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Healthy Meal Plan</span>
                  <span className="font-medium text-green-600">{dietScore}</span>
                </div>
                <Slider
                  value={[dietScore]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setDietScore(value[0])}
                  className="slider-green"
                />
                {renderSliderMarks()}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Exercise and Wellness</span>
                  <span className="font-medium text-[#2E8BC0]">{exerciseScore}</span>
                </div>
                <Slider
                  value={[exerciseScore]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setExerciseScore(value[0])}
                  className="slider-blue"
                />
                {renderSliderMarks()}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Prescription Medication</span>
                  <span className="font-medium text-red-600">{medicationScore}</span>
                </div>
                <Slider
                  value={[medicationScore]} 
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setMedicationScore(value[0])}
                  className="slider-red"
                />
                {renderSliderMarks()}
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={handleSubmit}
                  className="bg-[#2E8BC0] hover:bg-[#267cad] w-full md:w-auto"
                >
                  Submit Daily Scores
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Discussion confirmation dialog */}
      <ScoreDiscussionDialog
        open={showDiscussionDialog}
        onOpenChange={setShowDiscussionDialog}
        onConfirm={handleDiscussScores}
        onCancel={handleDeclineDiscussion}
        dietScore={dietScore}
        exerciseScore={exerciseScore}
        medicationScore={medicationScore}
        userId={metric.userId}
      />
    </>
  );
};

export default DailyHealthScore;
