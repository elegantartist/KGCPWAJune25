import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiRequest';
import { BadgeDetails, BadgeType, BadgeLevel } from '@/components/achievement-badge';

interface BadgeProgress {
  currentLevel: BadgeLevel | null;
  nextLevel: BadgeLevel;
  progress: number;
  weeksCompleted: number;
  weeksRequired: number;
}

interface MilestoneStatus {
  earnedBadges: BadgeDetails[];
  badgeProgress: Record<BadgeType, BadgeProgress>;
  newlyAwardedBadge: BadgeDetails | null;
}

/**
 * Custom hook to fetch and manage a patient's progress milestones.
 * @param userId The ID of the patient.
 */
export function useBadges(userId?: number) {
  const [newlyAwardedBadge, setNewlyAwardedBadge] = useState<BadgeDetails | null>(null);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery<MilestoneStatus>({
    queryKey: ['milestones', userId],
    queryFn: async () => {
      const response = await apiRequest(`/api/patient/milestones`);
      if (!response.ok) {
        throw new Error('Failed to fetch milestone data.');
      }
      return response.json();
    },
    enabled: !!userId, // Only run the query if userId is available
  });

  // Effect to trigger the celebration modal when a new badge is awarded
  useEffect(() => {
    if (data?.newlyAwardedBadge) {
      setNewlyAwardedBadge(data.newlyAwardedBadge);
      setIsAwardModalOpen(true);
    }
  }, [data?.newlyAwardedBadge]);

  const closeAwardModal = () => {
    setIsAwardModalOpen(false);
    // We don't clear newlyAwardedBadge immediately to avoid flicker
  };

  return {
    badges: data?.earnedBadges ?? [],
    badgeProgress: data?.badgeProgress,
    isLoading,
    error,
    newlyAwardedBadge,
    isAwardModalOpen,
    closeAwardModal,
  };
}