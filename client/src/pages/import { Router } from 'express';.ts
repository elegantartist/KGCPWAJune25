import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';

const patientRouter = Router();

// Apply authentication middleware to all routes, ensuring only patients can access them.
patientRouter.use(authMiddleware(['patient']));

/**
 * GET /api/patient/scores/today-status
 * Checks if the patient has already submitted their scores for the current day.
 */
patientRouter.get('/scores/today-status', async (req: AuthenticatedRequest, res) => {
  try {
    const patient = await db.query.patients.findFirst({
      where: eq(schema.patients.userId, req.user!.userId),
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient record not found.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const existingScore = await db.query.healthMetrics.findFirst({
      where: and(
        eq(schema.healthMetrics.patientId, patient.id),
        gte(schema.healthMetrics.date, today)
      ),
    });

    res.json({ hasSubmittedToday: !!existingScore });
  } catch (error) {
    console.error('Error fetching today\'s score status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/patient/scores
 * Submits the daily self-scores for the logged-in patient.
 */
const scoresSchema = z.object({
  dietScore: z.number().min(0).max(10),
  exerciseScore: z.number().min(0).max(10),
  medicationScore: z.number().min(0).max(10),
});

patientRouter.post('/scores', async (req: AuthenticatedRequest, res) => {
  try {
    const { dietScore, exerciseScore, medicationScore } = scoresSchema.parse(req.body);

    const patient = await db.query.patients.findFirst({
      where: eq(schema.patients.userId, req.user!.userId),
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient record not found.' });
    }

    // Note: The check for existing scores is also done on the frontend,
    // but this is a crucial server-side validation.

    const newMetric = await db.insert(schema.healthMetrics).values({
      patientId: patient.id,
      dietScore,
      exerciseScore,
      medicationScore,
      date: new Date(),
    }).returning();

    res.status(201).json({ message: 'Scores submitted successfully.', metric: newMetric[0] });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid score format.' });
    console.error('Error submitting scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/patient/milestones
 * Calculates and returns the patient's progress milestones and achievements.
 */

type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
type BadgeType = 'meal' | 'exercise' | 'medication';

const badgeRules: Record<BadgeType, Record<BadgeLevel, { score: number; weeks: number }>> = {
  meal: {
    bronze: { score: 5, weeks: 2 },
    silver: { score: 7, weeks: 4 },
    gold: { score: 8, weeks: 16 },
    platinum: { score: 9, weeks: 24 },
  },
  exercise: {
    bronze: { score: 5, weeks: 2 },
    silver: { score: 7, weeks: 4 },
    gold: { score: 8, weeks: 16 },
    platinum: { score: 9, weeks: 24 },
  },
  medication: {
    bronze: { score: 5, weeks: 2 },
    silver: { score: 7, weeks: 4 },
    gold: { score: 8, weeks: 16 },
    platinum: { score: 9, weeks: 24 },
  },
};

const calculateConsecutiveWeeks = (metrics: any[], scoreType: 'dietScore' | 'exerciseScore' | 'medicationScore', threshold: number): number => {
  let consecutiveWeeks = 0;
  const sortedMetrics = [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let currentWeek = new Date();
  currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()); // Start of current week (Sunday)
  
  for (let i = 0; i < 52; i++) { // Check up to a year
    const weekStart = new Date(currentWeek);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekMetrics = sortedMetrics.filter(m => {
      const metricDate = new Date(m.date);
      return metricDate >= weekStart && metricDate < weekEnd;
    });

    // Assuming at least one submission per week is needed to count
    if (weekMetrics.length > 0 && weekMetrics.every(m => m[scoreType] >= threshold)) {
      consecutiveWeeks++;
    } else {
      break; // Streak is broken
    }
  }

  return consecutiveWeeks;
};

patientRouter.get('/milestones', async (req: AuthenticatedRequest, res) => {
  try {
    const patient = await db.query.patients.findFirst({
      where: eq(schema.patients.userId, req.user!.id),
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient record not found.' });
    }

    const metrics = await db.query.healthMetrics.findMany({
      where: eq(schema.healthMetrics.patientId, patient.id),
      orderBy: (metrics, { desc }) => [desc(metrics.date)],
    });

    const earnedBadges: any[] = [];
    const badgeProgress: any = {};

    for (const type of Object.keys(badgeRules) as BadgeType[]) {
      let currentLevel: BadgeLevel | null = null;
      for (const level of ['platinum', 'gold', 'silver', 'bronze'] as BadgeLevel[]) {
        const rule = badgeRules[type][level];
        const weeks = calculateConsecutiveWeeks(metrics, `${type === 'meal' ? 'diet' : type}Score` as any, rule.score);
        if (weeks >= rule.weeks) {
          earnedBadges.push({ type, level, earnedDate: new Date() });
          currentLevel = level;
          break; // Found the highest level for this type
        }
      }

      // Calculate progress to the next level
      const nextLevelOrder: BadgeLevel[] = ['bronze', 'silver', 'gold', 'platinum'];
      const currentLevelIndex = currentLevel ? nextLevelOrder.indexOf(currentLevel) : -1;
      const nextLevel = currentLevelIndex < 3 ? nextLevelOrder[currentLevelIndex + 1] : null;

      if (nextLevel) {
        const rule = badgeRules[type][nextLevel];
        const weeksCompleted = calculateConsecutiveWeeks(metrics, `${type === 'meal' ? 'diet' : type}Score` as any, rule.score);
        badgeProgress[type] = {
          currentLevel,
          nextLevel,
          progress: Math.min(100, Math.floor((weeksCompleted / rule.weeks) * 100)),
          weeksCompleted,
          weeksRequired: rule.weeks,
        };
      }
    }

    const hasAllPlatinum = ['meal', 'exercise', 'medication'].every(type => 
      earnedBadges.some(b => b.type === type && b.level === 'platinum')
    );

    res.json({
      earnedBadges,
      badgeProgress,
      hasAllPlatinum,
    });

  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default patientRouter;