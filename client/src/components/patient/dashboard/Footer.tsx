import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Edit, MessageSquare } from 'lucide-react';

interface FooterProps {
  setShowKeepGoing: (show: boolean) => void;
  setShowDailyScores: (show: boolean) => void;
  setShowChat: (show: boolean) => void;
}

const Footer: React.FC<FooterProps> = ({ setShowKeepGoing, setShowDailyScores, setShowChat }) => {
  return (
    <footer className="grid grid-cols-3 gap-2 sm:gap-4 max-w-4xl mx-auto w-full">
      <Button
        onClick={() => setShowKeepGoing(true)}
        className="h-20 sm:h-24 text-lg metallic-button-blue"
      >
        <Heart className="mr-2 h-6 w-6" /> Keep Going
      </Button>
      <Button
        onClick={() => setShowDailyScores(true)}
        className="h-20 sm:h-24 text-lg metallic-button-blue"
      >
        <Edit className="mr-2 h-6 w-6" /> Daily Scores
      </Button>
      <Button
        onClick={() => setShowChat(true)}
        className="h-20 sm:h-24 text-lg metallic-button-blue"
      >
        <MessageSquare className="mr-2 h-6 w-6" /> Chat
      </Button>
    </footer>
  );
};

export default Footer;
