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
  
  // Process patient chat message
  app.post("/api/supervisor/chat", async (req, res) => {
    try {
      const { message, patientId, context } = chatMessageSchema.parse(req.body);
      
      console.log(`[Supervisor API] Processing chat for patient ${patientId}`);
      
      const response = await supervisorAgent.processPatientMessage(patientId, message, context);
      
      res.json({
        success: true,
        data: response
      });
      
    } catch (error) {
      console.error("[Supervisor API] Chat processing error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to process chat message"
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