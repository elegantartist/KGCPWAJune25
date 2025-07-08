import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AchievementBadge, BadgeDetails } from '@/components/AchievementBadge';
import { Trophy } from 'lucide-react';

interface BadgeAwardModalProps {
  badge: BadgeDetails;
  isOpen: boolean;
  onClose: () => void;
}

const badgeTitles: Record<string, string> = {
  meal: "Healthy Eating Hero",
  diet: "Healthy Eating Hero",
  exercise: "Exercise Consistency Champion",
  medication: "Medication Maverick"
};

const BadgeAwardModal: React.FC<BadgeAwardModalProps> = ({ badge, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const audio = new Audio('/assets/crowd-cheer.mp3');
      audio.play().catch(error => console.error("Error playing sound:", error));

      const timer = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl justify-center"><Trophy className="h-6 w-6 text-yellow-500" />Congratulations!</DialogTitle>
          <DialogDescription className="text-center">You've earned a new achievement badge!</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-4">
          <div className="animate-bounce"><AchievementBadge badge={badge} size="lg" /></div>
          <h2 className="text-xl font-bold mt-4">{badgeTitles[badge.type] || 'New Badge'}</h2>
          <p className="capitalize text-lg font-medium text-primary my-1">{badge.level} Level</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeAwardModal;