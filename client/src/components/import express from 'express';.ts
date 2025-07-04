import express from 'express';
import { supervisorAgent, SupervisorQuery } from '../services/supervisorAgent';
import { AnalysisResult } from '../../client/src/services/healthAnalysisService';
import { z } from 'zod';
import { AppError } from '../services/errors';

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

// Define a validation schema for the chat endpoint request body.
const chatRequestSchema = z.object({
  message: z.object({
    text: z.string().min(1, "Message text cannot be empty.").max(4000, "Message is too long."),
    sentAt: z.string().datetime().optional(),
  }),
  sessionId: z.string().optional(),
});

/**
 * Main chat endpoint.
 * Handles general conversation with the Supervisor Agent.
 */
router.post('/chat', authMiddleware, async (req: any, res) => {
  try {
    // Validate the request body against the schema.
    const { message, sessionId } = chatRequestSchema.parse(req.body);
    const userId = req.user.id;

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
    // Handle specific error types for better client-side feedback.
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request format.', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ response: error.message, error: error.name });
    }

    console.error('Unhandled error in /api/chat endpoint:', error);
    return res.status(500).json({
      response: "I'm sorry, an unexpected error occurred. Please try again later.",
      error: error instanceof Error ? error.message : 'Unknown server error',
    });
  }
});

// Define a validation schema for the health analysis endpoint.
const healthAnalysisRequestSchema = z.object({
  metrics: z.array(z.object({
    sleep: z.number().min(0).max(10),
    nutrition: z.number().min(0).max(10),
    activity: z.number().min(0).max(10),
    medication: z.number().min(0).max(10),
    date: z.string().datetime(),
  })).min(1, "Metrics array cannot be empty."),
});

/**
 * Health metrics analysis endpoint.
 * Handles requests for AI-powered analysis of user health scores.
 */
router.post('/analyze-health-metrics', authMiddleware, async (req: any, res) => {
  try {
    // Validate the request body.
    const { metrics } = healthAnalysisRequestSchema.parse(req.body);
    const userId = req.user.id;

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
    // Handle specific error types.
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid metrics format.', details: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ response: error.message, error: error.name });
    }
    console.error("Unhandled error in /api/analyze-health-metrics:", error);
    return res.status(500).json({ message: "An internal error occurred during analysis." });
  }
});

export default router;