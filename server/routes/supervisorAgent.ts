/**
 * Supervisor Agent API Routes
 * 
 * Routes for interacting with the central Supervisor Agent system
 */

import { Express } from "express";
import { SupervisorAgent } from "../services/supervisorAgent";
import { z } from "zod";

const supervisorAgent = SupervisorAgent.getInstance();

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1),
  patientId: z.number().int().positive(),
  context: z.any().optional()
});

const dailyScoresSchema = z.object({
  patientId: z.number().int().positive(),
  scores: z.object({
    medication: z.number().int().min(1).max(10),
    diet: z.number().int().min(1).max(10),
    exercise: z.number().int().min(1).max(10)
  })
});

const pprRequestSchema = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive()
});

export function setupSupervisorAgentRoutes(app: Express) {
  
  // Process patient chat message (ENHANCED SECURITY)
  app.post("/api/supervisor/chat", async (req, res) => {
    try {
      // Enhanced input validation and rate limiting
      const session = req.session as any;
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Session authentication check
      if (!session?.userId) {
        console.warn(`[Security] Unauthorized chat attempt from IP: ${clientIP}`);
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      console.log(`[Supervisor API] Authenticated request from user ${session.userId}`);
      
      // Get patientId from session if not provided in request body
      let patientId = req.body.patientId;
      
      if (!patientId && session?.patientId) {
        patientId = session.patientId;
      }

      // Input validation and sanitization
      const { message, context } = chatMessageSchema.omit({ patientId: true }).parse(req.body);
      
      // Sanitize message input to prevent injection attacks
      if (!message || typeof message !== 'string' || message.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Invalid message: must be a string under 2000 characters'
        });
      }

      // Authorization check - patients can only chat as themselves
      if (session?.userRole === 'patient' && session?.userId !== patientId) {
        console.warn(`[Security] Patient ${session.userId} attempted to access chat for patient ${patientId}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied: Cannot access other patient data'
        });
      }
      
      // Validate patientId
      const parsedPatientId = parseInt(patientId);
      if (!patientId || isNaN(parsedPatientId) || parsedPatientId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid patient ID required'
        });
      }
      
      console.log(`[Supervisor API] Processing chat for patient ${parsedPatientId}`);
      
      // Rate limiting check (simple implementation)
      const now = Date.now();
      const sessionKey = `chat_${session.userId}`;
      if (!session.lastChatTime) session.lastChatTime = {};
      
      if (session.lastChatTime[sessionKey] && (now - session.lastChatTime[sessionKey]) < 2000) {
        return res.status(429).json({
          success: false,
          error: 'Please wait before sending another message'
        });
      }
      session.lastChatTime[sessionKey] = now;
      
      const response = await supervisorAgent.processPatientMessage(parsedPatientId, message, context);
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      console.error("[Supervisor API] Chat processing error:", error);
      
      // Enhanced error handling with security considerations
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid request format",
          // Don't expose detailed validation errors in production
          details: process.env.NODE_ENV === 'development' ? error.errors : undefined
        });
      }
      
      // Log security-related errors
      const session = req.session as any;
      const clientIP = req.ip || req.connection.remoteAddress;
      console.error(`[Security] Chat error for user ${session?.userId} from IP ${clientIP}:`, error);
      
      res.status(500).json({
        success: false,
        error: "Unable to process your request at this time. Please try again."
      });
    }
  });
  
  // Process daily self-scores submission
  app.post("/api/supervisor/daily-scores", async (req, res) => {
    try {
      const { patientId, scores } = dailyScoresSchema.parse(req.body);
      
      console.log(`[Supervisor API] Processing daily scores for patient ${patientId}:`, scores);
      
      const response = await supervisorAgent.processDailyScores(patientId, scores);
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      console.error("[Supervisor API] Daily scores processing error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid scores data",
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to process daily scores"
      });
    }
  });
  
  // Generate Patient Progress Report
  app.post("/api/supervisor/generate-ppr", async (req, res) => {
    try {
      const { patientId, doctorId } = pprRequestSchema.parse(req.body);
      
      console.log(`[Supervisor API] Generating PPR for patient ${patientId}, doctor ${doctorId}`);
      
      const report = await supervisorAgent.generateProgressReport(patientId, doctorId);
      
      res.json({
        success: true,
        data: report
      });
      
    } catch (error) {
      console.error("[Supervisor API] PPR generation error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid PPR request data",
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to generate Patient Progress Report"
      });
    }
  });
  
  // Get patient status and recommendations
  app.get("/api/supervisor/patient/:patientId/status", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid patient ID"
        });
      }
      
      // This could be expanded to return patient status, recent activity, etc.
      res.json({
        success: true,
        message: "Patient status endpoint - implementation pending"
      });
      
    } catch (error) {
      console.error("[Supervisor API] Patient status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get patient status"
      });
    }
  });
  
  // Health check endpoint
  app.get("/api/supervisor/health", (req, res) => {
    res.json({
      success: true,
      service: "Supervisor Agent",
      status: "operational",
      timestamp: new Date().toISOString()
    });
  });
}