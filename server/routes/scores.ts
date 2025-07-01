import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { db } from '../db';
import { dailyScores } from '@shared/schema';
import { processMilestonesForUser } from '../services/milestoneService';
import { generateScoreAnalysis } from '../services/analysisService';

const scoresRouter = Router();

scoresRouter.use(authMiddleware());

// POST /api/scores - Submits daily scores and triggers milestone processing
scoresRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const { diet, exercise, medication } = req.body;

  if (typeof diet !== 'number' || typeof exercise !== 'number' || typeof medication !== 'number') {
    return res.status(400).json({ error: 'All scores must be valid numbers.' });
  }

  try {
    await db.insert(dailyScores).values({
      userId: user.userId,
      dietScore: diet,
      exerciseScore: exercise,
      medicationScore: medication,
    });

    const newlyEarnedBadges = await processMilestonesForUser(user.userId);
    return res.json({ success: true, newlyEarnedBadges });
  } catch (error) {
    console.error("Error processing scores:", error);
    return res.status(500).json({ error: "Internal server error while processing scores." });
  }
});

// GET /api/scores/analysis - Generates and returns analysis of recent scores
scoresRouter.get('/analysis', async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  try {
    const analysis = await generateScoreAnalysis(user.userId);
    return res.json(analysis);
  } catch (error) {
    console.error("Error generating score analysis:", error);
    return res.status(500).json({ error: "Failed to generate score analysis." });
  }
});

export default scoresRouter;