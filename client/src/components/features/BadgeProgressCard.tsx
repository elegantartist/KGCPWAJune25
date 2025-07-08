import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { AchievementBadge, BadgeDetails, BadgeType, BadgeLevel, getBadgeFilter } from '@/components/AchievementBadge';

interface BadgeProgressCardProps {
  type: BadgeType;
  title: string;
  description: string;
  currentLevel: BadgeLevel | null;
  nextLevel: BadgeLevel;
  progress: number;
  weeksCompleted: number;
  weeksRequired: number;
}

const getTypeColor = (badgeType: BadgeType): string => {
  switch (badgeType) {
    case 'meal':
    case 'diet':
      return "#4CAF50"; // Green
    case 'exercise':
      return "#9C27B0"; // Purple
    case 'medication':
      return "#2196F3"; // Blue
    default:
      return "#2E8BC0"; // Default blue
  }
};

export const BadgeProgressCard: React.FC<BadgeProgressCardProps> = ({ type, title, description, currentLevel, nextLevel, progress, weeksCompleted, weeksRequired }) => {
  const badgeDetails: BadgeDetails = { type, level: nextLevel };

  return (
    <Card className="border-[#2E8BC0]/20 hover:border-[#2E8BC0]/10 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start mb-3">
          <div className="flex-shrink-0 mr-4">
            <AchievementBadge badge={badgeDetails} size="md" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-[#676767]">{title}</h3>
                <p className="text-sm text-[#a4a4a4]">{description}</p>
              </div>
              {currentLevel && (
                <Badge className="bg-primary capitalize">{currentLevel}</Badge>
              )}
            </div>
            <div className="mt-3">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-[#676767]">Progress to {nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1)}</span>
                <span className="text-[#2E8BC0] font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" style={{ "--progress-background": getTypeColor(type) } as React.CSSProperties} />
            </div>
            <div className="mt-3 text-sm text-[#676767] flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{weeksCompleted} of {weeksRequired} weeks completed</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};