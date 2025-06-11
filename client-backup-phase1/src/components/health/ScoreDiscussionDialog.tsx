import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import HealthAnalysisDialog from "./HealthAnalysisDialog";

interface ScoreDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  dietScore?: number;
  exerciseScore?: number;
  medicationScore?: number;
  userId?: number;
}

const ScoreDiscussionDialog: React.FC<ScoreDiscussionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  dietScore = 5,
  exerciseScore = 5,
  medicationScore = 5,
  userId = 1,
}) => {
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  
  // Handle confirm click - showing analysis in popup instead of navigating
  const handleConfirmClick = () => {
    // Close the confirmation dialog
    onOpenChange(false);
    // Show the analysis dialog
    setShowAnalysisDialog(true);
    
    // We no longer need these flags for chatbot navigation, but we'll
    // still save the analysis data for chatbot context
    const healthAnalysisData = {
      dietScore,
      exerciseScore,
      medicationScore,
      date: new Date().toISOString(),
      analysisType: 'comprehensive'
    };
    localStorage.setItem('lastHealthAnalysis', JSON.stringify(healthAnalysisData));
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyse Your Health Scores?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to receive analysis of your health scores from the KGC Health Assistant? 
              This can help you identify areas for improvement and celebrate your progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClick}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Health Analysis Dialog */}
      <HealthAnalysisDialog 
        open={showAnalysisDialog}
        onOpenChange={setShowAnalysisDialog}
        dietScore={dietScore}
        exerciseScore={exerciseScore}
        medicationScore={medicationScore}
        userId={userId}
      />
    </>
  );
};

export default ScoreDiscussionDialog;