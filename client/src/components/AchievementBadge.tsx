import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeType = 'meal' | 'diet' | 'exercise' | 'medication';

/**
 * Represents the details of an earned achievement badge.
 * This interface is used throughout the application to display badges.
 */
export interface BadgeDetails {
  type: BadgeType;
  level: BadgeLevel;
  earnedDate?: Date; // Optional: The date the badge was earned.
}

const badgeBaseColors: Record<BadgeType, string> = {
  meal: "#4CAF50",
  diet: "#4CAF50",
  exercise: "#9C27B0",
  medication: "#2196F3"
};

const badgeRingColors: Record<BadgeLevel, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#FFFFFF"
};

const getTypeColorFilter = (type: BadgeType): string => {
  switch (type) {
    case 'meal':
    case 'diet':
      return "hue-rotate(90deg) saturate(80%)";
    case 'exercise':
      return "hue-rotate(270deg) saturate(100%)";
    case 'medication':
      return "hue-rotate(180deg) saturate(80%)";
    default:
      return "none";
  }
};

const getBadgeFilter = (type: BadgeType, level: BadgeLevel): string => {
  const typeFilter = getTypeColorFilter(type);
  let levelAdjustment = "";
  switch (level) {
    case 'bronze':
      levelAdjustment = "brightness(85%) contrast(110%)";
      break;
    case 'silver':
      levelAdjustment = "brightness(110%) contrast(90%)";
      break;
    case 'gold':
      levelAdjustment = "brightness(120%) saturate(120%)";
      break;
    case 'platinum':
      levelAdjustment = "brightness(130%) contrast(90%) saturate(50%)";
      break;
  }
  return `${typeFilter} ${levelAdjustment}`;
};

/**
 * Props for the AchievementBadge component.
 */
interface AchievementBadgeProps {
  /** The badge details object containing type and level. */
  badge: BadgeDetails;
  /** The display size of the badge. */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A reusable component to display a KGC Achievement Badge.
 * It renders the KGC logo with dynamic color filters and a tier ring based on the badge properties.
 */
export const AchievementBadge: React.FC<AchievementBadgeProps> = ({ badge, size = 'md' }) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  };

  const levelIndicator = {
    bronze: 'B',
    silver: 'S',
    gold: 'G',
    platinum: 'P'
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "relative rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-105",
          sizeClasses[size]
        )}
        style={{
          backgroundColor: badgeBaseColors[badge.type],
          boxShadow: `0 0 10px ${badgeRingColors[badge.level]}`,
          border: `3px solid ${badgeRingColors[badge.level]}`
        }}
      >
        <img
          src="/assets/kgc-logo.jpg"
          alt={`${badge.type} - ${badge.level}`}
          className="w-full h-full object-cover"
          style={{ filter: getBadgeFilter(badge.type, badge.level) }}
        />
      </div>
      <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs rounded-full p-1 w-6 h-6 flex items-center justify-center">
        {levelIndicator[badge.level]}
      </div>
    </div>
  );
};