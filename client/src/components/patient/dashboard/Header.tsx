import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface HeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  logout: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMenuOpen, setIsMenuOpen, logout }) => {
  return (
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
  );
};

export default Header;
