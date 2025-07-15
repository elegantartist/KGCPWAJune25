import React from 'react';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

export type BadgeType = 'exercise' | 'meal' | 'medication';
export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface BadgeDetails {
  type: BadgeType;
  level: BadgeLevel;
}

interface AchievementBadgeProps {
  badge: BadgeDetails;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const badgeBaseColors = {
  exercise: "#4CAF50",
  meal: "#2196F3",
  medication: "#FF9800"
};

const badgeRingColors = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2"
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({ badge, size = 'md', onClick }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div
      className={cn(
        'relative rounded-full flex items-center justify-center transition-transform duration-200',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:scale-105'
      )}
      style={{
        backgroundColor: badgeBaseColors[badge.type],
        border: `4px solid ${badgeRingColors[badge.level]}`,
        boxShadow: `0 0 15px ${badgeRingColors[badge.level]}`
      }}
      onClick={onClick}
    >
      <img
        src="/assets/kgc-logo.jpg"
        alt={`${badge.type} ${badge.level} badge`}
        className="w-full h-full object-cover rounded-full"
      />
      <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
        <Trophy className="h-4 w-4" style={{ color: badgeRingColors[badge.level] }} />
      </div>
    </div>
  );
};
