import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { db } from '../db';
import { patientScores } from '@shared/schema'; // Changed import from dailyScores to patientScores
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
    // Insert into patientScores table with correct column names
    await db.insert(patientScores).values({
      patientId: user.userId, // patientScores.patientId references users.id
      // scoreDate will use defaultNow() from the schema definition
      mealPlanSelfScore: diet, // Map from request body 'diet' to 'mealPlanSelfScore'
      exerciseSelfScore: exercise, // Map from request body 'exercise' to 'exerciseSelfScore'
      medicationSelfScore: medication, // Map from request body 'medication' to 'medicationSelfScore'
      // notes: req.body.notes, // Optional: if client sends notes
    });

    const newlyEarnedBadges = await processMilestonesForUser(user.userId);

    // Call Supervisor Agent for self-score analysis
    let analysisReport = null;
    try {
      // Ensure supervisorAgent and its methods are imported if not already
      const { supervisorAgent } = await import('../services/supervisorAgent');
      const analysisResponse = await supervisorAgent.runSelfScoreAnalysis(user.userId, { diet, exercise, medication });
      // The response from runSelfScoreAnalysis is an object like:
      // { response: string (JSON), sessionId: string, modelUsed: string, ... }
      // We need to parse the JSON string from analysisResponse.response
      if (analysisResponse && typeof analysisResponse.response === 'string') {
        analysisReport = JSON.parse(analysisResponse.response);
      } else if (analysisResponse && typeof analysisResponse.response === 'object') {
        // If it's already an object (e.g. if supervisorAgent was updated)
        analysisReport = analysisResponse.response;
      }
       else {
        console.error("Unexpected analysis response structure:", analysisResponse);
        // analysisReport remains null, client should handle this
      }
    } catch (analysisError) {
      console.error("Error running self-score analysis via supervisor:", analysisError);
      // analysisReport remains null, client should handle this
      // Optionally, you could send a specific error message or part of the response
    }

    return res.json({ success: true, newlyEarnedBadges, analysis: analysisReport });
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