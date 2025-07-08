import express from 'express';
import { supervisorAgent, SupervisorQuery } from '../services/supervisorAgent';
import { AnalysisResult } from '../../client/src/services/healthAnalysisService';
import { db } from '../db';
import * as schema from '@shared/schema';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { z } from 'zod';
import { milestoneService } from '../services/milestoneService';
import { logger } from '../lib/logger';

const router = express.Router();

/**
 * Main chat endpoint.
 * Handles general conversation with the Supervisor Agent.
 */
const chatSchema = z.object({
  message: z.object({
    text: z.string().min(1),
    sentAt: z.string().datetime().optional(),
  }),
  sessionId: z.string().uuid(),
});

router.post('/chat', authMiddleware(), async (req: AuthenticatedRequest, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user!.id;

  try {
    const supervisorQuery: SupervisorQuery = {
      message: {
        text: message.text,
        sentAt: message.sentAt || new Date().toISOString(),
      },
      userId: userId,
      sessionId,
    };

    const response = await supervisorAgent.runSupervisorQuery(supervisorQuery);
    return res.json(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request format.', details: error.errors });
    }
    logger.error('Error in /api/chat endpoint', { userId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      response: "I'm sorry, an unexpected error occurred. Please try again later.",
      error: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

/**
 * Health metrics analysis endpoint.
 * Handles requests for AI-powered analysis of user health scores.
 */
router.post('/analyze-health-metrics', authMiddleware(), async (req: AuthenticatedRequest, res) => {
  try {
    const { metrics } = req.body;
    const userId = req.user!.id;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ message: "Invalid or empty metrics data provided." });
    }

    // Assuming metrics have nutrition, activity, and medication properties.
    // Add Zod validation here for production robustness.

    // The agent expects a single, recent set of scores.
    const latestMetrics = metrics[metrics.length - 1];

    // Map the incoming metric names to what runSelfScoreAnalysis expects.
    const selfScoresForAgent = {
      diet: latestMetrics.nutrition,
      exercise: latestMetrics.activity,
      medication: latestMetrics.medication,
    };

    const analysisResponse = await supervisorAgent.runSelfScoreAnalysis(userId, selfScoresForAgent);

    // The response from the agent should be a JSON string. Parse it.
    try {
      const analysisResult: AnalysisResult = JSON.parse(analysisResponse.response);
      return res.json(analysisResult);
    } catch (parseError) {
      logger.error('Failed to parse JSON response from LLM', { userId, response: analysisResponse.response, error: parseError instanceof Error ? parseError.message : String(parseError) });
      return res.status(500).json({ message: "Failed to process analysis result from AI." });
    }

  } catch (error) {
    logger.error('Error in /api/analyze-health-metrics', { userId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: "An internal error occurred while analyzing health metrics." });
  }
});

const healthScoresSchema = z.object({
  dietScore: z.number().min(1).max(10),
  exerciseScore: z.number().min(1).max(10),
  medicationScore: z.number().min(1).max(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
});

/**
 * POST /api/health-scores
 * Submits or updates the user's daily self-reported health scores.
 * This implements an "upsert" logic based on the user and date.
 */
router.post('/health-scores', authMiddleware(), async (req: AuthenticatedRequest, res) => {
  try {
    const { dietScore, exerciseScore, medicationScore, date } = healthScoresSchema.parse(req.body);
    const userId = req.user!.id;

    // Use Drizzle's `onConflictDoUpdate` for an atomic upsert operation.
    // This relies on the unique constraint on (userId, date) which was added in a migration.
    await db.insert(schema.healthScores)
      .values({
        userId,
        date,
        dietScore,
        exerciseScore,
        medicationScore,
      })
      .onConflictDoUpdate({
        target: [schema.healthScores.userId, schema.healthScores.date],
        set: { dietScore, exerciseScore, medicationScore, updatedAt: new Date() },
      });

    // Invalidate the milestone cache for this user since their scores have changed.
    milestoneService.clearCacheForUser(userId);

    res.status(201).json({ message: 'Health scores submitted successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid score format.', details: error.errors });
    }
    logger.error('Error in /api/health-scores', { userId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: "An internal error occurred while submitting scores." });
  }
});

export default router;