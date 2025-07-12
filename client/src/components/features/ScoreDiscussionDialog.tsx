import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart, Utensils, Activity, Pill } from 'lucide-react';

interface ScoreDiscussionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  scores: {
    dietScore: number;
    exerciseScore: number;
    medicationScore: number;
  };
  analysis?: {
    isLoading: boolean;
    message: string;
    error: boolean;
  };
}

const ScoreSummaryItem = ({ label, score, color, Icon }: { label: string; score: number; color: string; Icon: React.ElementType }) => (
  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
    <div className="flex items-center">
      <Icon className={`h-5 w-5 mr-3 text-${color}-600`} />
      <span className="font-medium text-gray-700">{label}</span>
    </div>
    <span className={`font-bold text-lg text-${color}-600`}>{score}/10</span>
  </div>
);

const ScoreDiscussionDialog: React.FC<ScoreDiscussionDialogProps> = ({ isOpen, onClose, onConfirm, scores }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart className="h-5 w-5 text-blue-600" />
            Great job submitting your scores!
          </DialogTitle>
          <DialogDescription>
            Your scores have been saved. Would you like to discuss your progress with KGC?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <ScoreSummaryItem label="Healthy Meal Plan" score={scores.dietScore} color="green" Icon={Utensils} />
          <ScoreSummaryItem label="Exercise & Wellness" score={scores.exerciseScore} color="blue" Icon={Activity} />
          <ScoreSummaryItem label="Prescribed Medication" score={scores.medicationScore} color="red" Icon={Pill} />
        </div>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">
            Not now
          </Button>
          <Button onClick={onConfirm} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
            Let's discuss with KGC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScoreDiscussionDialog;