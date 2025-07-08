import { db } from '../db';
import * as schema from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';

// --- Types and Interfaces ---

type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
type BadgeCategory = 'meal' | 'exercise' | 'medication';

interface BadgeRule {
  scoreThreshold: number;
  weeksRequired: number;
}

interface MilestoneStatus {
  earnedBadges: schema.UserBadge[];
  badgeProgress: Record<string, any>;
  newlyAwardedBadge: schema.UserBadge | null;
}

// --- Badge Rules Configuration (from PROGRESS_MILESTONES.md) ---

const badgeRules: Record<BadgeLevel, BadgeRule> = {
  bronze: { scoreThreshold: 5, weeksRequired: 2 },
  silver: { scoreThreshold: 7, weeksRequired: 4 },
  gold: { scoreThreshold: 8, weeksRequired: 16 },
  platinum: { scoreThreshold: 9, weeksRequired: 24 },
};

const badgeLevels: BadgeLevel[] = ['bronze', 'silver', 'gold', 'platinum'];

// --- Service Implementation ---

class MilestoneService {
  /**
   * Calculates the complete milestone and badge status for a given user.
   * @param userId The ID of the user.
   * @returns An object containing earned badges, progress, and any newly awarded badge.
   */
  public async getMilestoneStatus(userId: number): Promise<MilestoneStatus> {
    const earnedBadges = await db.query.userBadges.findMany({
      where: eq(schema.userBadges.userId, userId),
    });

    let newlyAwardedBadge: schema.UserBadge | null = null;
    const badgeProgress: MilestoneStatus['badgeProgress'] = {};

    const categories: BadgeCategory[] = ['meal', 'exercise', 'medication'];

    for (const category of categories) {
      // Check if a new badge can be awarded
      const newBadge = await this.checkAndAwardNewBadge(userId, category, earnedBadges);
      if (newBadge) {
        newlyAwardedBadge = newBadge;
        // Add the new badge to our in-memory list for progress calculation
        earnedBadges.push(newBadge);
      }
      
      // Calculate progress towards the next badge
      const currentBadge = this.getHighestEarnedBadge(earnedBadges, category);
      const nextBadgeLevel = this.getNextBadgeLevel(currentBadge?.level);

      if (nextBadgeLevel) {
        badgeProgress[category] = this.calculateProgress(
          userId,
          category,
          currentBadge?.level || null,
          nextBadgeLevel
        );
      }
    }

    return {
      earnedBadges,
      badgeProgress,
      newlyAwardedBadge,
    };
  }

  private getHighestEarnedBadge(badges: schema.UserBadge[], category: BadgeCategory): schema.UserBadge | undefined {
    const categoryBadges = badges.filter(b => b.badgeType === category);
    if (categoryBadges.length === 0) return undefined;

    return categoryBadges.sort((a, b) => badgeLevels.indexOf(b.badgeLevel) - badgeLevels.indexOf(a.badgeLevel))[0];
  }

  private getNextBadgeLevel(currentLevel?: BadgeLevel): BadgeLevel | null {
    if (!currentLevel) return 'bronze';
    const currentIndex = badgeLevels.indexOf(currentLevel);
    if (currentIndex >= 0 && currentIndex < badgeLevels.length - 1) {
      return badgeLevels[currentIndex + 1];
    }
    return null; // Already has platinum
  }

  private async checkAndAwardNewBadge(
    userId: number,
    category: BadgeCategory,
    earnedBadges: schema.UserBadge[]
  ): Promise<schema.UserBadge | null> {
    // Check from highest potential badge downwards
    for (const level of [...badgeLevels].reverse()) {
      const hasEarned = earnedBadges.some(b => b.badgeType === category && b.badgeLevel === level);
      if (hasEarned) continue; // Already has this badge, no need to check

      const rule = badgeRules[level];
      const consecutiveWeeks = await this._getLongestStreakFromDB(userId, category, rule.scoreThreshold);

      if (consecutiveWeeks >= rule.weeksRequired) {
        const newBadge: schema.InsertUserBadge = {
          userId,
          badgeType: category,
          badgeLevel: level,
          earnedDate: new Date(),
        };
        const [awardedBadge] = await db.insert(schema.userBadges).values(newBadge).returning();
        return awardedBadge;
      }
    }
    return null;
  }

  private calculateProgress(
    userId: number,
    category: BadgeCategory,
    currentLevel: BadgeLevel | null,
    nextLevel: BadgeLevel
  ) {
    const rule = badgeRules[nextLevel];
    const weeksCompleted = this._getLongestStreakFromDB(userId, category, rule.scoreThreshold);
    const progress = Math.min(100, Math.floor((weeksCompleted / rule.weeksRequired) * 100));

    return {
      currentLevel,
      nextLevel,
      progress,
      weeksCompleted: parseFloat(weeksCompleted.toFixed(1)),
      weeksRequired: rule.weeksRequired,
    };
  }

  /**
   * Calculates the longest consecutive streak of compliant weeks directly in the database.
   * This is a highly optimized query that avoids pulling large datasets into the application.
   * @param userId The user's ID.
   * @param category The health category to check.
   * @param threshold The minimum score for a week to be considered compliant.
   * @returns The number of weeks in the longest consecutive streak.
   */
  private async _getLongestStreakFromDB(userId: number, category: BadgeCategory, threshold: number): Promise<number> {
    const scoreColumnMap = {
      meal: schema.healthScores.dietScore,
      exercise: schema.healthScores.exerciseScore,
      medication: schema.healthScores.medicationScore,
    };
    const scoreColumn = scoreColumnMap[category];

    const query = sql`
      WITH weekly_compliance AS (
        SELECT
          date_trunc('week', ${schema.healthScores.date}) AS week_start
        FROM ${schema.healthScores}
        WHERE
          ${schema.healthScores.userId} = ${userId}
        GROUP BY 1
        HAVING MIN(${scoreColumn}) >= ${threshold} AND COUNT(*) > 0
      ),
      streak_starts AS (
        SELECT
          week_start,
          CASE
            WHEN
              (week_start - LAG(week_start, 1, week_start) OVER (ORDER BY week_start)) != interval '7 day'
            THEN 1
            ELSE 0
          END AS is_streak_start
        FROM weekly_compliance
      ),
      streak_ids AS (
        SELECT
          week_start,
          SUM(is_streak_start) OVER (ORDER BY week_start) as streak_id
        FROM streak_starts
      )
      SELECT MAX(streak_length) as longest_streak FROM (
        SELECT streak_id, COUNT(*) as streak_length FROM streak_ids GROUP BY streak_id
      ) as streaks;
    `;

    const result = await db.execute(query);
    
    if (result.rows.length > 0 && result.rows[0].longest_streak) {
      return Number(result.rows[0].longest_streak);
    }

    return 0;
  }
}

export const milestoneService = new MilestoneService();