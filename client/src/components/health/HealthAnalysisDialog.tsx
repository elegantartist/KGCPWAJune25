import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
// import { generateHealthScoreAnalysis } from "@/lib/healthScoreAnalysis"; // TODO: Implement this function
import { ModelContextProtocol } from "@/components/chatbot/ModelContextProtocol";

interface HealthAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dietScore: number;
  exerciseScore: number;
  medicationScore: number;
  userId: number;
}

const HealthAnalysisDialog: React.FC<HealthAnalysisDialogProps> = ({
  open,
  onOpenChange,
  dietScore,
  exerciseScore,
  medicationScore,
  userId,
}) => {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      
      // Record this analysis in the MCP system for chatbot context
      ModelContextProtocol.getInstance(userId).recordFeatureUsage('health-analysis');
      
      // Store in localStorage for potential follow-up in chatbot
      const healthAnalysisData = {
        dietScore,
        exerciseScore,
        medicationScore,
        date: new Date().toISOString(),
        analysisType: 'comprehensive'
      };
      localStorage.setItem('lastHealthAnalysis', JSON.stringify(healthAnalysisData));
      
      // Generate the analysis (with a slight delay to show loading state)
      setTimeout(() => {
        try {
          // Generate simple analysis text
          const analysisText = `## Health Score Analysis

**Diet Score:** ${dietScore}/10
**Exercise Score:** ${exerciseScore}/10
**Medication Score:** ${medicationScore}/10

### Overall Assessment
Your health scores show ${(dietScore + exerciseScore + medicationScore) / 3 > 7 ? 'excellent' : (dietScore + exerciseScore + medicationScore) / 3 > 5 ? 'good' : 'room for improvement'} progress in your health journey.`;
          
          setAnalysis(analysisText);
          setLoading(false);
          
          // Also save the generated text for chatbot context
          localStorage.setItem('lastHealthAnalysisText', analysisText);
        } catch (error) {
          console.error("Error generating health analysis:", error);
          setAnalysis("Sorry, we couldn't generate your health analysis at this time. Please try again later.");
          setLoading(false);
        }
      }, 1500); // 1.5 second delay to show loading state
    }
  }, [open, dietScore, exerciseScore, medicationScore, userId]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Health Score Analysis</DialogTitle>
          <DialogDescription>
            A comprehensive analysis of your daily health scores
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#2E8BC0] mb-4" />
            <p className="text-muted-foreground">Analysing your health scores...</p>
          </div>
        ) : (
          <div className="prose prose-blue max-w-none dark:prose-invert">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        )}
        
        <DialogFooter className="sm:justify-between flex flex-row items-center mt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <p className="text-xs text-muted-foreground">
            You can discuss this analysis further in the KGC Chatbot
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HealthAnalysisDialog;