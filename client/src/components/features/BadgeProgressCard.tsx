import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Utensils, Pill } from 'lucide-react';

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

const badgeCriteria = {
  bronze: { weeks: 2, minScore: 5 },
  silver: { weeks: 4, minScore: 7 },
  gold: { weeks: 16, minScore: 8 },
  platinum: { weeks: 24, minScore: 9 }
};

interface BadgeProgressCardProps {
  type: 'exercise' | 'meal' | 'medication';
  title: string;
  description: string;
  currentLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  nextLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  weeksCompleted: number;
  weeksRequired: number;
}

export function BadgeProgressCard({
  type, title, description, currentLevel, nextLevel,
  progress, weeksCompleted, weeksRequired
}: BadgeProgressCardProps) {
  const IconComponent = type === 'exercise' ? Activity :
    type === 'meal' ? Utensils : Pill;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: badgeBaseColors[type] }}
        >
          <IconComponent className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-[#676767]">{title}</h3>
          <p className="text-sm text-[#a4a4a4]">{description}</p>
        </div>
      </div>

      {currentLevel && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#676767]">Current Level:</span>
          <Badge
            className="capitalize text-white"
            style={{ backgroundColor: badgeRingColors[currentLevel] }}
          >
            {currentLevel}
          </Badge>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between text-sm text-[#676767]">
          <span>Progress to {nextLevel}</span>
          <span className="font-medium">{weeksCompleted}/{weeksRequired} weeks</span>
        </div>

        <Progress
          value={progress}
          className="h-3"
          style={{
            '--progress-background': badgeBaseColors[type]
          } as React.CSSProperties}
        />

        <div className="flex justify-between text-xs text-[#a4a4a4]">
          <span>{progress}% complete</span>
          <span>{weeksRequired - weeksCompleted} weeks remaining</span>
        </div>
      </div>

      <div className="text-xs text-[#676767] bg-gray-50 p-3 rounded-md">
        <strong className="capitalize">{nextLevel} criteria:</strong> {weeksRequired} consecutive weeks
        of {badgeCriteria[nextLevel].minScore}-10 daily scores
      </div>
    </div>
  );
}
