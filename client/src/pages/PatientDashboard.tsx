import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { LogOut, Menu, Heart, Edit, MessageSquare } from 'lucide-react';
import KeepGoingModal from '@/components/features/KeepGoingModal';
import DailyScoresModal from '@/components/features/DailyScoresModal';
import ChatModal from '@/components/features/ChatModal';

const carouselImages = [
  '/assets/carousel-image-1.jpg',
  '/assets/carousel-image-2.jpg',
  '/assets/carousel-image-3.jpg',
  '/assets/carousel-image-4.jpg',
  '/assets/carousel-image-5.jpg',
  '/assets/carousel-image-6.jpg',
  '/assets/carousel-image-7.jpg',
];

const PatientDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // State for modals
  const [showKeepGoing, setShowKeepGoing] = useState(false);
  const [showDailyScores, setShowDailyScores] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Per the design, automatically open the chat if there's a message from the scores flow
  useEffect(() => {
    const initialMessage = sessionStorage.getItem('kgc_chatbot_init_message');
    if (initialMessage) {
      setShowChat(true);
    }
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      <ImageCarousel images={carouselImages} />

      <div className="relative z-10 flex flex-col h-full p-4 sm:p-6">
        {/* Top Bar */}
        <header className="flex justify-between items-center">
          {/* Orientation Video */}
          <div className="w-24 h-14 sm:w-32 sm:h-20 bg-black rounded-lg overflow-hidden shadow-lg">
            <video
              src="/assets/orientation-video.mp4" // Placeholder for orientation video
              poster="/assets/orientation-poster.jpg"
              controls
              className="w-full h-full object-cover"
            />
          </div>

          {/* Animated Logo */}
          <div className="flex-grow flex justify-center">
            <img 
              src="/assets/kgc-logo-prominent.png" 
              alt="KGC Logo" 
              className="w-20 h-20 sm:w-24 sm:h-24 kgc-logo-animated"
            />
          </div>

          {/* Dropdown Menu */}
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white hover:bg-white/20">
              <Menu className="h-8 w-8" />
            </Button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-sm rounded-md shadow-lg text-black py-1">
                <Link href="/progress-milestones" className="block px-4 py-2 text-sm hover:bg-gray-200">Progress & Rewards</Link>
                <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-200">Logout</button>
              </div>
            )}
          </div>
        </header>

        {/* Middle Section (Motivational Message) */}
        <main className="flex-grow flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
            Welcome, {user?.name}
          </h1>
          <p className="mt-2 text-lg sm:text-xl" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
            Your daily inspiration to keep going.
          </p>
        </main>

        {/* Bottom Bar (Buttons) */}
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
      </div>
      
      {/* Modals */}
      <KeepGoingModal isOpen={showKeepGoing} onClose={() => setShowKeepGoing(false)} />
      <DailyScoresModal isOpen={showDailyScores} onClose={() => setShowDailyScores(false)} />
      <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
};

export default PatientDashboard;