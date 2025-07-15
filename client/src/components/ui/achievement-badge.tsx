import React from 'react';
import { Badge } from '@/hooks/useBadges';

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

interface AchievementBadgeProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function AchievementBadge({ badge, size = 'md', onClick }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full cursor-pointer transition-all duration-200 hover:scale-105`}
      onClick={onClick}
      style={{
        backgroundColor: badgeBaseColors[badge.type],
        border: `4px solid ${badgeRingColors[badge.level]}`,
        boxShadow: `0 4px 12px ${badgeRingColors[badge.level]}40`
      }}
    >
      <img
        src="/assets/kgc-logo.jpg"
        alt={`${badge.type} ${badge.level} badge`}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
}