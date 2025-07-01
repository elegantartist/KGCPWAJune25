import { db } from '../db/drizzle';
import { dailyScores, earnedBadges, badgeTypeEnum, badgeTierEnum } from '../db/schema';
import { and, eq, sql } from 'drizzle-orm';

type BadgeType = typeof badgeTypeEnum.enumValues[number];
type BadgeTier = typeof badgeTierEnum.enumValues[number];

const MILESTONE_RULES: Record<BadgeType, Record<BadgeTier, { weeks: number; minScore: number }>> = {
  healthy_eating_hero: {
    bronze: { weeks: 2, minScore: 5 },
    silver: { weeks: 4, minScore: 7 },
    gold: { weeks: 16, minScore: 8 },
    platinum: { weeks: 24, minScore: 9 },
  },
  exercise_consistency_champion: {
    bronze: { weeks: 2, minScore: 5 },
    silver: { weeks: 4, minScore: 7 },
    gold: { weeks: 16, minScore: 8 },
    platinum: { weeks: 24, minScore: 9 },
  },
  medication_maverick: {
    bronze: { weeks: 2, minScore: 5 },
    silver: { weeks: 4, minScore: 7 },
    gold: { weeks: 16, minScore: 8 },
    platinum: { weeks: 24, minScore: 9 },
  },
};

const TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold', 'platinum'];

/**
 * Processes all score types for a user after a submission and awards new badges.
 * @param userId The ID of the user.
 * @returns A list of newly earned badges.
 */
export async function processMilestonesForUser(userId: number): Promise<any[]> {
  const newlyEarned: any[] = [];

  for (const badgeType of badgeTypeEnum.enumValues) {
    const newBadgesForType = await checkAndAwardBadgesForType(userId, badgeType);
    newlyEarned.push(...newBadgesForType);
  }

  return newlyEarned;
}

/**
 * Checks and awards badges for a specific category (e.g., 'healthy_eating_hero').
 * @param userId The user's ID.
 * @param badgeType The type of badge to check.
 * @returns A list of newly earned badges for this type.
 */
export async function checkAndAwardBadgesForType(userId: number, badgeType: BadgeType): Promise<any[]> {
  const newlyEarnedForType: any[] = [];
  const scoreField = badgeType === 'healthy_eating_hero' ? 'diet_score' : badgeType === 'exercise_consistency_champion' ? 'exercise_score' : 'medication_score';

  const userEarnedBadges = await db.query.earnedBadges.findMany({
    where: and(eq(earnedBadges.userId, userId), eq(earnedBadges.badgeType, badgeType)),
    orderBy: (fields, { desc }) => [desc(fields.earnedAt)],
  });

  const highestTierEarned = userEarnedBadges.length > 0 ? TIER_ORDER.indexOf(userEarnedBadges[0].badgeTier) : -1;

  // Iterate through tiers higher than what the user has already earned
  for (let i = highestTierEarned + 1; i < TIER_ORDER.length; i++) {
    const tierToCheck = TIER_ORDER[i];
    const rule = MILESTONE_RULES[badgeType][tierToCheck];

    const compliantWeeks = await getRecentCompliantWeekCount(userId, scoreField, rule.minScore, rule.weeks);

    if (compliantWeeks >= rule.weeks) {
      // Award the badge
      const [newBadge] = await db.insert(earnedBadges).values({
        userId,
        badgeType,
        badgeTier: tierToCheck,
      }).returning();
      
      newlyEarnedForType.push(newBadge);
    } else {
      // If not eligible for this tier, they can't be eligible for higher tiers
      break;
    }
  }

  return newlyEarnedForType;
}

/**
 * Counts how many of the most recent weeks were "compliant" (i.e., all scores submitted
 * within a week met the minimum score requirement).
 * @param userId The user's ID.
 * @param scoreField The database column for the score.
 * @param minScore The minimum required score.
 * @param weeksToExamine The number of recent weeks to check.
 * @returns The number of compliant weeks within the examined period.
 */
async function getRecentCompliantWeekCount(userId: number, scoreField: 'diet_score' | 'exercise_score' | 'medication_score', minScore: number, weeksToExamine: number): Promise<number> {
  if (weeksToExamine <= 0) return 0;
  // This query checks for `weeksToExamine` number of distinct weeks where the user submitted at least one score
  // above `minScore`, and ensures there are no gaps (no weeks with scores below the minimum).
  const result = await db.execute(sql`
    WITH weekly_scores AS (
      SELECT
        date_trunc('week', score_date) AS week_start,
        -- Check if all scores within the week meet the minimum requirement
        bool_and(${dailyScores[scoreField]} >= ${minScore}) AS week_is_compliant
      FROM ${dailyScores}
      WHERE ${dailyScores.userId} = ${userId}
      GROUP BY week_start
      ORDER BY week_start DESC
    )
    SELECT
      -- Count how many of the most recent weeks were compliant
      count(*)
    FROM weekly_scores
    WHERE week_is_compliant = TRUE;
  `);

  const compliantWeeksCount = Number((result.rows[0] as any).count);

  return compliantWeeksCount >= requiredWeeks;
}

/**
 * Fetches all earned badges and progress for a user.
 */
export async function getMilestoneDataForUser(userId: number) {
  const earnedBadgesList = await db.query.earnedBadges.findMany({
    where: eq(earnedBadges.userId, userId),
    orderBy: (fields, { desc }) => [desc(fields.earnedAt)],
  });

  const progressData = [];

  for (const badgeType of badgeTypeEnum.enumValues) {
    const scoreField = badgeType === 'healthy_eating_hero' ? 'diet_score' : badgeType === 'exercise_consistency_champion' ? 'exercise_score' : 'medication_score';
    
    const highestTierEarnedForType = earnedBadgesList
      .filter(b => b.badgeType === badgeType)
      .map(b => TIER_ORDER.indexOf(b.badgeTier))
      .reduce((max, current) => Math.max(max, current), -1);

    const nextTierIndex = highestTierEarnedForType + 1;

    if (nextTierIndex < TIER_ORDER.length) {
      const nextTier = TIER_ORDER[nextTierIndex];
      const rule = MILESTONE_RULES[badgeType][nextTier];
      
      const compliantWeeks = await getRecentCompliantWeekCount(userId, scoreField, rule.minScore, rule.weeks);
      
      const progressPercentage = Math.min(100, Math.floor((compliantWeeks / rule.weeks) * 100));

      progressData.push({
        badgeType,
        currentTier: highestTierEarnedForType > -1 ? TIER_ORDER[highestTierEarnedForType] : null,
        nextTier,
        progress: progressPercentage,
        weeksCompleted: compliantWeeks,
        weeksRequired: rule.weeks,
      });
    } else {
      // User has earned all tiers for this type
      progressData.push({
        badgeType,
        currentTier: 'platinum',
        nextTier: null,
        progress: 100,
      });
    }
  }

  return { badges: earnedBadgesList, progress: progressData };
}