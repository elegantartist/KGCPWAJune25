
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MilestoneAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone?: {
    title: string;
    description: string;
  };
}

export default function MilestoneAwardModal({ isOpen, onClose, milestone }: MilestoneAwardModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🎉 Milestone Achieved!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {milestone && (
            <>
              <h3 className="text-lg font-semibold">{milestone.title}</h3>
              <p>{milestone.description}</p>
            </>
          )}
          <div className="flex justify-end">
            <Button onClick={onClose}>Awesome!</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}