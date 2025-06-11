import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { format } from "date-fns";

// Define badge levels
export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

// Define badge types
export type BadgeType = 'meal' | 'diet' | 'exercise' | 'medication';

// Map badge types to their titles (updated as requested)
const badgeTitles = {
  meal: "Healthy Eating Hero",
  diet: "Healthy Eating Hero", // Added diet as alias for meal
  exercise: "Exercise Consistency Champion",
  medication: "Medication Maverick"
};

// Map badge types to their descriptions
const badgeDescriptions = {
  meal: {
    bronze: "Maintain target Healthy Meal Plan Self-Score (5-10) for 2 consecutive weeks.",
    silver: "Maintain target Healthy Meal Plan Self-Score (7-10) for 4 consecutive weeks.",
    gold: "Maintain target Healthy Meal Plan Self-Score (8-10) for 16 consecutive weeks.",
    platinum: "Maintain target Healthy Meal Plan Self-Score (9-10) for 24 consecutive weeks."
  },
  diet: {
    bronze: "Maintain target Healthy Meal Plan Self-Score (5-10) for 2 consecutive weeks.",
    silver: "Maintain target Healthy Meal Plan Self-Score (7-10) for 4 consecutive weeks.",
    gold: "Maintain target Healthy Meal Plan Self-Score (8-10) for 16 consecutive weeks.",
    platinum: "Maintain target Healthy Meal Plan Self-Score (9-10) for 24 consecutive weeks."
  },
  exercise: {
    bronze: "Maintain target Exercise Self-Score (5-10) for 2 consecutive weeks.",
    silver: "Maintain target Exercise Self-Score (7-10) for 4 consecutive weeks.",
    gold: "Maintain target Exercise Self-Score (8-10) for 16 consecutive weeks.",
    platinum: "Maintain target Exercise Self-Score (9-10) for 24 consecutive weeks."
  },
  medication: {
    bronze: "Maintain target Prescription Medication Self-Score (5-10) for 2 consecutive weeks.",
    silver: "Maintain target Prescription Medication Self-Score (7-10) for 4 consecutive weeks.",
    gold: "Maintain target Prescription Medication Self-Score (8-10) for 16 consecutive weeks.",
    platinum: "Maintain target Prescription Medication Self-Score (9-10) for 24 consecutive weeks."
  }
};

// Map badge types to their base colors
const badgeBaseColors = {
  meal: "#4CAF50",      // Green for Healthy Eating
  diet: "#4CAF50",      // Green for Healthy Eating (same as meal)
  exercise: "#9C27B0",  // Purple for Exercise
  medication: "#2196F3" // Blue for Mindfulness/Medication
};

// Map levels to ring colors for badges
const badgeRingColors = {
  bronze: "#CD7F32",   // Brown
  silver: "#C0C0C0",   // Grey
  gold: "#FFD700",     // Yellow
  platinum: "#FFFFFF"  // White
};

// Badge details used to display badges
export interface BadgeDetails {
  type: BadgeType;
  level: BadgeLevel;
  earnedDate: Date;
  progress?: number;  // 0-100 progress value
  daysToKeep?: number;
}

// Create a base color filter for each badge type
export const getTypeColorFilter = (type: BadgeType) => {
  switch (type) {
    case 'meal':
    case 'diet': // Handle 'diet' the same as 'meal'
      return "hue-rotate(90deg) saturate(80%)"; // Green filter
    case 'exercise':
      return "hue-rotate(270deg) saturate(100%)"; // Purple filter
    case 'medication':
      return "hue-rotate(180deg) saturate(80%)"; // Blue filter
    default:
      return "none";
  }
};

// Create a combined filter for both type and level
export const getBadgeFilter = (type: BadgeType, level: BadgeLevel) => {
  const typeFilter = getTypeColorFilter(type);
  
  // Level-specific adjustments
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

// Sound effect for badge celebrations - disabled for testing
const playCelebrationSound = () => {
  console.log("Celebration sound effect would play here");
  // In production, uncomment the below code and add the audio file
  /*
  const audio = new Audio("/assets/crowd-cheer.mp3");
  audio.play().catch(error => {
    console.error("Error playing celebration sound:", error);
  });
  
  // Auto-stop after 3 seconds
  setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, 3000);
  */
};

// Component for displaying badges with animations
export const AchievementBadge: React.FC<{
  badge: BadgeDetails;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showDialog?: boolean;
}> = ({ badge, size = "md", onClick, showDialog = false }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(showDialog);
  const [isAnimating, setIsAnimating] = useState(showDialog);
  
  // Size mapping
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  };
  
  // Effect to handle dialog animation
  useEffect(() => {
    if (showDialog) {
      setIsDialogOpen(true);
      setIsAnimating(true);
      // Sound disabled for testing
      // playCelebrationSound();
      
      // Reset animation after it completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [showDialog]);
  
  return (
    <>
      <div className="relative" onClick={onClick}>
        <div 
          className={`relative rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-105 ${sizeClasses[size]}`}
          style={{ 
            backgroundColor: badgeBaseColors[badge.type] || "#4CAF50", // Default to green if type is unknown
            boxShadow: `0 0 10px ${badgeRingColors[badge.level] || "#CD7F32"}`, // Default to bronze if level is unknown
            border: `3px solid ${badgeRingColors[badge.level] || "#CD7F32"}`
          }}
        >
          <img 
            src="/assets/kgc-logo.jpg" 
            alt={`${badgeTitles[badge.type] || badge.type} - ${badge.level}`}
            className="w-full h-full object-cover"
            style={{ filter: getBadgeFilter(badge.type, badge.level) }}
          />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs rounded-full p-1 w-6 h-6 flex items-center justify-center">
          {badge.level === 'bronze' ? 'B' : badge.level === 'silver' ? 'S' : badge.level === 'gold' ? 'G' : 'P'}
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="h-6 w-6 text-primary" />
              Congratulations!
            </DialogTitle>
            <DialogDescription>
              You have earned a new achievement badge!
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center">
            <div 
              className={`relative w-40 h-40 ${isAnimating ? 'animate-bounce' : ''}`}
              style={{ 
                backgroundColor: badgeBaseColors[badge.type] || "#4CAF50", // Default to green if type is unknown
                boxShadow: `0 0 20px ${badgeRingColors[badge.level] || "#CD7F32"}`, // Default to bronze if level is unknown
                borderRadius: '50%',
                border: `5px solid ${badgeRingColors[badge.level] || "#CD7F32"}`
              }}
            >
              <img 
                src="/assets/kgc-logo.jpg" 
                alt={`${badgeTitles[badge.type] || badge.type} - ${badge.level}`}
                className="w-full h-full object-cover rounded-full"
                style={{ filter: getBadgeFilter(badge.type, badge.level) }}
              />
              <div 
                className={`absolute inset-0 rounded-full ${isAnimating ? 'animate-ping' : 'hidden'}`}
                style={{ 
                  backgroundColor: badgeBaseColors[badge.type] || "#4CAF50", // Default to green if type is unknown
                  opacity: 0.3
                }}
              ></div>
            </div>
            
            <h2 className="text-xl font-bold mt-4">{badgeTitles[badge.type] || `${badge.type.charAt(0).toUpperCase() + badge.type.slice(1)} Hero`}</h2>
            <div className="capitalize text-lg font-medium text-primary my-1">
              {badge.level} Level
            </div>
            
            <p className="text-sm text-center text-muted-foreground mt-1">
              {badgeDescriptions[badge.type] && badgeDescriptions[badge.type][badge.level] 
                ? badgeDescriptions[badge.type][badge.level]
                : `Maintain target ${badge.type.charAt(0).toUpperCase() + badge.type.slice(1)} Self-Score for an extended period.`
              }
            </p>
            
            <div className="mt-4 text-sm text-muted-foreground">
              Earned on {format(badge.earnedDate, 'MMMM d, yyyy')}
            </div>
            
            {badge.daysToKeep && (
              <Card className="p-3 w-full mt-4 bg-slate-50">
                <p className="text-sm text-center">
                  Maintain your progress for at least {badge.daysToKeep} more days to keep this badge!
                </p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Component for displaying a grid of badges
export const BadgeCollection: React.FC<{
  badges: BadgeDetails[];
  size?: "sm" | "md" | "lg";
}> = ({ badges, size = "md" }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {badges.map((badge, index) => (
        <AchievementBadge 
          key={`${badge.type}-${badge.level}-${index}`} 
          badge={badge} 
          size={size}
          onClick={() => {}} 
        />
      ))}
    </div>
  );
};