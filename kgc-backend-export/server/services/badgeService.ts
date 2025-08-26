import { db } from '../db';
import { patientScores, patientBadges } from '@shared/schema';
import { eq, and, lte, gte, desc } from 'drizzle-orm';
import { emailService } from './emailService';

/**
 * Badge Service for tracking and awarding achievement badges based on patient scores
 */
class BadgeService {
  // Badge criteria configuration
  private badgeCriteria = {
    bronze: { weeks: 2, minScore: 5 }, // 2 weeks of 5-10 scores
    silver: { weeks: 4, minScore: 7 }, // 4 weeks of 7-10 scores
    gold: { weeks: 16, minScore: 8 },  // 16 weeks of 8-10 scores
    platinum: { weeks: 24, minScore: 9 } // 24 weeks of 9-10 scores
  };
  
  // Badge types
  private badgeTypes = ['exercise', 'meal', 'medication'];
  
  // Badge levels in order from lowest to highest
  private badgeLevels = ['bronze', 'silver', 'gold', 'platinum'];
  
  /**
   * Check if a patient has earned new badges based on their score history
   * @param patientId - The patient's ID
   * @param patientName - The patient's name
   * @param patientEmail - The patient's email
   * @param uin - The patient's UIN
   * @returns An array of newly earned badges
   */
  async checkAndUpdateBadges(
    patientId: number,
    patientName: string,
    patientEmail: string,
    uin: string
  ): Promise<any[]> {
    try {
      // 1. Get patient's score history
      const patientScoreHistory = await db.select().from(patientScores)
        .where(eq(patientScores.patientId, patientId))
        .orderBy(desc(patientScores.scoreDate));
      
      if (patientScoreHistory.length === 0) {
        return []; // No scores yet
      }
      
      // 2. Get patient's current badges
      const existingBadges = await db.select().from(patientBadges)
        .where(eq(patientBadges.patientId, patientId));
      
      // 3. Check each badge type (exercise, meal, medication)
      const newlyEarnedBadges = [];
      
      for (const badgeType of this.badgeTypes) {
        // Get scores for the relevant category
        const scoresForType = patientScoreHistory.map(score => {
          let scoreValue: number;
          
          switch (badgeType) {
            case 'exercise':
              scoreValue = score.exerciseSelfScore || 0;
              break;
            case 'meal':
              scoreValue = score.mealPlanSelfScore || 0;
              break;
            case 'medication':
              scoreValue = score.medicationSelfScore || 0;
              break;
            default:
              scoreValue = 0;
          }
          
          return {
            date: new Date(score.scoreDate),
            score: scoreValue
          };
        });
        
        // Get the badges the patient already has for this type
        const existingBadgesForType = existingBadges
          .filter(badge => badge.badgeType === badgeType)
          .map(badge => badge.badgeLevel);
        
        // Check for each badge level, starting from highest
        for (let i = this.badgeLevels.length - 1; i >= 0; i--) {
          const level = this.badgeLevels[i];
          
          // Skip if patient already has this badge level for this type
          if (existingBadgesForType.includes(level)) {
            continue;
          }
          
          // Skip if patient has a higher level badge already
          if (i < this.badgeLevels.length - 1) {
            const higherLevels = this.badgeLevels.slice(i + 1);
            if (higherLevels.some(l => existingBadgesForType.includes(l))) {
              continue;
            }
          }
          
          // Check if patient qualifies for this badge level
          const criteria = this.badgeCriteria[level];
          
          // Look at consecutive weeks with scores at or above the minimum
          let consecutiveWeeks = 0;
          let currentWeekStart = new Date();
          currentWeekStart.setHours(0, 0, 0, 0);
          currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of current week (Sunday)
          
          // Go back criteria.weeks * 7 days to check
          const totalDaysToCheck = criteria.weeks * 7;
          const scoresByWeek = new Map();
          
          // Group scores by week
          for (const scoreEntry of scoresForType) {
            const scoreDate = new Date(scoreEntry.date);
            const weekStart = new Date(scoreDate);
            weekStart.setHours(0, 0, 0, 0);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
            
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!scoresByWeek.has(weekKey)) {
              scoresByWeek.set(weekKey, []);
            }
            
            scoresByWeek.get(weekKey).push(scoreEntry.score);
          }
          
          // Check each week
          let checkDate = new Date(currentWeekStart);
          for (let week = 0; week < criteria.weeks; week++) {
            checkDate.setDate(checkDate.getDate() - 7); // Go back one week
            const weekKey = checkDate.toISOString().split('T')[0];
            
            const weekScores = scoresByWeek.get(weekKey) || [];
            
            // Need at least 3 scores per week
            if (weekScores.length >= 3) {
              // Check if average is at or above minimum
              const avgScore = weekScores.reduce((sum, score) => sum + score, 0) / weekScores.length;
              if (avgScore >= criteria.minScore) {
                consecutiveWeeks++;
              } else {
                break; // Streak broken
              }
            } else {
              break; // Not enough scores this week
            }
          }
          
          // If met the criteria, award the badge
          if (consecutiveWeeks >= criteria.weeks) {
            // Create new badge in database
            const [newBadge] = await db.insert(patientBadges).values({
              patientId,
              badgeType,
              badgeLevel: level,
              earnedDate: new Date(),
              notificationSent: false
            }).returning();
            
            // Send notification
            await emailService.sendBadgeNotification(
              patientId,
              patientName,
              patientEmail,
              badgeType,
              level,
              uin
            );
            
            // Mark notification as sent
            await db.update(patientBadges)
              .set({ notificationSent: true })
              .where(eq(patientBadges.id, newBadge.id));
            
            newlyEarnedBadges.push(newBadge);
            
            // Break to prevent checking lower levels for this type
            break;
          }
        }
      }
      
      // 4. Check if patient has earned all platinum badges
      if (newlyEarnedBadges.length > 0) {
        // Get all badges after adding new ones
        const allBadges = await db.select().from(patientBadges)
          .where(eq(patientBadges.patientId, patientId));
        
        // Check for platinum in all categories
        const hasPlatinumExercise = allBadges.some(b => b.badgeType === 'exercise' && b.badgeLevel === 'platinum');
        const hasPlatinumMeal = allBadges.some(b => b.badgeType === 'meal' && b.badgeLevel === 'platinum');
        const hasPlatinumMedication = allBadges.some(b => b.badgeType === 'medication' && b.badgeLevel === 'platinum');
        
        const hasAllPlatinum = hasPlatinumExercise && hasPlatinumMeal && hasPlatinumMedication;
        
        if (hasAllPlatinum) {
          // Check if we have a newly earned platinum badge in any category
          const hasNewPlatinum = newlyEarnedBadges.some(b => b.badgeLevel === 'platinum');
          
          if (hasNewPlatinum) {
            // Send notification for $100 voucher
            await emailService.sendAllPlatinumNotification(
              patientId,
              patientName,
              patientEmail,
              uin
            );
          }
        }
      }
      
      return newlyEarnedBadges;
      
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }
  
  /**
   * Get a patient's badge progress for each badge type
   * @param patientId - The patient's ID
   * @returns Object with progress info for each badge type
   */
  async getPatientBadgeProgress(patientId: number): Promise<any> {
    try {
      // Get patient's badge history
      const badgeHistory = await db.select().from(patientBadges)
        .where(eq(patientBadges.patientId, patientId));
      
      // Get patient's score history for last 24 weeks
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (24 * 7)); // 24 weeks ago
      
      const scoreHistory = await db.select().from(patientScores)
        .where(
          and(
            eq(patientScores.patientId, patientId),
            gte(patientScores.scoreDate, startDate)
          )
        )
        .orderBy(desc(patientScores.scoreDate));
      
      // Prepare progress data
      const progress = {};
      
      for (const badgeType of this.badgeTypes) {
        // Find highest badge level for this type
        const badgesForType = badgeHistory.filter(badge => badge.badgeType === badgeType);
        let currentBadgeLevel = null;
        let currentBadgeLevelIndex = -1;
        
        if (badgesForType.length > 0) {
          // Find highest level badge
          for (let i = 0; i < this.badgeLevels.length; i++) {
            if (badgesForType.some(badge => badge.badgeLevel === this.badgeLevels[i])) {
              currentBadgeLevel = this.badgeLevels[i];
              currentBadgeLevelIndex = i;
            }
          }
        }
        
        // Determine next badge level
        let nextBadgeLevel;
        let nextBadgeLevelIndex;
        
        if (currentBadgeLevelIndex < this.badgeLevels.length - 1) {
          nextBadgeLevelIndex = currentBadgeLevelIndex + 1;
          nextBadgeLevel = this.badgeLevels[nextBadgeLevelIndex];
        } else {
          // Already at highest level
          nextBadgeLevelIndex = currentBadgeLevelIndex;
          nextBadgeLevel = currentBadgeLevel;
        }
        
        // Calculate progress toward next badge level
        const criteria = this.badgeCriteria[nextBadgeLevel];
        let weeksCompleted = 0;
        let weeksRequired = criteria.weeks;
        
        // Group scores by week
        const scoresByWeek = new Map();
        for (const score of scoreHistory) {
          const scoreDate = new Date(score.scoreDate);
          const weekStart = new Date(scoreDate);
          weekStart.setHours(0, 0, 0, 0);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
          
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!scoresByWeek.has(weekKey)) {
            scoresByWeek.set(weekKey, []);
          }
          
          let scoreValue: number;
          switch (badgeType) {
            case 'exercise':
              scoreValue = score.exerciseSelfScore || 0;
              break;
            case 'meal':
              scoreValue = score.mealPlanSelfScore || 0;
              break;
            case 'medication':
              scoreValue = score.medicationSelfScore || 0;
              break;
            default:
              scoreValue = 0;
          }
          
          scoresByWeek.get(weekKey).push(scoreValue);
        }
        
        // Check consecutive weeks with scores at or above minimum
        let currentWeekStart = new Date();
        currentWeekStart.setHours(0, 0, 0, 0);
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of current week
        
        let checkDate = new Date(currentWeekStart);
        for (let week = 0; week < criteria.weeks; week++) {
          checkDate.setDate(checkDate.getDate() - 7); // Go back one week
          const weekKey = checkDate.toISOString().split('T')[0];
          
          const weekScores = scoresByWeek.get(weekKey) || [];
          
          // Need at least 3 scores per week
          if (weekScores.length >= 3) {
            // Check if average is at or above minimum
            const avgScore = weekScores.reduce((sum, score) => sum + score, 0) / weekScores.length;
            if (avgScore >= criteria.minScore) {
              weeksCompleted++;
            } else {
              break; // Streak broken
            }
          } else {
            break; // Not enough scores this week
          }
        }
        
        // Calculate progress percentage
        let progressPercentage = 0;
        if (weeksRequired > 0) {
          progressPercentage = Math.min(100, Math.round((weeksCompleted / weeksRequired) * 100));
        }
        
        // If already at platinum level, show 100%
        if (currentBadgeLevel === 'platinum') {
          progressPercentage = 100;
        }
        
        progress[badgeType] = {
          type: badgeType,
          currentLevel: currentBadgeLevel,
          nextLevel: nextBadgeLevel,
          progress: progressPercentage,
          weeksCompleted,
          weeksRequired
        };
      }
      
      return progress;
      
    } catch (error) {
      console.error('Error getting badge progress:', error);
      return null;
    }
  }
}

export const badgeService = new BadgeService();
export default badgeService;