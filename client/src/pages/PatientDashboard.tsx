import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import KeepGoingModal from '@/components/features/KeepGoingModal';
import DailyScoresModal from '@/components/features/DailyScoresModal';
import ChatModal from '@/components/features/ChatModal';
import Header from '@/components/patient/dashboard/Header';
import MainContent from '@/components/patient/dashboard/MainContent';
import Footer from '@/components/patient/dashboard/Footer';

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
  const { logout } = useAuth();
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
        <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} logout={logout} />
        <MainContent />
        <Footer
          setShowKeepGoing={setShowKeepGoing}
          setShowDailyScores={setShowDailyScores}
          setShowChat={setShowChat}
        />
      </div>
      
      {/* Modals */}
      <KeepGoingModal isOpen={showKeepGoing} onClose={() => setShowKeepGoing(false)} />
      <DailyScoresModal isOpen={showDailyScores} onClose={() => setShowDailyScores(false)} />
      <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
};

export default PatientDashboard;