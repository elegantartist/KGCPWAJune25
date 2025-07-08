import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { BadgeDetails } from '@/components/AchievementBadge';
import BadgeAwardModal from '@/components/features/BadgeAwardModal';

interface BadgeAwardContextType {
  showAward: (badge: BadgeDetails) => void;
}

const BadgeAwardContext = createContext<BadgeAwardContextType | undefined>(undefined);

export const BadgeAwardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [awardedBadge, setAwardedBadge] = useState<BadgeDetails | null>(null);

  const showAward = useCallback((badge: BadgeDetails) => {
    setAwardedBadge(badge);
  }, []);

  const handleClose = () => {
    setAwardedBadge(null);
  };

  return (
    <BadgeAwardContext.Provider value={{ showAward }}>
      {children}
      {awardedBadge && (
        <BadgeAwardModal
          badge={awardedBadge}
          isOpen={!!awardedBadge}
          onClose={handleClose}
        />
      )}
    </BadgeAwardContext.Provider>
  );
};

export const useBadgeAward = (): BadgeAwardContextType => {
  const context = useContext(BadgeAwardContext);
  if (!context) {
    throw new Error('useBadgeAward must be used within a BadgeAwardProvider');
  }
  return context;
};