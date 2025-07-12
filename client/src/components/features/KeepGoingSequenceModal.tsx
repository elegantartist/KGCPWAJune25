import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface KeepGoingSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeepGoingSequenceModal: React.FC<KeepGoingSequenceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keep Going Sequence</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>This is a placeholder for the Keep Going Sequence feature.</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KeepGoingSequenceModal;
