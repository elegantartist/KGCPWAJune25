import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BadgeInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const BadgeInfoDialog: React.FC<BadgeInfoDialogProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About Achievement Badges</DialogTitle>
          <DialogDescription>
            KGC achievement badges are awarded for maintaining consistent health scores over time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <h3 className="font-semibold text-lg">Badge Levels</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium text-[#CD7F32]">Bronze:</span> Maintain target Self-Score (5-10) for 2 consecutive weeks</p>
            <p><span className="font-medium text-[#C0C0C0]">Silver:</span> Maintain target Self-Score (7-10) for 4 consecutive weeks</p>
            <p><span className="font-medium text-[#FFD700]">Gold:</span> Maintain target Self-Score (8-10) for 16 consecutive weeks</p>
            <p><span className="font-medium text-gray-800">Platinum:</span> Maintain target Self-Score (9-10) for 24 consecutive weeks</p>
          </div>
          <h3 className="font-semibold text-lg mt-2">Badge Categories</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium text-green-600">Healthy Eating Hero:</span> Awarded for consistent healthy eating habits.</p>
            <p><span className="font-medium text-purple-600">Exercise Consistency Champion:</span> Awarded for maintaining regular exercise routines.</p>
            <p><span className="font-medium text-blue-600">Medication Maverick:</span> Awarded for consistency with medication adherence.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeInfoDialog;