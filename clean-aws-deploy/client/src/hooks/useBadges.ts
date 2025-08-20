import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BadgeType, BadgeLevel } from '@/components/achievement-badge';

// Badge data from API
export interface ApiBadge {
  id: number;
  patientId: number;
  badgeType: string; // 'exercise', 'meal', 'medication'
  badgeLevel: string; // 'bronze', 'silver', 'gold', 'platinum'
  earnedDate: string;
  notificationSent: boolean;
}

// Mapped badge for display
export interface Badge {
  type: BadgeType;
  level: BadgeLevel;
  earnedDate: Date;
  progress?: number;
}

// Progress data for next badge level
export interface BadgeProgress {
  type: BadgeType;
  currentLevel: BadgeLevel | null;
  nextLevel: BadgeLevel;
  progress: number;
  weeksCompleted: number;
  weeksRequired: number;
}

// Badge Criteria (from server)
const badgeCriteria = {
  bronze: { weeks: 2, minScore: 5 }, // 2 weeks of 5-10 scores
  silver: { weeks: 4, minScore: 7 }, // 4 weeks of 7-10 scores
  gold: { weeks: 16, minScore: 8 },  // 16 weeks of 8-10 scores
  platinum: { weeks: 24, minScore: 9 } // 24 weeks of 9-10 scores
};

export function useBadges(patientId: number) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<Record<BadgeType, BadgeProgress>>({
    exercise: {
      type: 'exercise',
      currentLevel: null,
      nextLevel: 'bronze',
      progress: 0,
      weeksCompleted: 0,
      weeksRequired: 2
    },
    meal: {
      type: 'meal',
      currentLevel: null,
      nextLevel: 'bronze',
      progress: 0,
      weeksCompleted: 0,
      weeksRequired: 2
    },
    medication: {
      type: 'medication',
      currentLevel: null,
      nextLevel: 'bronze',
      progress: 0,
      weeksCompleted: 0,
      weeksRequired: 2
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  // Fetch badges from API (using correct progress milestones endpoint)
  const fetchBadges = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch badges from the correct endpoint - progress milestones
      const response = await axios.get(`/api/users/${patientId}/progress-milestones`);
      const milestones = response.data;
      
      // Filter only badge-related milestones (those with financial reward value)
      const badgeMilestones = milestones.filter((m: any) => 
        m.category && ['exercise', 'diet', 'medication'].includes(m.category) &&
        m.description && m.description.includes('financial reward value')
      );
      
      // Map to badge format
      const mappedBadges: Badge[] = badgeMilestones.map((milestone: any) => {
        // Extract badge type from category
        let badgeType: BadgeType = 'exercise';
        if (milestone.category === 'diet') badgeType = 'meal';
        else if (milestone.category === 'medication') badgeType = 'medication';
        else if (milestone.category === 'exercise') badgeType = 'exercise';
        
        // Extract level from title (Bronze/Silver/Gold/Platinum)
        let level: BadgeLevel = 'bronze';
        const title = milestone.title.toLowerCase();
        if (title.includes('silver')) level = 'silver';
        else if (title.includes('gold')) level = 'gold';
        else if (title.includes('platinum')) level = 'platinum';
        
        return {
          type: badgeType,
          level: level,
          earnedDate: new Date(milestone.completedDate || milestone.createdAt)
        };
      });
      
      console.log('[useBadges] Fetched live badges from database:', mappedBadges);
      setBadges(mappedBadges);
      
      // Update badge progress based on current badges
      calculateBadgeProgress(mappedBadges);
      
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError('Failed to fetch badges');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Calculate progress toward next badge for each type
  const calculateBadgeProgress = (currentBadges: Badge[]) => {
    const progress: Record<BadgeType, BadgeProgress> = {
      exercise: {
        type: 'exercise',
        currentLevel: null,
        nextLevel: 'bronze',
        progress: 20, // Default to 20% progress for now
        weeksCompleted: 0,
        weeksRequired: 2
      },
      meal: {
        type: 'meal',
        currentLevel: null,
        nextLevel: 'bronze',
        progress: 15, // Default to 15% progress for now
        weeksCompleted: 0,
        weeksRequired: 2
      },
      medication: {
        type: 'medication',
        currentLevel: null,
        nextLevel: 'bronze',
        progress: 10, // Default to 10% progress for now
        weeksCompleted: 0,
        weeksRequired: 2
      }
    };
    
    // Process badges to find current level for each type
    const badgeTypes: BadgeType[] = ['exercise', 'meal', 'medication'];
    badgeTypes.forEach(type => {
      const badgesOfType = currentBadges.filter(b => b.type === type);
      
      if (badgesOfType.length > 0) {
        // Find the highest level badge
        const levels: BadgeLevel[] = ['bronze', 'silver', 'gold', 'platinum'];
        let highestLevelIndex = -1;
        
        badgesOfType.forEach(badge => {
          const levelIndex = levels.indexOf(badge.level);
          if (levelIndex > highestLevelIndex) {
            highestLevelIndex = levelIndex;
          }
        });
        
        const currentLevel = levels[highestLevelIndex];
        progress[type].currentLevel = currentLevel;
        
        // Set next level
        if (currentLevel !== 'platinum') {
          progress[type].nextLevel = levels[highestLevelIndex + 1];
          progress[type].weeksRequired = badgeCriteria[levels[highestLevelIndex + 1]].weeks;
        } else {
          // Already at highest level
          progress[type].nextLevel = 'platinum';
          progress[type].progress = 100;
        }
      }
    });
    
    setBadgeProgress(progress);
  };

  // Check for new badges
  const checkForNewBadges = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      const response = await axios.post<ApiBadge[]>(`/api/badges/check/${patientId}`);
      
      // Compare with current badges to find new ones
      const currentBadgeKeys = badges.map(b => `${b.type}-${b.level}`);
      const newBadges = response.data
        .map(badge => ({
          type: badge.badgeType as BadgeType,
          level: badge.badgeLevel as BadgeLevel,
          earnedDate: new Date(badge.earnedDate)
        }))
        .filter(badge => !currentBadgeKeys.includes(`${badge.type}-${badge.level}`));
      
      // If there are new badges, update state
      if (newBadges.length > 0) {
        setBadges(prev => [...prev, ...newBadges]);
        setNewBadge(newBadges[0]); // Show the first new badge
        
        // Update progress for all badge types
        calculateBadgeProgress([...badges, ...newBadges]);
      } else {
        setNewBadge(null);
      }
      
      return newBadges.length > 0;
    } catch (err) {
      console.error('Error checking for new badges:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [patientId, badges]);

  // Submit self-scores for a patient
  const submitSelfScores = useCallback(async (
    scoreData: {
      scoreDate?: Date;
      exerciseSelfScore?: number;
      mealPlanSelfScore?: number;
      medicationSelfScore?: number;
      notes?: string;
    }
  ) => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      await axios.post('/api/patient-scores', {
        patientId,
        ...scoreData,
        scoreDate: scoreData.scoreDate?.toISOString() || new Date().toISOString()
      });
      
      // Check for new badges after submitting scores
      return await checkForNewBadges();
    } catch (err) {
      console.error('Error submitting self-scores:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [patientId, checkForNewBadges]);

  // Load badges on component mount
  useEffect(() => {
    if (patientId) {
      fetchBadges();
    }
  }, [patientId, fetchBadges]);

  // Clear new badge animation state
  const clearNewBadge = useCallback(() => {
    setNewBadge(null);
  }, []);

  return {
    badges,
    badgeProgress,
    loading,
    error,
    newBadge,
    fetchBadges,
    checkForNewBadges,
    submitSelfScores,
    clearNewBadge
  };
}