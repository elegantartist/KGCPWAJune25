import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import EnhancedSupervisorAgent from '@/components/chatbot/EnhancedSupervisorAgent';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Per the design, check for an initial message from the scores discussion flow
      const initialMessage = sessionStorage.getItem('kgc_chatbot_init_message');
      if (initialMessage) {
        // Here, you would pass the initialMessage to the EnhancedSupervisorAgent
        console.log("Chat opened with initial message:", initialMessage);
        sessionStorage.removeItem('kgc_chatbot_init_message');
      }
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0">
        <EnhancedSupervisorAgent />
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;