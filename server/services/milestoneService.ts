import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { APIError } from './errors';

/**
 * Milestone Service
 *
 * This service contains the business logic for calculating patient progress,
 * streaks, and earned badges based on their daily self-scores.
 */
 
export const BADGE_CATEGORIES = ['diet', 'exercise', 'medication'] as const;
export type BadgeCategory = typeof BADGE_CATEGORIES[number];
 
export const BADGE_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type BadgeTier = typeof BADGE_TIERS[number];
 
export const TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold', 'platinum'];
 
export const MILESTONE_RULES: Record<BadgeTier, { weeks: number; minScore: number }> = {
  bronze: { weeks: 2, minScore: 5 },
  silver: { weeks: 4, minScore: 7 },
  gold: { weeks: 16, minScore: 8 },
  platinum: { weeks: 24, minScore: 9 },
};
 
export interface EarnedBadge {
  category: BadgeCategory;
  tier: BadgeTier;
  earnedDate: string;
}
 
export interface BadgeProgress {
  currentTier: BadgeTier | null;
  nextTier: BadgeTier | null;
  progressPercentage: number;
  weeksCompleted: number;
  weeksRequired: number;
}
 
export class MilestoneService {
  /**
   * Calculates the current streak of compliant weeks for a given score category.
   * A week is compliant if all scores submitted within it meet the minimum score.
   * The streak is broken by any week that is non-compliant or has no scores.
   */
  private static calculateCurrentStreak(
    scores: (typeof schema.healthMetrics.$inferSelect)[],
    scoreField: 'dietScore' | 'exerciseScore' | 'medicationScore',
    minScore: number
  ): number {
    if (scores.length === 0) return 0;

    const weeklyCompliance = new Map<string, boolean>();

    // First, determine the compliance status of each week that has scores.
    for (const score of scores) {
      const scoreDate = new Date(score.date);
      const dayOfWeek = scoreDate.getUTCDay(); // Sunday = 0
      const weekStart = new Date(scoreDate.getTime());
      weekStart.setUTCHours(0, 0, 0, 0);
      weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek);
      const weekKey = weekStart.toISOString().split('T')[0];

      const isCompliant = (score[scoreField] ?? 0) >= minScore;

      if (weeklyCompliance.get(weekKey) === false) {
        continue; // Once a week is non-compliant, it stays that way.
      }
      weeklyCompliance.set(weekKey, isCompliant);
    }

    // Now, walk backwards from the current week to count the consecutive streak.
    let streak = 0;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const currentDayOfWeek = today.getUTCDay();
    let weekCursor = new Date(today.getTime());
    weekCursor.setUTCDate(weekCursor.getUTCDate() - currentDayOfWeek);

    // Check up to 52 weeks (a year).
    for (let i = 0; i < 52; i++) {
      const weekKey = weekCursor.toISOString().split('T')[0];
      const isWeekCompliant = weeklyCompliance.get(weekKey);

      // A week is only part of the streak if it has scores and all are compliant.
      if (isWeekCompliant === true) {
        streak++;
      } else {
        // If the week is non-compliant (false) or has no scores (undefined), the streak is broken.
        break;
      }
      // Move to the previous week.
      weekCursor.setUTCDate(weekCursor.getUTCDate() - 7);
    }
    return streak;
  }

  static async getPatientMilestones(userId: number) {
    const patient = await db.query.patients.findFirst({
      where: eq(schema.patients.userId, userId),
    });
 
    if (!patient) {
      throw new APIError('PatientNotFound', 404, 'Patient record not found for this user.', true);
    }
 
    const scores = await db.query.healthMetrics.findMany({
      where: eq(schema.healthMetrics.patientId, patient.id),
      orderBy: (metrics) => [desc(metrics.date)],
    });
 
    const allEarnedBadges: EarnedBadge[] = [];
    const badgeProgress: Partial<Record<BadgeCategory, BadgeProgress>> = {};

    const previouslyEarnedBadges = await db.query.earnedBadges.findMany({
      where: eq(schema.earnedBadges.patientId, patient.id),
    });

    const scoreFieldMap: Record<BadgeCategory, 'dietScore' | 'exerciseScore' | 'medicationScore'> = {
      diet: 'dietScore',
      exercise: 'exerciseScore',
      medication: 'medicationScore',
    };

    for (const category of BADGE_CATEGORIES) {
      const scoreField = scoreFieldMap[category];
      const earnedTiersForCategory = previouslyEarnedBadges.filter(b => b.category === category);
      allEarnedBadges.push(...earnedTiersForCategory.map(b => ({ category: b.category as BadgeCategory, tier: b.tier as BadgeTier, earnedDate: b.earnedAt.toISOString() })));

      const highestTierIndex = Math.max(-1, ...earnedTiersForCategory.map(b => TIER_ORDER.indexOf(b.tier as BadgeTier)));
      let nextTierIndex = highestTierIndex + 1;

      // Check for new badges to award, starting from the next unearned tier
      for (let i = nextTierIndex; i < TIER_ORDER.length; i++) {
        const tierToCheck = TIER_ORDER[i];
        const rule = MILESTONE_RULES[tierToCheck];
        const streak = this.calculateCurrentStreak(scores, scoreField, rule.minScore);

        if (streak >= rule.weeks) {
          // Award new badge if not already earned
          if (!earnedTiersForCategory.some(b => b.tier === tierToCheck)) {
            const [newBadge] = await db.insert(schema.earnedBadges).values({ patientId: patient.id, category, tier: tierToCheck, earnedAt: new Date() }).returning();
            allEarnedBadges.push({ category: newBadge.category as BadgeCategory, tier: newBadge.tier as BadgeTier, earnedDate: newBadge.earnedAt.toISOString() });
          }
          nextTierIndex = i + 1;
        } else {
          break; // Streak not long enough, stop checking higher tiers
        }
      }

      // Calculate progress for the next unearned tier
      const currentTier: BadgeTier | null = highestTierIndex > -1 ? TIER_ORDER[highestTierIndex] : null;
      if (nextTierIndex < TIER_ORDER.length) {
        const nextTier = TIER_ORDER[nextTierIndex];
        const rule = MILESTONE_RULES[nextTier];
        const progressStreak = this.calculateCurrentStreak(scores, scoreField, rule.minScore);
        badgeProgress[category] = {
          currentTier,
          nextTier,
          progressPercentage: Math.min(100, Math.floor((progressStreak / rule.weeks) * 100)),
          weeksCompleted: progressStreak,
          weeksRequired: rule.weeks,
        };
      } else {
        badgeProgress[category] = {
          currentTier: 'platinum',
          nextTier: null,
          progressPercentage: 100,
          weeksCompleted: MILESTONE_RULES.platinum.weeks,
          weeksRequired: MILESTONE_RULES.platinum.weeks,
        };
      }
    }
 
    return {
      earnedBadges: allEarnedBadges,
      badgeProgress: badgeProgress as Record<BadgeCategory, BadgeProgress>,
    };
  }
}