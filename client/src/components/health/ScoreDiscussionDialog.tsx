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
// HealthAnalysisDialog removed - simple workflow now handles score analysis

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
  userId = 2, // Reuben Collins - Patient
}) => {
  // Handle confirm click - simple workflow now handles analysis
  const handleConfirmClick = () => {
    onConfirm();
    onOpenChange(false);
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
      
      {/* Analysis is now handled by the simple workflow in daily-self-scores.tsx */}
    </>
  );
};

export default ScoreDiscussionDialog;