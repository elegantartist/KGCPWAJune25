import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware'; // Assuming this middleware exists
import { supervisorAgent } from '../ai/supervisorAgent'; // Assuming a supervisor agent handles the logic

const router = express.Router();

interface HealthScores {
  dietScore: number;
  exerciseScore: number;
  medicationScore: number;
}

/**
 * @route   POST /api/analyze-health-metrics
 * @desc    Analyzes patient's daily scores using the KGC Supervisor Agent
 * @access  Private
 */
router.post('/analyze-health-metrics', authenticateToken, async (req, res) => {
  const { dietScore, exerciseScore, medicationScore } = req.body as HealthScores;
  const user = (req as any).user; // User object from authenticateToken middleware

  if (
    typeof dietScore !== 'number' ||
    typeof exerciseScore !== 'number' ||
    typeof medicationScore !== 'number'
  ) {
    return res.status(400).json({ error: 'Invalid score data. All scores must be numbers.' });
  }

  try {
    // Delegate the analysis to the supervisor agent
    const analysis = await supervisorAgent.analyzeDailyScores({
      userId: user.id,
      scores: { dietScore, exerciseScore, medicationScore },
    });

    res.json({ analysis });
  } catch (error) {
    console.error('Error in /api/analyze-health-metrics:', error);
    res.status(500).json({ error: 'An internal server error occurred while analyzing scores.' });
  }
});

export default router;