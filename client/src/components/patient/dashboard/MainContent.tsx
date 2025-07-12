import React from 'react';
import { useAuth } from '@/hooks/useAuth';

const MainContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <main className="flex-grow flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl sm:text-4xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
        Welcome, {user?.name}
      </h1>
      <p className="mt-2 text-lg sm:text-xl" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
        Your daily inspiration to keep going.
      </p>
    </main>
  );
};

export default MainContent;
