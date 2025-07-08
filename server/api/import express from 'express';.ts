import express from 'express';
import { supervisorAgent, SupervisorQuery } from '../services/supervisorAgent';
import { AnalysisResult } from '../../client/src/services/healthAnalysisService';

// A placeholder for your real authentication middleware
const authMiddleware = (req: any, res: express.Response, next: express.NextFunction) => {
  // In a real app, you'd validate a JWT or session here.
  // For now, we'll simulate a logged-in user.
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  // This is a placeholder. Replace with real user lookup from token.
  req.user = { id: 1 }; 
  next();
};

const router = express.Router();

/**
 * Main chat endpoint.
 * Handles general conversation with the Supervisor Agent.
 */
router.post('/chat', authMiddleware, async (req: any, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user.id;

  if (!message || typeof message.text !== 'string') {
    return res.status(400).json({ error: 'Invalid message format' });
  }

  try {
    const supervisorQuery: SupervisorQuery = {
      message: {
        text: message.text,
        sentAt: message.sentAt || new Date().toISOString(),
      },
      userId,
      sessionId,
    };

    const response = await supervisorAgent.runSupervisorQuery(supervisorQuery);
    return res.json(response);

  } catch (error) {
    console.error('Error in /api/chat endpoint:', error);
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
router.post('/analyze-health-metrics', authMiddleware, async (req: any, res) => {
  try {
    const { metrics } = req.body;
    const userId = req.user.id;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ message: "Invalid or empty metrics data provided." });
    }

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
      console.error("Failed to parse JSON response from LLM:", analysisResponse.response, parseError);
      return res.status(500).json({ message: "Failed to process analysis result from AI." });
    }

  } catch (error) {
    console.error("Error in /api/analyze-health-metrics:", error);
    return res.status(500).json({ message: "An internal error occurred while analyzing health metrics." });
  }
});

export default router;