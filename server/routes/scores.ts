import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { db } from '../db';
// Changed import path for @shared/schema
import { patientScores } from '../src/shared/schema';
import { processMilestonesForUser } from '../services/milestoneService';
import { generateScoreAnalysis } from '../services/analysisService';

const scoresRouter = Router();

scoresRouter.use(authMiddleware());

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
    await db.insert(patientScores).values({
      patientId: user.userId,
      mealPlanSelfScore: diet,
      exerciseSelfScore: exercise,
      medicationSelfScore: medication,
    });

    const newlyEarnedBadges = await processMilestonesForUser(user.userId);

    let analysisReport = null;
    try {
      const { supervisorAgent } = await import('../services/supervisorAgent');
      const analysisResponse = await supervisorAgent.runSelfScoreAnalysis(user.userId, { diet, exercise, medication });
      if (analysisResponse && typeof analysisResponse.response === 'string') {
        analysisReport = JSON.parse(analysisResponse.response);
      } else if (analysisResponse && typeof analysisResponse.response === 'object') {
        analysisReport = analysisResponse.response;
      } else {
        console.error("Unexpected analysis response structure:", analysisResponse);
      }
    } catch (analysisError) {
      console.error("Error running self-score analysis via supervisor:", analysisError);
    }

    return res.json({ success: true, newlyEarnedBadges, analysis: analysisReport });
  } catch (error) {
    console.error("Error processing scores:", error);
    return res.status(500).json({ error: "Internal server error while processing scores." });
  }
});

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
