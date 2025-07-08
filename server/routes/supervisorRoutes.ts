import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { supervisorAgent } from '../services/supervisorAgent';
import { APIError } from '../services/errors';
import { z } from 'zod';

const router = express.Router();

const healthScoresSchema = z.object({
  dietScore: z.number().min(0).max(10),
  exerciseScore: z.number().min(0).max(10),
  medicationScore: z.number().min(0).max(10),
});

/**
* @route   POST /api/analyze-health-metrics
* @desc    Analyzes patient's daily scores using the KGC Supervisor Agent
* @access  Private
*/
router.post('/analyze-health-metrics', authenticateToken, async (req, res) => {
  try {
    const { dietScore, exerciseScore, medicationScore } = healthScoresSchema.parse(req.body);
    const user = (req as any).user; // User object from authenticateToken middleware

    // Delegate the analysis to the supervisor agent's dedicated method
    const supervisorResponse = await supervisorAgent.runSelfScoreAnalysis(user.id, {
      diet: dietScore,
      exercise: exerciseScore,
      medication: medicationScore,
    });
 
    res.json({ analysis: supervisorResponse.response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid score data. Scores must be numbers between 0 and 10.', 
        details: error.flatten().fieldErrors 
      });
    }
    console.error('Error in /api/analyze-health-metrics:', error);
    const userMessage = error instanceof APIError ? error.message : 'An internal server error occurred while analyzing scores.';
    const statusCode = error instanceof APIError ? error.statusCode : 500;
    res.status(statusCode).json({ error: userMessage });
  }
});

export default router;