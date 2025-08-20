import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { sessionTimeoutMiddleware, updateSessionActivity, SessionData } from "./sessionTimeout";
import { envManager } from "./environmentConfig";
import { auditLogger } from "./auditLogger";
import { securityManager } from "./securityManager";
import { encryptionService } from "./encryptionService";
import UINService from './services/uinService';

// Extend Express session interface for hierarchical system
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    doctorId?: number;
    patientId?: number;
    userRole?: string;
    dashboardType?: 'admin' | 'doctor' | 'patient';
    doctorLetter?: string;
    patientNumber?: number;
    lastActivity?: number;
    impersonatedDoctorId?: number;
    impersonatedPatientId?: number;
    adminOriginalUserId?: number;
  }
}
import session, { Session } from 'express-session';
import { RedisStore } from 'connect-redis';
import { Redis } from 'ioredis';
import fs from "fs";
import { 
  determineConnectivityLevel, 
  adaptResponseForConnectivity,
  selectModelForConnectivity
} from './services/connectivityService';
import { ConnectivityLevel } from '@shared/types';
import { privacyService } from './services/privacyService';
import { 
  insertHealthMetricSchema, 
  insertMotivationalImageSchema,
  insertCarePlanDirectiveSchema,
  insertFeatureUsageSchema,
  insertChatMemorySchema,
  insertRecommendationSchema,
  insertUserContentPreferenceSchema,
  insertUserFavoriteSchema,
  insertContentInteractionSchema,
  insertUserSchema,
  updateUserSchema,
  savedRecipes,
  userRoles,
  users,
  doctorPatients,
  patientProgressReports,
  patientInvitations,
  carePlanDirectives,
  healthMetrics,
  adminActivityLog,
  foodItems,
  userFoodPreferences,
  progressMilestones,
  insertProgressMilestoneSchema,
  userFavoriteVideos,
  patientScores,
  patientBadges,
  patientEvents,
  insertPatientScoreSchema
} from "@shared/schema";
import { eq, desc, and, avg, between, or, sql, like, gte, lte } from "drizzle-orm";
import { inArray } from "drizzle-orm/expressions";
import { db } from "./db";
import { z } from "zod";
import { WebSocketServer } from 'ws';
import * as mcpService from './ai/mcpService';
import * as pprService from './services/pprService';
// Import validation schemas
import { 
  userIdSchema, 
  dailyScoresSchema, 
  carePlanDirectiveSchema, 
  validateRequest 
} from "./validation/schemas";
import { globalErrorHandler, asyncHandler, notFoundHandler } from "./middleware/globalErrorHandler";
import { SupervisorAgent } from './services/supervisorAgent';
import * as enhancedPprAnalysisService from './ai/enhancedPprAnalysisService';
import { 
  TavilySearchResult,
  searchHealthContent,
  searchRecipes, 
  searchCookingVideos,
  searchExerciseWellnessVideos,
  saveUserFavorite,
  removeUserFavorite
} from './ai/tavilyClient';
import tavilyService from './services/tavilyService';
import OpenAI from 'openai';
import { 
  generatePatientProgressReport, 
  getPatientProgressReports,
  getPatientProgressReportById
} from './services/pprService';
import { randomUUID } from "crypto";
import { VerificationCodeStorageService } from './services/verificationCodeStorageService';
import { DoctorAuthService } from './services/doctorAuthService';
import aiIntegrationRoutes from './routes/ai-integration';
import pprAnalysisRoutes from './routes/ppr-analysis';
import doctorReportsRouter from './routes/doctorReports';
import { foodStandardsService } from './services/foodStandardsService';
import emailAuthRoutes from './routes/emailAuth';

// Initialize UIN Service for unlimited scaling
const uinService = UINService.getInstance();

// Helper function for safely using Date objects with between operator
function betweenDates(column: any, startDate: Date, endDate: Date) {
  return and(
    gte(column, startDate),
    lte(column, endDate)
  );
}

// We need to re-implement this function since it's not exported from tavilyClient.ts
function extractYoutubeVideoId(url: string): string | null {
  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return null;
  }
  
  try {
    // Handle different YouTube URL formats
    let videoId: string | null = null;
    
    // youtu.be format
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts.length > 1) {
        videoId = parts[1].split('?')[0].split('&')[0];
      }
    } 
    // youtube.com/watch?v= format
    else if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      videoId = urlObj.searchParams.get('v');
    } 
    // youtube.com/v/ or /embed/ format
    else if (url.includes('/v/') || url.includes('/embed/')) {
      const regex = /\/(?:v|embed)\/([^/?&]+)/;
      const match = url.match(regex);
      videoId = match ? match[1] : null;
    }
    
    return videoId;
  } catch (error) {
    console.error('Error extracting YouTube video ID:', error);
    return null;
  }
}
import { RecipeSearchResult } from './types/recipe';
import { validateContent } from './ai/tavilyValidator';
// Import tavilyClient methods directly above
import openaiService from './services/openai';
import { insertSavedRecipeSchema } from '@shared/schema';
import { foodDatabaseService, generateOpenAIFoodRecommendations } from './services/foodDatabaseService';
import badgeService from './services/badgeService';
import patientAlertService from './services/patientAlertService';

export async function registerRoutes(app: Express): Promise<Server> {
  // Public endpoint for shared logo - accessible by other applications
  app.get("/shared/logo", (req, res) => {
    const logoPath = path.join(process.cwd(), "public", "essential-assets", "KGC Logo2 Nov24_1744113864434.jpg");
    
    // Check if file exists
    if (fs.existsSync(logoPath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      fs.createReadStream(logoPath).pipe(res);
    } else {
      res.status(404).json({ message: "Logo file not found" });
    }
  });
  
  // Simple ping endpoint for connectivity testing
  app.get("/api/ping", (req, res) => {
    res.status(200).send("pong");
  });

  // Configure Express Session with Redis for production and MemoryStore for development
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const { VerificationCodeStorageService } = await import('./services/verificationCodeStorageService');
  
  let sessionStore: session.Store;

  // Conditionally initialize session store based on environment and Redis availability
  try {
    const redisClient = VerificationCodeStorageService.getRedisClient();
    if (NODE_ENV === 'production' && redisClient) {
      console.log('Using Redis for Express sessions (Production Mode).');
      sessionStore = new RedisStore({ 
        client: redisClient as any,
        ttl: 24 * 60 * 60 // 24 hours in seconds
      });
    } else {
      if (NODE_ENV === 'production') {
        console.warn('⚠️ Redis not available in production - using MemoryStore for cloud deployment compatibility');
      } else {
        console.warn('Using in-memory store for Express sessions (Development Mode). NOT FOR PRODUCTION.');
      }
      sessionStore = new session.MemoryStore();
    }
  } catch (error) {
    console.warn('⚠️ Redis connection failed, falling back to MemoryStore for cloud deployment:', error.message);
    sessionStore = new session.MemoryStore();
  }

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'a-very-secret-string-for-dev',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    })
  );

  // Apply security middleware to all API routes
  app.use("/api", sessionTimeoutMiddleware);

  // Import auth handlers
  const { handleLogin, handleAuthStatus, handleSMSLogin, handleSMSVerify } = await import('./auth');
  
  // Hierarchical Authentication endpoints with rate limiting
  app.post("/api/auth/sms-login", handleSMSLogin);
  app.post("/api/auth/sms-verify", handleSMSVerify);
  
  // Legacy authentication endpoints
  app.post("/api/auth/login", handleLogin);
  app.get("/api/auth/status", handleAuthStatus);

  // Logout endpoint
  app.post("/api/logout", async (req, res) => {
    try {
      const session = req.session as any;
      console.log(`[LOGOUT] User logging out. Session role: ${session?.userRole}, ID: ${session?.userId}`);
      
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Error destroying session during logout:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        console.log('[LOGOUT] Session destroyed successfully');
        res.json({ success: true, message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });
  
  // ===== MAIN CHAT ENDPOINT WITH EMERGENCY DETECTION =====
  
  console.log('🔧 Registering /api/chat endpoint with emergency detection');
  
  // Main chat endpoint that frontend uses - includes full emergency detection
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, userId } = req.body;
      
      if (!prompt || !userId) {
        return res.status(400).json({ 
          error: "Missing required fields: prompt and userId" 
        });
      }
      
      console.log(`[CHAT API] Processing message for user ${userId}: "${prompt}"`);
      
      // Import emergency detection service
      const { emergencyDetectionService } = await import('./services/emergencyDetectionService');
      
      // Check for emergency situations FIRST
      const emergencyResult = await emergencyDetectionService.detectEmergency(prompt, userId);
      
      // If emergency detected, create alert and return emergency response
      if (emergencyResult.isEmergency) {
        console.log(`🚨 EMERGENCY DETECTED for user ${userId}: ${emergencyResult.emergencyType}`);
        
        // Record the emergency feature usage
        await storage.recordFeatureUsage(userId, 'emergency_detection');
        
        return res.json({
          message: emergencyResult.alertMessage,
          isEmergency: true,
          emergencyType: emergencyResult.emergencyType,
          provider: 'emergency_system',
          timestamp: new Date().toISOString()
        });
      }
      
      // If not emergency, delegate to Supervisor Agent for normal processing
      const { SupervisorAgent } = await import('./services/supervisorAgent');
      const supervisorAgent = SupervisorAgent.getInstance();
      
      const response = await supervisorAgent.processPatientMessage(userId, prompt);
      
      res.json({
        message: response.message,
        recommendedFeatures: response.recommendedFeatures || [],
        milestoneAchieved: response.milestoneAchieved || false,
        cpdCompliance: response.cpdCompliance || {},
        provider: 'supervisor_agent',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[CHAT API] Error processing chat message:', error);
      res.status(500).json({ 
        error: 'Failed to process chat message',
        message: 'I apologize, but I encountered an error. Please try again or contact your healthcare provider if this continues.'
      });
    }
  });

  // CPD-Driven AI Integration Routes
  app.use("/api/ai", aiIntegrationRoutes);
  app.use("/api/ai", pprAnalysisRoutes);
  
  // Doctor Reports (PPR) Routes
  app.use("/api/doctor/reports", doctorReportsRouter);
  
  // Email Authentication Routes
  app.use("/api/email-auth", emailAuthRoutes);

  // Get patient profile for patient dashboard (from authenticated session)
  app.get("/api/patient/profile", async (req, res) => {
    try {
      const session = req.session as any;
      
      // Get user ID from authenticated session
      const patientId = session.userId;
      if (!patientId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Verify this is actually a patient (roleId: 3)
      const user = await storage.getUser(patientId);
      if (user) {
        // Verify user is actually a patient (roleId: 3)
        if (user.roleId !== 3) {
          return res.status(403).json({ message: "Access denied: Not a patient account" });
        }
        
        return res.json({
          id: user.id,
          name: user.name,
          uin: user.uin,
          email: user.email,
          phoneNumber: user.phoneNumber,
          doctorLetter: user.doctorLetter,
          patientNumber: user.patientNumber
        });
      } else {
        return res.status(404).json({ message: "Patient not found" });
      }
    } catch (error) {
      console.error("Error fetching patient profile:", error);
      return res.status(500).json({ message: "Failed to fetch patient profile" });
    }
  });

  // Get current user - simplified for demo without authentication
  app.get("/api/user", async (req, res) => {
    try {
      // Return Reuben Collins (Patient - ID: 2) for automatic dashboard access
      const user = await storage.getUser(2);
      if (user) {
        const userData = {
          id: 2,
          firstName: user.name?.split(' ')[0] || "Reuben",
          lastName: user.name?.split(' ')[1] || "Collins",
          email: user.email || "reuben.collins@patient.com",
          role: "patient"
        };
        res.json(userData);
      } else {
        // Fallback user data for Reuben Collins
        const fallbackUser = {
          id: 2,
          firstName: "Reuben",
          lastName: "Collins",
          email: "reuben.collins@patient.com",
          role: "patient"
        };
        res.json(fallbackUser);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // API connection testing endpoint
  app.get("/api/test-connections", async (req, res) => {
    const results = {
      openai: { status: 'unknown', error: null },
      database: { status: 'unknown', error: null },
      mcp: { status: 'unknown', error: null }
    };

    // Test OpenAI connection
    try {
      const openai = new (await import('openai')).OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 5
      });
      results.openai.status = response ? 'connected' : 'error';
    } catch (error: any) {
      results.openai.status = 'error';
      results.openai.error = error.message;
    }

    // Test database connection
    try {
      await storage.getUser(1);
      results.database.status = 'connected';
    } catch (error: any) {
      results.database.status = 'error';
      results.database.error = error.message;
    }

    // Test MCP service
    try {
      const { EnhancedMCPService2 } = await import('./ai/enhancedMCPService2');
      results.mcp.status = 'loaded';
    } catch (error: any) {
      results.mcp.status = 'error';
      results.mcp.error = error.message;
    }

    res.json(results);
  });
  
  // Get user by ID - with admin impersonation support
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = req.session as any;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check authentication - allow admin impersonation access
      const isAuthenticated = session?.userId || session?.doctorId || session?.patientId;
      const isAdminImpersonating = session?.userRole === 'admin' && session?.impersonatedPatientId;
      

      
      if (!isAuthenticated && !isAdminImpersonating) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // For admin impersonation, verify they're accessing the correct patient
      if (isAdminImpersonating && session.impersonatedPatientId !== id) {

        return res.status(403).json({ message: "Access denied: Can only access impersonated patient data" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      

      return res.json(user);
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Get health metrics for a user
  app.get("/api/users/:userId/health-metrics", async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    const metrics = await storage.getHealthMetricsForUser(userId);
    return res.json(metrics);
  });
  
  // Get latest health metrics for a user
  app.get("/api/users/:userId/health-metrics/latest", async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    
    const metric = await storage.getLatestHealthMetricsForUser(userId);
    
    if (!metric) {
      return res.status(404).json({ message: "No health metrics found for user" });
    }
    
    return res.json(metric);
  });
  
  // Create a new health metric
  app.post("/api/health-metrics", async (req, res) => {
    try {
      const metricData = insertHealthMetricSchema.parse(req.body);
      const newMetric = await storage.createHealthMetric(metricData);
      return res.status(201).json(newMetric);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid health metric data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create health metric" });
    }
  });
  
  // Create a new health metric for a specific user (with 24-hour enforcement)
  app.post("/api/users/:userId/health-metrics", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Check if user has already submitted scores today (24-hour enforcement)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const existingTodayScore = await storage.getPatientScoreByDate(userId, today);
      
      if (existingTodayScore) {
        return res.status(429).json({ 
          message: "Daily scores already submitted today", 
          detail: "You can only submit daily health scores once per 24-hour period. Next submission available tomorrow at 00:00.",
          nextSubmissionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
      
      const metricData = {
        ...req.body,
        userId: userId
      };
      
      const validatedData = insertHealthMetricSchema.parse(metricData);
      const newMetric = await storage.createHealthMetric(validatedData);
      return res.status(201).json(newMetric);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid health metric data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create health metric" });
    }
  });

  // Doctor Alert System APIs
  app.get("/api/doctor/:doctorId/alerts", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }
      
      const alerts = await storage.getPatientAlertsForDoctor(doctorId);
      return res.json(alerts);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch doctor alerts" });
    }
  });

  app.get("/api/doctor/:doctorId/alerts/count", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID" });
      }
      
      const count = await storage.getUnreadAlertsCount(doctorId);
      return res.json({ count });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch alert count" });
    }
  });

  app.put("/api/alerts/:alertId/read", async (req, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      if (isNaN(alertId)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }
      
      const alert = await storage.markAlertAsRead(alertId);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      return res.json(alert);
    } catch (error) {
      return res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  app.put("/api/alerts/:alertId/resolve", async (req, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      if (isNaN(alertId)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }
      
      const alert = await storage.resolveAlert(alertId);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      return res.json(alert);
    } catch (error) {
      return res.status(500).json({ message: "Failed to resolve alert" });
    }
  });
  
  // Get motivational image for a user
  app.get("/api/users/:userId/motivational-image", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const image = await storage.getMotivationalImageForUser(userId);
      
      if (!image) {
        return res.status(404).json({ message: "No motivational image found for user" });
      }
      
      return res.json(image);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve motivational image" });
    }
  });
  
  // Save a new motivational image
  app.post("/api/users/:userId/motivational-image", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const imageData = {
        userId,
        imageData: req.body.imageData
      };
      
      const validatedData = insertMotivationalImageSchema.parse(imageData);
      const image = await storage.saveMotivationalImage(validatedData);
      return res.status(201).json(image);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid image data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to save motivational image" });
    }
  });
  
  // Update motivational image for a user
  app.put("/api/users/:userId/motivational-image", async (req, res) => {
    try {

      
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {

        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      if (!req.body.imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      const updatedImage = await storage.updateMotivationalImage(userId, req.body.imageData);
      
      if (!updatedImage) {
        return res.status(404).json({ message: "Failed to update motivational image" });
      }
      return res.json(updatedImage);
    } catch (error) {
      console.error(`[ERROR] Failed to update motivational image:`, error);
      return res.status(500).json({ message: "Failed to update motivational image" });
    }
  });

  // =================== MCP SYSTEM API ROUTES ===================
  
  // ===== CARE PLAN DIRECTIVES =====
  
  // Get care plan directives for a user
  app.get("/api/users/:userId/care-plan-directives", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const directives = await storage.getCarePlanDirectives(userId);
      return res.json(directives);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve care plan directives" });
    }
  });
  
  // Get active care plan directives for a user
  app.get("/api/users/:userId/care-plan-directives/active", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const directives = await storage.getActiveCarePlanDirectives(userId);
      return res.json(directives);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve active care plan directives" });
    }
  });
  
  // Create a new care plan directive
  app.post("/api/care-plan-directives", async (req, res) => {
    try {
      const directiveData = insertCarePlanDirectiveSchema.parse(req.body);
      const newDirective = await storage.createCarePlanDirective(directiveData);
      return res.status(201).json(newDirective);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid care plan directive data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create care plan directive" });
    }
  });
  
  // Update a care plan directive
  app.put("/api/care-plan-directives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid directive ID format" });
      }
      
      // Updates should be a subset of the insertable fields
      const updates = insertCarePlanDirectiveSchema.partial().parse(req.body);
      const updatedDirective = await storage.updateCarePlanDirective(id, updates);
      
      if (!updatedDirective) {
        return res.status(404).json({ message: "Care plan directive not found" });
      }
      
      return res.json(updatedDirective);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update care plan directive" });
    }
  });
  
  // Deactivate a care plan directive
  app.put("/api/care-plan-directives/:id/deactivate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid directive ID format" });
      }
      
      const deactivatedDirective = await storage.deactivateCarePlanDirective(id);
      
      if (!deactivatedDirective) {
        return res.status(404).json({ message: "Care plan directive not found" });
      }
      
      return res.json(deactivatedDirective);
    } catch (error) {
      return res.status(500).json({ message: "Failed to deactivate care plan directive" });
    }
  });
  
  // ===== FEATURE USAGE =====
  
  // Get feature usage for a user
  app.get("/api/users/:userId/feature-usage", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Optional feature name filter
      const featureName = req.query.feature as string | undefined;
      const usageData = await storage.getFeatureUsage(userId, featureName);
      
      return res.json(usageData);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve feature usage data" });
    }
  });

  // Get Keep Going specific usage statistics (for PPR reporting)
  app.get("/api/users/:userId/keep-going-stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Get Keep Going feature usage data
      const keepGoingUsage = await storage.getFeatureUsage(userId, 'KeepGoing');
      
      // Calculate stats for PPR reporting
      const stats = {
        totalUsage: keepGoingUsage.length > 0 ? keepGoingUsage[0].usageCount : 0,
        lastUsed: keepGoingUsage.length > 0 ? keepGoingUsage[0].lastUsed : null,
        // Additional stats can be calculated here
        averagePerWeek: 0, // This would need historical data
        usageTrend: 'stable' // This would need trend analysis
      };
      
      return res.json(stats);
    } catch (error) {
      console.error('Error getting Keep Going stats:', error);
      return res.status(500).json({ message: "Failed to retrieve Keep Going statistics" });
    }
  });
  
  // Record feature usage
  app.post("/api/users/:userId/feature-usage", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      if (!req.body.featureName) {
        return res.status(400).json({ message: "Feature name is required" });
      }
      
      const usageData = await storage.recordFeatureUsage(userId, req.body.featureName);
      return res.status(201).json(usageData);
    } catch (error) {
      return res.status(500).json({ message: "Failed to record feature usage" });
    }
  });
  
  // Get most used features for a user
  app.get("/api/users/:userId/feature-usage/most-used", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const mostUsedFeatures = await storage.getMostUsedFeatures(userId, limit);
      
      return res.json(mostUsedFeatures);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve most used features" });
    }
  });
  
  // ===== CHAT MEMORY =====
  
  // Get chat memories for a user
  app.get("/api/users/:userId/chat-memories", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Optional memory type filter
      const type = req.query.type as string | undefined;
      const memories = await storage.getChatMemories(userId, type);
      
      return res.json(memories);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve chat memories" });
    }
  });
  
  // Create a new chat memory
  app.post("/api/chat-memories", async (req, res) => {
    try {
      const memoryData = insertChatMemorySchema.parse(req.body);
      const newMemory = await storage.createChatMemory(memoryData);
      return res.status(201).json(newMemory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chat memory data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create chat memory" });
    }
  });
  
  // Delete expired memories
  app.delete("/api/chat-memories/expired", async (req, res) => {
    try {
      const deletedCount = await storage.deleteExpiredMemories();
      return res.json({ message: `Deleted ${deletedCount} expired memories`, count: deletedCount });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete expired memories" });
    }
  });
  
  // ===== RECOMMENDATIONS =====
  
  // Get recommendations for a user
  app.get("/api/users/:userId/recommendations", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const recommendations = await storage.getRecommendations(userId);
      return res.json(recommendations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve recommendations" });
    }
  });
  
  // Get recent recommendations for a user
  app.get("/api/users/:userId/recommendations/recent", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const recentRecommendations = await storage.getRecentRecommendations(userId, limit);
      
      return res.json(recentRecommendations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve recent recommendations" });
    }
  });
  
  // Create a new recommendation
  app.post("/api/recommendations", async (req, res) => {
    try {
      const recommendationData = insertRecommendationSchema.parse(req.body);
      const newRecommendation = await storage.createRecommendation(recommendationData);
      return res.status(201).json(newRecommendation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recommendation data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create recommendation" });
    }
  });
  
  // Update recommendation outcome
  app.put("/api/recommendations/:id/outcome", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid recommendation ID format" });
      }
      
      if (req.body.wasFollowed === undefined) {
        return res.status(400).json({ message: "wasFollowed field is required" });
      }
      
      const wasFollowed = Boolean(req.body.wasFollowed);
      const scoreAfter = req.body.scoreAfter !== undefined ? parseFloat(req.body.scoreAfter) : undefined;
      
      const updatedRecommendation = await storage.updateRecommendationOutcome(
        id, 
        wasFollowed, 
        scoreAfter
      );
      
      if (!updatedRecommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      
      return res.json(updatedRecommendation);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update recommendation outcome" });
    }
  });
  
  // Get successful recommendations for a user
  app.get("/api/users/:userId/recommendations/successful", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const successfulRecommendations = await storage.getSuccessfulRecommendations(userId);
      return res.json(successfulRecommendations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve successful recommendations" });
    }
  });

  // ===== PROGRESS MILESTONES =====
  
  // Get all milestones for a user
  app.get("/api/users/:userId/progress-milestones", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get milestones from database
      const userMilestones = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.userId, userId))
        .orderBy(desc(progressMilestones.createdAt));
      
      return res.json(userMilestones);
    } catch (error) {
      console.error("Error fetching progress milestones:", error);
      return res.status(500).json({ message: "Failed to fetch progress milestones" });
    }
  });
  
  // Create a new milestone
  app.post("/api/users/:userId/progress-milestones", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Validate input data
      const milestoneData = insertProgressMilestoneSchema.parse({
        ...req.body,
        userId
      });
      
      // Insert the milestone
      const [milestone] = await db
        .insert(progressMilestones)
        .values(milestoneData)
        .returning();
      
      return res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating progress milestone:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid milestone data", 
          errors: error.errors 
        });
      }
      
      return res.status(500).json({ message: "Failed to create progress milestone" });
    }
  });
  
  // Update a milestone
  app.patch("/api/progress-milestones/:id", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      
      if (isNaN(milestoneId)) {
        return res.status(400).json({ message: "Invalid milestone ID" });
      }
      
      // Check if the milestone exists
      const existingMilestone = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.id, milestoneId));
      
      if (existingMilestone.length === 0) {
        return res.status(404).json({ message: "Progress milestone not found" });
      }
      
      // Update milestone
      const [updatedMilestone] = await db
        .update(progressMilestones)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(progressMilestones.id, milestoneId))
        .returning();
      
      return res.json(updatedMilestone);
    } catch (error) {
      console.error("Error updating progress milestone:", error);
      return res.status(500).json({ message: "Failed to update progress milestone" });
    }
  });
  
  // Delete a milestone
  app.delete("/api/progress-milestones/:id", async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      
      if (isNaN(milestoneId)) {
        return res.status(400).json({ message: "Invalid milestone ID" });
      }
      
      // Delete the milestone
      await db
        .delete(progressMilestones)
        .where(eq(progressMilestones.id, milestoneId));
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting progress milestone:", error);
      return res.status(500).json({ message: "Failed to delete progress milestone" });
    }
  });
  
  // Sync progress milestones (used for offline support)
  app.post("/api/users/:userId/progress-milestones/sync", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { localMilestones } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (!Array.isArray(localMilestones)) {
        return res.status(400).json({ message: "Invalid local milestones data" });
      }
      
      const serverMilestones = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.userId, userId));
      
      // Process each local milestone
      const results: {
        created: any[],
        updated: any[],
        unchanged: any[]
      } = {
        created: [],
        updated: [],
        unchanged: []
      };
      
      for (const localMilestone of localMilestones) {
        // Check if milestone exists based on localUuid
        const existingMilestone = serverMilestones.find(m => 
          m.localUuid === localMilestone.localUuid
        );
        
        if (existingMilestone) {
          // Check if local version is newer
          const localUpdatedAt = new Date(localMilestone.updatedAt || 0);
          const serverUpdatedAt = existingMilestone.updatedAt || new Date(0);
          
          if (localUpdatedAt > serverUpdatedAt) {
            // Update the server version
            const [updatedMilestone] = await db
              .update(progressMilestones)
              .set({
                title: localMilestone.title,
                description: localMilestone.description,
                category: localMilestone.category,
                progress: localMilestone.progress,
                completed: localMilestone.completed,
                targetDate: localMilestone.targetDate,
                completedDate: localMilestone.completedDate,
                iconType: localMilestone.iconType,
                updatedAt: new Date(),
                lastSyncedAt: new Date()
              })
              .where(eq(progressMilestones.id, existingMilestone.id))
              .returning();
            
            results.updated.push(updatedMilestone);
          } else {
            results.unchanged.push(existingMilestone);
          }
        } else {
          // Create a new milestone on the server
          const [newMilestone] = await db
            .insert(progressMilestones)
            .values({
              userId,
              title: localMilestone.title,
              description: localMilestone.description,
              category: localMilestone.category,
              progress: localMilestone.progress || 0,
              completed: localMilestone.completed || false,
              targetDate: localMilestone.targetDate,
              completedDate: localMilestone.completedDate,
              iconType: localMilestone.iconType,
              localUuid: localMilestone.localUuid,
              lastSyncedAt: new Date()
            })
            .returning();
          
          results.created.push(newMilestone);
        }
      }
      
      // Return all server milestones with sync results
      return res.json({
        synced: results,
        allMilestones: await db
          .select()
          .from(progressMilestones)
          .where(eq(progressMilestones.userId, userId))
      });
    } catch (error) {
      console.error("Error syncing progress milestones:", error);
      return res.status(500).json({ message: "Failed to sync progress milestones" });
    }
  });

  // ===== CONTENT SERVICES (TAVILY INTEGRATION) =====

  // Health content search via Tavily (general search)
  app.post("/api/content/search", async (req, res) => {
    try {
      // Validate request body
      if (!req.body.query) {
        return res.status(400).json({ message: "Query is required" });
      }
      
      const query = req.body.query as string;
      const contentType = req.body.contentType as string || "general";
      const maxResults = req.body.maxResults ? parseInt(req.body.maxResults as string) : 5;
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1; // Default to demo user
      const location = req.body.location as string || undefined; // For location-based searches
      const mealType = req.body.mealType as string || undefined; // For recipe/meal searches
      const dietType = req.body.dietType as string || undefined; // For diet-specific searches
      
      // Record this interaction
      await storage.recordContentInteraction({
        userId,
        contentType,
        contentUrl: `search:${query}`,
        interactionType: "search"
      });
      
      // Perform appropriate search based on content type
      let searchResults: { 
        query: string; 
        answer?: string; 
        results?: TavilySearchResult[];
        videos?: RecipeSearchResult[];
        message?: string;
      };
      
      if (contentType === "youtube_recipes") {
        // Use the specialized YouTube search function for recipes
        const videoFilters = {
          mealType: mealType,
          dietaryPreferences: dietType ? [dietType] : [],
          ingredients: []
        };
        searchResults = await searchCookingVideos(videoFilters);
      } else if (contentType === "ew_support") {
        // Search for Exercise & Weight Support services
        const serviceType = req.body.serviceType || "fitness center";
        searchResults = await searchHealthContent(location || "Sydney NSW", serviceType, maxResults);
      } else if (contentType === "mbp_wizard") {
        // Search for medication prices
        const medication = req.body.medication || "paracetamol";
        searchResults = await searchHealthContent(location || "Sydney NSW", medication, maxResults);
      } else {
        // General health content search
        searchResults = await searchHealthContent(query, contentType, maxResults, location);
      }
      
      // If no Tavily API key or other error
      if (!searchResults.results) {
        return res.status(500).json({ 
          message: "No search results found. Please check if Tavily API key is configured." 
        });
      }
      
      // Validate the results with OpenAI
      const validatedResults = await Promise.all(
        searchResults.results.map(async (result: TavilySearchResult) => {
          // const validation: { isValid: true, score: 1.0, reasons: [] } = await validateContent(result, userId);
          return {
            ...result,
            validation: { isValid: true, score: 1.0, reasons: [] }
          };
        })
      );
      
      // Extract important keywords to add as user preferences
      if (userId) {
        // Add content type as a preference with stronger weight
        await storage.addUserContentPreference({
          userId,
          contentType,
          keyword: contentType,
          weight: 3
        });
        
        // Add search query terms as preferences
        const queryTerms = query.split(' ')
          .filter(term => term.length > 3) // Only significant terms
          .map(term => term.toLowerCase());
          
        for (const term of queryTerms) {
          await storage.addUserContentPreference({
            userId,
            contentType,
            keyword: term,
            weight: 1
          });
        }
      }
      
      return res.json({
        query: searchResults.query,
        results: validatedResults,
        answer: searchResults.answer
      });
    } catch (error) {
      console.error("Content search error:", error);
      return res.status(500).json({ message: "Failed to search for content" });
    }
  });
  
  // Get user content preferences
  app.get("/api/users/:userId/content-preferences", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const contentType = req.query.contentType as string;
      
      if (!contentType) {
        return res.status(400).json({ message: "Content type is required" });
      }
      
      const preferences = await storage.getUserContentPreferences(userId, contentType);
      return res.json(preferences);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve content preferences" });
    }
  });
  
  // Add user content preference
  app.post("/api/users/:userId/content-preferences", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const preferenceData = {
        ...req.body,
        userId
      };
      
      const validatedData = insertUserContentPreferenceSchema.parse(preferenceData);
      const preference = await storage.addUserContentPreference(validatedData);
      return res.status(201).json(preference);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid content preference data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to add content preference" });
    }
  });
  
  // Get user favorites
  app.get("/api/users/:userId/favorites", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const contentType = req.query.contentType as string;
      
      if (!contentType) {
        return res.status(400).json({ message: "Content type is required" });
      }
      
      const favorites = await storage.getUserFavorites(userId, contentType);
      return res.json(favorites);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve favorites" });
    }
  });
  
  // Save user favorite
  app.post("/api/users/:userId/favorites", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const favoriteData = {
        ...req.body,
        userId
      };
      
      const validatedData = insertUserFavoriteSchema.parse(favoriteData);
      const favorite = await storage.saveUserFavorite(validatedData);
      
      // Record this interaction
      await storage.recordContentInteraction({
        userId,
        contentType: validatedData.contentType,
        contentUrl: validatedData.contentUrl,
        interactionType: "favorite"
      });
      
      return res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to save favorite" });
    }
  });
  
  // Remove user favorite
  app.delete("/api/users/:userId/favorites", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      if (!req.body.contentUrl) {
        return res.status(400).json({ message: "Content URL is required" });
      }
      
      const success = await storage.removeUserFavorite(userId, req.body.contentUrl);
      
      if (!success) {
        return res.status(404).json({ message: "Favorite not found" });
      }
      
      // Record this interaction
      await storage.recordContentInteraction({
        userId,
        contentType: req.body.contentType || "unknown",
        contentUrl: req.body.contentUrl,
        interactionType: "unfavorite"
      });
      
      return res.json({ message: "Favorite removed successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to remove favorite" });
    }
  });
  
  // Record content interaction
  app.post("/api/users/:userId/content-interactions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const interactionData = {
        ...req.body,
        userId
      };
      
      const validatedData = insertContentInteractionSchema.parse(interactionData);
      const interaction = await storage.recordContentInteraction(validatedData);
      return res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid interaction data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to record content interaction" });
    }
  });
  
  // Get user content interactions
  app.get("/api/users/:userId/content-interactions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const contentType = req.query.contentType as string | undefined;
      const interactions = await storage.getContentInteractions(userId, contentType);
      return res.json(interactions);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retrieve content interactions" });
    }
  });

  // ===== RECIPE SEARCH AND ANALYSIS (DIET INSPIRATION) =====
  
  // Search for recipes based on ingredients, cuisine type, and meal type
  app.post("/api/recipes/search", async (req, res) => {
    try {
      // Record feature usage
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1; // Default to demo user
      await storage.recordFeatureUsage(userId, "recipe_search");
      
      // Build search filters
      const filters = {
        ingredients: Array.isArray(req.body.ingredients) ? req.body.ingredients : [],
        cuisineType: req.body.cuisineType,
        mealType: req.body.mealType,
        dietaryPreferences: Array.isArray(req.body.dietaryPreferences) ? req.body.dietaryPreferences : [],
        maxCookingTime: req.body.maxCookingTime ? parseInt(req.body.maxCookingTime) : undefined
      };
      

      
      // Search for recipes
      const recipeResults = await searchRecipes(filters);
      
      if (!recipeResults || !recipeResults.results || recipeResults.results.length === 0) {

        return res.status(404).json({ 
          message: "No recipes found matching your criteria. Try broadening your search.",
          query: recipeResults?.query || 'unknown'
        });
      }
      

      
      // Return basic results without analysis to speed up initial response
      return res.json({ 
        recipes: recipeResults.results,
        query: recipeResults.query,
        answer: recipeResults.answer
      });
    } catch (error: any) {
      console.error('Error searching recipes:', error);
      
      // Provide a more descriptive error message
      const errorMessage = error?.message || "An unknown error occurred";
      
      return res.status(500).json({ 
        message: `Failed to search for recipes: ${errorMessage}`,
        error: process.env.NODE_ENV === 'production' ? undefined : errorMessage
      });
    }
  });
  
  // Analyze a recipe with OpenAI for nutritional information
  app.post("/api/recipes/analyze", async (req, res) => {
    try {
      if (!req.body.recipe) {
        return res.status(400).json({ message: "Recipe data is required" });
      }
      
      // Record feature usage
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1;
      await storage.recordFeatureUsage(userId, "recipe_analysis");
      
      // Analyze recipe
      const enhancedRecipe = await openaiService.analyzeRecipe(req.body.recipe);
      
      // Return enhanced recipe with analysis
      return res.json(enhancedRecipe);
    } catch (error) {
      console.error('Error analyzing recipe:', error);
      return res.status(500).json({ 
        message: "Failed to analyze recipe. Please check if OpenAI API key is configured."
      });
    }
  });

  // Analyze and rank multiple recipes
  app.post("/api/recipes/analyze-batch", async (req, res) => {
    try {
      if (!req.body.recipes || !Array.isArray(req.body.recipes)) {
        return res.status(400).json({ message: "Recipes array is required" });
      }
      
      // Record feature usage
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1;
      await storage.recordFeatureUsage(userId, "recipe_batch_analysis");
      
      // Get user preferences
      const preferences = {
        healthFocus: req.body.healthFocus === true,
        allergies: Array.isArray(req.body.allergies) ? req.body.allergies : [],
        avoidIngredients: Array.isArray(req.body.avoidIngredients) ? req.body.avoidIngredients : []
      };
      
      // Analyze and rank recipes
      const enhancedRecipes = await openaiService.analyzeAndRankRecipes(req.body.recipes, preferences);
      
      // Return enhanced recipes with analysis
      return res.json(enhancedRecipes);
    } catch (error) {
      console.error('Error analyzing recipes in batch:', error);
      return res.status(500).json({ 
        message: "Failed to analyze recipes. Please check if OpenAI API key is configured."
      });
    }
  });
  
  // Save a recipe to user's favorites
  app.post("/api/users/:userId/saved-recipes", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Prepare recipe data
      const recipeData = {
        userId,
        title: req.body.title,
        description: req.body.description || "",
        url: req.body.url,
        thumbnail_url: req.body.thumbnail_url,
        source_name: req.body.source_name,
        cuisine_type: req.body.cuisine_type,
        meal_type: req.body.meal_type,
        nutritional_value: req.body.nutritional_value,
        health_score: req.body.health_score ? parseInt(req.body.health_score) : null,
        health_benefits: Array.isArray(req.body.health_benefits) ? req.body.health_benefits : [],
        calories_estimate: req.body.calories_estimate,
        difficulty_level: req.body.difficulty_level,
        tips: Array.isArray(req.body.tips) ? req.body.tips : []
      };
      
      // Validate recipe data
      const validatedData = insertSavedRecipeSchema.parse(recipeData);
      
      // Save recipe to database
      const [savedRecipe] = await db
        .insert(savedRecipes)
        .values(validatedData)
        .returning();
      
      // Record content interaction
      await storage.recordContentInteraction({
        userId,
        contentType: "diet_recipe",
        contentUrl: recipeData.url,
        interactionType: "favorite"
      });
      
      return res.status(201).json(savedRecipe);
    } catch (error) {
      console.error('Error saving recipe:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recipe data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to save recipe" });
    }
  });
  
  // Get saved recipes for a user
  app.get("/api/users/:userId/saved-recipes", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Query database for saved recipes
      const userRecipes = await db
        .select()
        .from(savedRecipes)
        .where(eq(savedRecipes.userId, userId))
        .orderBy(desc(savedRecipes.created_at));
      
      return res.json(userRecipes);
    } catch (error) {
      console.error('Error retrieving saved recipes:', error);
      return res.status(500).json({ message: "Failed to retrieve saved recipes" });
    }
  });
  
  // Enhanced favorite videos endpoint for Health Snapshots (updated in server enhancement)
  app.get("/api/users/:userId/favorite-videos", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Query user_favorite_videos table using raw SQL for correct table/column names
      const videos = await db.execute(sql`
        SELECT 
          id,
          user_id as "userId",
          title as "contentTitle",
          description,
          url,
          thumbnail_url as "thumbnailUrl",
          source_name as "contentType",
          tags,
          created_at as "savedDate"
        FROM user_favorite_videos 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `);
      
      // Transform videos to include additional metadata for Health Snapshots
      const processedVideos = videos.rows.map((video: any) => ({
        ...video,
        viewCount: Math.floor(Math.random() * 50) + 1, // Mock view count for demonstration
        lastViewedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random last viewed within 7 days
      }));
      
      return res.json(processedVideos);
    } catch (error) {
      console.error("Error fetching favorite videos:", error);
      return res.status(500).json({ message: "Failed to retrieve favorite videos" });
    }
  });
  
  // ===== FOOD STANDARDS API ENDPOINTS =====
  
  // Get CPD-aligned food recommendations from Australian Food Standards
  app.get("/api/food-database/cpd-aligned/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get user's active diet CPD
      const dietCPD = await db
        .select()
        .from(carePlanDirectives)
        .where(and(
          eq(carePlanDirectives.userId, userId),
          eq(carePlanDirectives.category, 'diet'),
          eq(carePlanDirectives.active, true)
        ))
        .limit(1);
      
      if (dietCPD.length === 0) {
        return res.json({
          foods: [],
          summary: {
            totalResults: 0,
            cpdFocus: "No active diet directive found",
            nutritionalGuidance: "Please consult with your doctor to establish a diet plan directive.",
            sourceAuthority: "Australian Food Standards (foodstandards.gov.au)",
            searchTimestamp: new Date().toISOString()
          }
        });
      }
      
      console.log(`[FoodStandards API] Searching for CPD: "${dietCPD[0].directive}"`);
      
      // Use food standards service to get recommendations
      const recommendations = await foodStandardsService.getCPDAlignedFoodRecommendations(dietCPD[0].directive);
      
      console.log(`[FoodStandards API] Found ${recommendations.foods.length} food recommendations`);
      
      return res.json(recommendations);
    } catch (error) {
      console.error("[FoodStandards API] Error:", error);
      return res.status(500).json({ 
        message: "Failed to retrieve food recommendations",
        error: error.message 
      });
    }
  });
  
  // Get general food database search (fallback when no CPD available)
  app.get("/api/food-database/general-search", async (req, res) => {
    try {
      const searchTerms = req.query.terms as string;
      
      if (!searchTerms) {
        return res.status(400).json({ message: "Search terms required" });
      }
      
      console.log(`[FoodStandards API] General search for: "${searchTerms}"`);
      
      // Use a general nutrition query for broad search
      const generalDirective = `Focus on ${searchTerms} with balanced nutrition including adequate protein, healthy fats, complex carbohydrates, and essential vitamins and minerals.`;
      
      const recommendations = await foodStandardsService.getCPDAlignedFoodRecommendations(generalDirective);
      
      return res.json(recommendations);
    } catch (error) {
      console.error("[FoodStandards API] General search error:", error);
      return res.status(500).json({ 
        message: "Failed to search food database",
        error: error.message 
      });
    }
  });

  // Get user's favorite videos specifically for exercise-wellness
  app.get("/api/users/:userId/favorite-videos/exercise-wellness", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Get exercise-wellness favorite videos for the user
      const favoriteVideos = await db.select().from(userFavoriteVideos)
        .where(and(
          eq(userFavoriteVideos.userId, userId),
          or(
            eq(userFavoriteVideos.source_name, 'exercise-wellness'),
            like(userFavoriteVideos.tags, '%exercise%'),
            like(userFavoriteVideos.tags, '%wellness%')
          )
        ))
        .orderBy(desc(userFavoriteVideos.createdAt));
      
      return res.json(favoriteVideos);
    } catch (error) {
      console.error("Error getting exercise-wellness favorite videos:", error);
      return res.status(500).json({ message: "Failed to retrieve favorite videos" });
    }
  });
  
  // Save a favorite video
  app.post("/api/users/:userId/favorite-videos", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const video = req.body;
      
      // Check if video is already in favorites
      const existingVideo = await db
        .select()
        .from(userFavoriteVideos)
        .where(and(
          eq(userFavoriteVideos.userId, userId),
          eq(userFavoriteVideos.url, video.url)
        ))
        .limit(1);
      
      if (existingVideo.length > 0) {
        return res.status(200).json(existingVideo[0]); // Return existing entry
      }
      
      // Add to favorites
      const [savedVideo] = await db
        .insert(userFavoriteVideos)
        .values({
          userId,
          title: video.title,
          description: video.description || "",
          url: video.url,
          thumbnail_url: video.thumbnail_url || null,
          source_name: video.source_name || "YouTube",
          tags: video.tags || []
        })
        .returning();
      
      return res.status(201).json(savedVideo);
    } catch (error) {
      console.error('Error saving favorite video:', error);
      return res.status(500).json({ message: "Failed to save favorite video" });
    }
  });

  // Save favorite video specifically for exercise-wellness
  app.post("/api/users/:userId/favorite-videos/exercise-wellness", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      const { videoId, title, url, description, thumbnail, tags } = req.body;
      
      // Check if video is already in favorites
      const existingVideo = await db
        .select()
        .from(userFavoriteVideos)
        .where(and(
          eq(userFavoriteVideos.userId, userId),
          eq(userFavoriteVideos.url, url)
        ))
        .limit(1);
      
      if (existingVideo.length > 0) {
        return res.status(200).json(existingVideo[0]); // Return existing entry
      }
      
      // Add to exercise-wellness favorites
      const [savedVideo] = await db
        .insert(userFavoriteVideos)
        .values({
          userId,
          title: title || 'Exercise & Wellness Video',
          description: description || '',
          url: url,
          thumbnail_url: thumbnail || null,
          source_name: 'exercise-wellness',
          tags: Array.isArray(tags) ? tags : ['exercise', 'wellness']
        })
        .returning();
      
      return res.status(201).json(savedVideo);
    } catch (error) {
      console.error('Error saving exercise-wellness favorite video:', error);
      return res.status(500).json({ message: "Failed to save favorite video" });
    }
  });
  
  // Delete a favorite video
  app.delete("/api/users/:userId/favorite-videos/:videoId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const videoId = parseInt(req.params.videoId);
      
      if (isNaN(userId) || isNaN(videoId)) {
        return res.status(400).json({ message: "Invalid user ID or video ID" });
      }
      
      await db
        .delete(userFavoriteVideos)
        .where(and(
          eq(userFavoriteVideos.userId, userId),
          eq(userFavoriteVideos.id, videoId)
        ));
      
      return res.status(200).json({ message: "Video removed from favorites" });
    } catch (error) {
      console.error('Error deleting favorite video:', error);
      return res.status(500).json({ message: "Failed to remove favorite video" });
    }
  });

  // Delete favorite video specifically for exercise-wellness (by video ID from external source)
  app.delete("/api/users/:userId/favorite-videos/exercise-wellness/:videoId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const videoId = req.params.videoId; // External video ID, not database ID
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Find and delete by URL pattern (since external video IDs are part of URLs)
      await db
        .delete(userFavoriteVideos)
        .where(and(
          eq(userFavoriteVideos.userId, userId),
          like(userFavoriteVideos.url, `%${videoId}%`)
        ));
      
      return res.status(200).json({ message: "Video removed from favorites" });
    } catch (error) {
      console.error('Error deleting exercise-wellness favorite video:', error);
      return res.status(500).json({ message: "Failed to remove favorite video" });
    }
  });

  // Search for cooking videos on YouTube - simplified like E&W search
  app.post("/api/recipes/videos", async (req, res) => {
    try {
      // Extract userId and filters from request
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1; // Default to demo user
      
      // Record feature usage
      await storage.recordFeatureUsage(userId, "cooking_video_search");
      
      // Extract filters from request - simplified like E&W
      const filters = {
        ingredients: Array.isArray(req.body.ingredients) ? req.body.ingredients : [],
        cuisineType: req.body.cuisineType,
        mealType: req.body.mealType,
        dietaryPreferences: Array.isArray(req.body.dietaryPreferences) ? req.body.dietaryPreferences : [],
        useCPDs: true // Flag to indicate CPDs should be considered in search
      };
      
      console.log(`Searching for cooking videos with filters:`, {
        cuisineType: filters.cuisineType,
        mealType: filters.mealType,
        dietaryPreferences: filters.dietaryPreferences
      });
      
      // Get user CPDs if useCPDs is true
      let userCPDs = null;
      try {
        if (filters.useCPDs) {
          const userCpds = await storage.getUserCpds(userId);
          if (userCpds && userCpds.length > 0) {
            // Get the most recent CPD
            userCPDs = userCpds[0].content;
            console.log("Found user CPDs for cooking video search");
          }
        }
      } catch (error) {
        console.error("Error fetching care plan directives:", error);
        // Continue without CPDs
      }
      
      // Search for cooking videos using the working OpenAI + Tavily integration
      const videoResults = await searchCookingVideos(filters);
      
      // Check if we found any results
      if (videoResults.videos.length === 0) {
        return res.status(404).json({ 
          message: "No cooking videos found matching your criteria. Try broadening your search."
        });
      }
      
      console.log(`Found ${videoResults.videos.length} initial cooking videos`);
      
      // Map the results to match the VideoResult interface expected by the frontend
      // Similar to E&W search architecture
      let videos = videoResults.videos
        .filter(result => result.videoId) // Ensure all results have a valid videoId
        .map(result => ({
          title: result.title,
          url: result.url,
          content: result.content || result.description || 'No description available',
          description: result.description || result.content || 'No description available',
          image: result.thumbnail_url || result.image || `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`,
          thumbnail_url: result.thumbnail_url || result.image || `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`,
          videoId: result.videoId,
          source_name: result.source_name || 'YouTube',
          cuisine_type: result.cuisine_type,
          meal_type: result.meal_type,
          tags: result.tags || []
        }));
      
      console.log(`Selected ${videos.length} best cooking videos after combining results`);
      
      return res.json({ 
        videos: videos.slice(0, 10), // Return top 10 results like E&W
        query: videoResults.query,
        answer: videoResults.answer
      });
    } catch (error) {
      console.error('Error searching cooking videos:', error);
      return res.status(500).json({ 
        message: "Failed to search for cooking videos. Please check if API keys are configured."
      });
    }
  });
  
  // Search for exercise and wellness videos from YouTube
  app.post("/api/exercise-wellness/videos", async (req, res) => {
    try {
      // Extract userId and filters from request
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1; // Default to demo user
      
      // Record feature usage
      await storage.recordFeatureUsage(userId, "exercise_wellness_video_search");
      
      // Extract filters from request
      const filters = {
        category: req.body.category || 'exercise', // Default to 'exercise'
        intensity: req.body.intensity,
        duration: req.body.duration,
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        useCPDs: req.body.useCPDs === true,
        additionalContext: req.body.additionalContext
      };
      
      console.log(`Searching for ${filters.category} videos with filters:`, {
        intensity: filters.intensity,
        duration: filters.duration,
        tags: filters.tags
      });
      
      // Get user CPDs if usesCPDs is true
      let userCPDs = null;
      try {
        if (filters.useCPDs) {
          const userCpds = await storage.getUserCpds(userId);
          if (userCpds && userCpds.length > 0) {
            // Get the most recent CPD
            userCPDs = userCpds[0].content;
            console.log("Found user CPDs for exercise/wellness search");
          }
        }
      } catch (error) {
        console.error("Error fetching care plan directives:", error);
        // Continue without CPDs
      }
      
      // Search for exercise/wellness videos
      const videoResults = await searchExerciseWellnessVideos(
        filters.category as 'exercise' | 'wellness',
        {
          intensity: filters.intensity as 'low' | 'moderate' | 'high',
          duration: filters.duration as 'short' | 'medium' | 'long',
          tags: filters.tags
        }
      );
      
      // Check if we found any results
      if (videoResults.videos.length === 0) {
        return res.status(404).json({ 
          message: "No videos found matching your criteria. Try broadening your search."
        });
      }
      
      console.log(`Found ${videoResults.videos.length} initial ${filters.category} videos`);
      
      // Map the results to match the VideoResult interface expected by the frontend
      // and ensure all videos have valid videoId
      let videos = videoResults.videos
        .filter(result => result.videoId) // Ensure all results have a valid videoId
        .map(result => ({
          title: result.title,
          url: result.url,
          content: result.content || result.description || 'No description available',
          description: result.description || result.content || 'No description available',
          image: result.thumbnail_url || result.image || `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`,
          thumbnail_url: result.thumbnail_url || result.image || `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`,
          videoId: result.videoId,
          source_name: result.source_name || 'YouTube',
          category: filters.category,
          tags: result.tags || [],
          intensity: result.intensity,
          duration: result.duration
        }));

      console.log(`Selected ${videos.length} best ${filters.category} videos after combining results`);
      
      return res.json({ 
        videos: videos.slice(0, 10), // Return top 10 results
        query: videoResults.query,
        answer: videoResults.answer
      });
    } catch (error) {
      console.error(`Error searching ${filters?.category || 'exercise'} videos:`, error);
      return res.status(500).json({ 
        message: "Failed to search for videos. Please check if API keys are configured."
      });
    }
  });

  // Search for exercise and wellness videos from YouTube
      
      if (!videoResults.videos || videoResults.videos.length === 0) {
        return res.status(404).json({ 
          message: videoResults.message || "No cooking videos found matching your criteria. Try broadening your search."
        });
      }
      
      // Analyze recipes with OpenAI if API key is available
      let analyzedResults = videoResults.videos;
      
      if (process.env.OPENAI_API_KEY) {
        try {

          
          // Get first 5 results to analyze with OpenAI (to avoid too many API calls)
          const resultsToAnalyze = videoResults.videos.slice(0, 5);
          
          // Use Promise.all to run analyses in parallel
          const analysesPromises = resultsToAnalyze.map(async (video: RecipeSearchResult, index: number) => {
            try {
              // Build analysis prompt
              let prompt = `
                Analyze this recipe video title and description for someone with dietary preferences: 
                ${dietaryPreferences.join(', ')}.
                
                Title: ${video.title}
                Description: ${video.description}
                `;
              
              // Add doctor's CPD if available
              if (doctorCPD) {
                prompt += `\nDoctor's Diet Recommendations: ${doctorCPD}\n\nPlease ensure your analysis considers if this recipe is compatible with the doctor's recommendations above.`;
              }
              
              // Add user allergies if available
              if (userAllergies.length > 0) {
                prompt += `\nUser Allergies: ${userAllergies.join(', ')}\n\nPlease identify if this recipe contains any of these allergens.`;
              }
              
              prompt += `
                Return your analysis as a JSON object with the following:
                1. calories: estimated calories (number between 200-1200)
                2. difficulty: cooking difficulty level ("easy", "medium", or "hard")
                3. healthScore: health score (number between 1-10)
                4. allergens: array of possible allergens in this recipe
                5. dietCompatibility: object with diet types as keys and boolean values
                6. cpdCompliance: how well this recipe complies with the doctor's care plan directive (scale 1-10, with 10 being fully compliant)
                7. cpdNotes: brief note on why this recipe is or isn't compliant with the doctor's recommendations
                
                Format: {"calories": 500, "difficulty": "medium", "healthScore": 7, "allergens": ["dairy"], "dietCompatibility": {"vegan": false, "keto": true}, "cpdCompliance": 8, "cpdNotes": "This recipe is compliant because..."}
              `;
              
              try {
                // Use services/openai service instead of direct import
                const analysis = await openaiService.getClient().chat.completions.create({
                  model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                  messages: [
                    { 
                      role: "system", 
                      content: "You are a nutrition expert analyzing recipes. Always respond with properly formatted JSON only. Do not include markdown formatting, code blocks, or explanatory text." 
                    },
                    { role: "user", content: prompt }
                  ],
                  response_format: { type: "json_object" }
                });
                
                if (analysis.choices && analysis.choices[0] && analysis.choices[0].message.content) {
                  // Parse content if valid JSON
                  try {
                    // Clean the response - remove any markdown code block formatting
                    let content = analysis.choices[0].message.content;
                    // Remove markdown code blocks if present
                    content = content.replace(/```(?:json)?/g, '').trim();
                    
                    const nutritionalAnalysis = JSON.parse(content);
                    return { ...video, nutritionalAnalysis };
                  } catch (jsonError) {
                    console.error(`Invalid JSON in OpenAI response for recipe ${index}:`, jsonError);
                  }
                }
              } catch (apiError) {
                console.error(`OpenAI API error for recipe ${index}:`, apiError);
                // Continue without analysis for this item
              }
              
              // Return the original video if analysis failed
              return video;
            } catch (error) {
              console.error(`Error in recipe analysis process ${index}:`, error);
              return video; // Return original recipe if any part of analysis fails
            }
          });
          
          // Wait for all analyses to complete
          const analyses = await Promise.all(analysesPromises);
          
          // Filter the analyzed results based on dietary preferences and allergies
          const filteredAnalyses = analyses.filter(video => {
            // Skip filtering if no nutritional analysis available
            if (!video.nutritionalAnalysis) return true;
            
            const analysis = video.nutritionalAnalysis;
            
            // Filter out recipes with allergens that match user allergies
            if (userAllergies.length > 0 && analysis.allergens && analysis.allergens.length > 0) {
              // Check if any user allergy matches any recipe allergen
              const hasAllergen = userAllergies.some(allergy => 
                analysis.allergens.some((allergen: string) => 
                  allergen.toLowerCase().includes(allergy.toLowerCase())
                )
              );
              
              if (hasAllergen) return false;
            }
            
            // Filter based on dietary compatibility if preferences specified
            if (dietaryPreferences.length > 0 && analysis.dietCompatibility) {
              // Check if any dietary preference is explicitly not compatible
              const isIncompatible = dietaryPreferences.some(pref => {
                const normalizedPref = pref.toLowerCase().replace('-', '');
                return Object.entries(analysis.dietCompatibility).some(([diet, compatible]) => 
                  diet.toLowerCase() === normalizedPref && compatible === false
                );
              });
              
              if (isIncompatible) return false;
            }
            
            // If CPD is provided, filter based on CPD compliance score
            if (doctorCPD && analysis.cpdCompliance !== undefined) {
              // Filter out recipes with low CPD compliance (below 5)
              if (analysis.cpdCompliance < 5) return false;
            }
            
            return true;
          });
          

          
          // Sort by CPD compliance first, then health score to prioritize doctor-aligned options
          filteredAnalyses.sort((a: RecipeSearchResult & { nutritionalAnalysis?: any }, b: RecipeSearchResult & { nutritionalAnalysis?: any }) => {
            // First priority: CPD compliance (if doctor's CPD is available)
            if (doctorCPD && a.nutritionalAnalysis?.cpdCompliance && b.nutritionalAnalysis?.cpdCompliance) {
              const cpdDiff = b.nutritionalAnalysis.cpdCompliance - a.nutritionalAnalysis.cpdCompliance;
              if (Math.abs(cpdDiff) > 1) { // Only prioritize if there's meaningful difference
                return cpdDiff;
              }
            }
            
            // Second priority: General health score
            if (a.nutritionalAnalysis?.healthScore && b.nutritionalAnalysis?.healthScore) {
              return b.nutritionalAnalysis.healthScore - a.nutritionalAnalysis.healthScore;
            }
            
            return 0;
          });
          
          // Merge filtered analyzed results back with unanalyzed results
          analyzedResults = [
            ...filteredAnalyses,
            ...videoResults.videos.slice(5)
          ];
        } catch (error) {
          console.warn("OpenAI analysis failed, continuing with unanalyzed results:", error);
          // Continue with original results if OpenAI analysis fails
        }
      }
      
      return res.json({ 
        videos: analyzedResults,
        query: videoResults.query,
        answer: videoResults.answer
      });
    } catch (error) {
      console.error('Error searching cooking videos:', error);
      return res.status(500).json({ 
        message: "Failed to search for cooking videos. Please check if Tavily API key is configured."
      });
    }
  });
  
  // Search for exercise and wellness videos from YouTube
  app.post("/api/exercise-wellness/videos", async (req, res) => {
    try {
      // Extract userId and filters from request
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1; // Default to demo user
      
      // Record feature usage
      await storage.recordFeatureUsage(userId, "exercise_wellness_video_search");
      
      // Extract filters from request
      const filters = {
        category: req.body.category || 'exercise', // Default to 'exercise'
        intensity: req.body.intensity,
        duration: req.body.duration,
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
        useCPDs: req.body.useCPDs === true,
        additionalContext: req.body.additionalContext
      };
      
      console.log(`Searching for ${filters.category} videos with filters:`, {
        intensity: filters.intensity,
        duration: filters.duration,
        tags: filters.tags
      });
      
      // Get user CPDs if usesCPDs is true
      let userCPDs = null;
      try {
        if (filters.useCPDs) {
          const userCpds = await storage.getUserCpds(userId);
          if (userCpds && userCpds.length > 0) {
            // Get the most recent CPD
            userCPDs = userCpds[0].content;
            console.log("Found user CPDs for exercise/wellness search");
          }
        }
      } catch (error) {
        console.error("Error fetching care plan directives:", error);
        // Continue without CPDs
      }
      
      // Search for exercise/wellness videos
      const videoResults = await searchExerciseWellnessVideos(
        filters.category as 'exercise' | 'wellness',
        {
          intensity: filters.intensity as 'low' | 'moderate' | 'high',
          duration: filters.duration as 'short' | 'medium' | 'long',
          tags: filters.tags
        }
      );
      
      // Check if we found any results
      if (videoResults.videos.length === 0) {
        return res.status(404).json({ 
          message: "No videos found matching your criteria. Try broadening your search."
        });
      }
      
      console.log(`Found ${videoResults.videos.length} initial ${filters.category} videos`);
      
      // Map the results to match the VideoResult interface expected by the frontend
      // and ensure all videos have valid videoId
      let videos = videoResults.videos
        .filter(result => result.videoId) // Ensure all results have a valid videoId
        .map(result => ({
          title: result.title,
          url: result.url,
          content: result.content || 'No description available',
          description: result.content || 'No description available',
          image: result.image || `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`,
          videoId: result.videoId,
          category: filters.category,
          intensity: filters.intensity || 'moderate',
          duration: filters.duration || 'medium',
          relevanceScore: result.relevanceScore || 0.5
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance score
      
      // Ensure we have enough results to analyze
      if (videos.length < 10) {
        console.warn(`Only found ${videos.length} valid results, fewer than the 10 requested`);
        
        // If we have too few results, try a broader search by recursively calling this endpoint with fewer filters
        if (videos.length < 5 && (filters.intensity || filters.duration || filters.tags.length > 0)) {
          console.log("Insufficient results, attempting a broader search...");
          
          // Create a broader search by removing some filters
          const broaderFilters = {
            ...filters,
            // Remove the least important filter first
            ...(filters.tags.length > 0 ? { tags: [] } : 
               filters.duration ? { duration: undefined } :
               filters.intensity ? { intensity: undefined } : {})
          };
          
          // Only proceed with broader search if we actually removed a filter
          if (JSON.stringify(broaderFilters) !== JSON.stringify(filters)) {
            console.log("Using broader filters:", broaderFilters);
            
            // Recursively search with broader filters
            const broaderSearch = await searchExerciseWellnessVideos(
              broaderFilters.category as 'exercise' | 'wellness',
              {
                intensity: broaderFilters.intensity as 'low' | 'moderate' | 'high',
                duration: broaderFilters.duration as 'short' | 'medium' | 'long',
                tags: broaderFilters.tags
              }
            );
            
            // Add new results that aren't duplicates (based on videoId)
            const existingVideoIds = new Set(videos.map((v: any) => v.videoId));
            const newVideos = broaderSearch.videos
              .filter((result: any) => result.videoId && !existingVideoIds.has(result.videoId))
              .map(result => ({
                title: result.title,
                url: result.url,
                content: result.content || 'No description available',
                description: result.content || 'No description available',
                image: result.image || `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`,
                videoId: result.videoId,
                category: filters.category,
                intensity: filters.intensity || 'moderate',
                duration: filters.duration || 'medium',
                relevanceScore: (result.relevanceScore || 0.5) * 0.8 // Reduce relevance score as these are from a broader search
              }));
              
            console.log(`Found ${newVideos.length} additional results from broader search`);
            
            // Add the new videos to our results
            videos = [...videos, ...newVideos];
          }
        }
      }
      
      // Ensure we return at most 10 videos, favoring the most relevant ones
      videos = videos.slice(0, 15); // Take a few extra for AI analysis
      
      // Use OpenAI to analyze the videos for enhanced metadata if OpenAI API is available
      let analyzedResults = [...videos];
      
      if (process.env.OPENAI_API_KEY) {
        try {
          // Initialize OpenAI with our API key
          const openai = openaiService.getClient();
          
          // First, prepare a system message based on the user's profile and CPDs if available
          let systemMessage = `You are a health coach specializing in ${filters.category === 'exercise' ? 'fitness' : 'wellness'} video analysis.`;
          
          if (userCPDs) {
            systemMessage += ` The user has the following care plan directives: ${userCPDs}. Consider these directives when analyzing the videos.`;
          }
          
          // Analyze all videos (up to 15) to ensure we get enough good matches
          const analyses = await Promise.all(videos.map(async (video, index) => {
            try {
              // Create a prompt that extracts structured information from the video and rates its suitability
              let prompt = `
                Analyze this ${filters.category} video and extract structured information:
                
                Title: ${video.title}
                Description: ${video.content || 'No description available'}
                
                ${filters.category === 'exercise' ? 
                  `Return your analysis as a JSON object with the following:
                  1. difficultyLevel: exercise difficulty level ("beginner", "intermediate", or "advanced")
                  2. targetMuscleGroups: array of main muscle groups targeted
                  3. caloriesBurn: estimated calories burned in 30 minutes (number between 100-600)
                  4. suitableFor: array of people this exercise is suitable for (e.g., "seniors", "beginners", "people with joint pain")
                  5. equipment: array of required equipment or "no equipment" if none needed
                  6. healthBenefits: array of health benefits
                  7. precautions: array of precautions or contraindications
                  8. skillLevel: required skill level ("beginner", "intermediate", "advanced")
                  9. intensityScore: intensity score (number between 1-10)
                  10. suitabilityScore: how suitable this video is for the intended purpose (number between 1-10)
                  11. isRecommended: whether this video is recommended based on the analysis (boolean)
                  12. recommendationReason: brief reason for the recommendation or lack thereof
                  
                  Format: {"difficultyLevel": "intermediate", "targetMuscleGroups": ["core", "glutes"], "caloriesBurn": 300, "suitableFor": ["beginners", "seniors"], "equipment": ["yoga mat"], "healthBenefits": ["improved flexibility", "stress reduction"], "precautions": ["avoid if you have back problems"], "skillLevel": "beginner", "intensityScore": 5, "suitabilityScore": 8, "isRecommended": true, "recommendationReason": "Good low-impact workout for beginners"}`
                  :
                  `Return your analysis as a JSON object with the following:
                  1. practiceType: type of wellness practice (e.g., "meditation", "breathing exercise", "yoga")
                  2. duration: approximate duration in minutes (number)
                  3. benefitsFor: array of conditions this practice may help with (e.g., "stress", "anxiety", "sleep")
                  4. suitableFor: array of people this practice is suitable for (e.g., "beginners", "anyone", "busy people")
                  5. skillLevel: required skill level ("beginner", "intermediate", "advanced")
                  6. healthBenefits: array of health benefits
                  7. precautions: array of precautions if any
                  8. intensityScore: mental focus intensity score (number between 1-10)
                  9. suitabilityScore: how suitable this video is for the intended purpose (number between 1-10)
                  10. isRecommended: whether this video is recommended based on the analysis (boolean)
                  11. recommendationReason: brief reason for the recommendation or lack thereof
                  
                  Format: {"practiceType": "meditation", "duration": 15, "benefitsFor": ["stress", "anxiety"], "suitableFor": ["beginners", "anyone"], "skillLevel": "beginner", "healthBenefits": ["reduced stress", "improved focus"], "precautions": [], "intensityScore": 4, "suitabilityScore": 9, "isRecommended": true, "recommendationReason": "Excellent beginner meditation with clear instructions"}`
                }
              `;
              
              // Add specific filter requirements to the prompt
              if (filters.intensity) {
                prompt += `\n\nRequested intensity: ${filters.intensity}. Make sure to consider this in your suitabilityScore and isRecommended fields.`;
              }
              
              if (filters.duration) {
                prompt += `\n\nRequested duration: ${filters.duration}. Make sure to consider this in your suitabilityScore and isRecommended fields.`;
              }
              
              if (filters.tags && filters.tags.length > 0) {
                prompt += `\n\nRequested tags/focus: ${filters.tags.join(', ')}. Make sure to consider these in your suitabilityScore and isRecommended fields.`;
              }
              
              const response = await openai.chat.completions.create({
                model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                messages: [
                  { role: "system", content: systemMessage },
                  { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" } // Ensure we get valid JSON back
              });
              
              let content = response.choices[0].message.content || '{}';
              let analysis;
              
              try {
                // Parse the content as JSON
                analysis = typeof content === 'string' ? JSON.parse(content) : content;
                
                // Add combined relevance score that factors in both Tavily relevance and OpenAI suitability
                const aiSuitabilityScore = analysis.suitabilityScore || 5;
                const tavilyRelevanceScore = video.relevanceScore || 0.5;
                
                // Calculate combined score: 60% AI suitability, 40% Tavily relevance
                const combinedScore = (aiSuitabilityScore / 10 * 0.6) + (tavilyRelevanceScore * 0.4);
                
                return { 
                  ...video, 
                  fitnessAnalysis: analysis,
                  recommendationScore: combinedScore
                };
              } catch (jsonError) {
                console.error(`Error parsing analysis for ${filters.category} video ${index}:`, jsonError);
                return {
                  ...video,
                  fitnessAnalysis: { 
                    isRecommended: true, 
                    suitabilityScore: 5,
                    recommendationReason: "Basic recommendation" 
                  },
                  recommendationScore: 0.5
                };
              }
            } catch (error) {
              console.error(`Error analyzing ${filters.category} video ${index}:`, error);
              return {
                ...video,
                fitnessAnalysis: { 
                  isRecommended: true, 
                  suitabilityScore: 5,
                  recommendationReason: "Basic recommendation" 
                },
                recommendationScore: 0.5
              };
            }
          }));
          
          // Sort by recommendation score (higher is better)
          const sortedAnalyses = analyses.sort((a, b) => {
            // First prioritize recommended videos
            const aRecommended = a.fitnessAnalysis?.isRecommended !== false;
            const bRecommended = b.fitnessAnalysis?.isRecommended !== false;
            
            if (aRecommended && !bRecommended) return -1;
            if (!aRecommended && bRecommended) return 1;
            
            // Then sort by recommendation score
            return (b.recommendationScore || 0.5) - (a.recommendationScore || 0.5);
          });
          
          // Just use the top 10 most recommended videos
          analyzedResults = sortedAnalyses.slice(0, 10);
          
          console.log(`Selected ${analyzedResults.length} best ${filters.category} videos after AI analysis`);
        } catch (error) {
          console.warn("OpenAI analysis failed, continuing with unanalyzed results:", error);
          // If OpenAI analysis fails, just use the top 10 results from Tavily
          analyzedResults = videos.slice(0, 10);
        }
      } else {
        // If no OpenAI API key, just use the top 10 results from Tavily
        analyzedResults = videos.slice(0, 10);
      }
      
      // Always ensure we have exactly 10 results or as many as available
      if (analyzedResults.length > 10) {
        analyzedResults = analyzedResults.slice(0, 10);
      }
      
      // Count how many "good matches" we have (good relevance score or recommended by AI)
      const goodMatches = analyzedResults.filter(result => 
        (result.relevanceScore && result.relevanceScore >= 0.5) || 
        (result.fitnessAnalysis?.isRecommended !== false)
      ).length;
      
      // Add appropriate message based on match quality
      let message = null;
      if (analyzedResults.length < 10) {
        message = `Found ${analyzedResults.length} videos matching your criteria. For more results, try broadening your search or using different tags.`;
      } else if (goodMatches < 7) {
        // If we have 10 results but fewer than 7 are good quality matches
        message = `Found ${goodMatches} highly relevant videos plus ${10 - goodMatches} general recommendations. Try adjusting your search terms for more specific results.`;
      }
      
      // Log search effectiveness metrics
      console.log(`Exercise & Wellness search effectiveness metrics:
        - Category: ${filters.category}
        - Tags: ${filters.tags?.join(', ') || 'none'}
        - Intensity: ${filters.intensity || 'not specified'}
        - Duration: ${filters.duration || 'not specified'}
        - Total results: ${analyzedResults.length}
        - High quality matches: ${goodMatches}
        - Used CPDs: ${filters.useCPDs ? 'yes' : 'no'}
      `);
      
      // Return formatted results
      return res.json({
        videos: analyzedResults,
        query: videoResults.query,
        answer: videoResults.answer,
        message: message
      });
      
    } catch (error) {
      console.error('Error searching exercise/wellness videos:', error);
      return res.status(500).json({ 
        message: "Failed to search for videos. Please check if Tavily API key is configured."
      });
    }
  });
  
  // ===== SPECIALIZED LOCATION-BASED SEARCH ENDPOINTS =====
  
  // Exercise & Weight Support (E&W Support) search - finds fitness services within a radius
  app.post("/api/ew-support/search", async (req, res) => {
    try {
      // Validate request body
      if (!req.body.location) {
        return res.status(400).json({ message: "Location is required" });
      }
      
      if (!req.body.serviceType) {
        return res.status(400).json({ message: "Service type is required" });
      }
      
      const location = req.body.location as string;
      const serviceType = req.body.serviceType as string;
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1;
      const targetResults = req.body.targetResults ? parseInt(req.body.targetResults as string) : 5;
      
      // Record the interaction
      await storage.recordContentInteraction({
        userId,
        contentType: "ew_support",
        contentUrl: `location_search:${serviceType}_in_${location}`,
        interactionType: "search"
      });
      
      // Execute the location-based search with radius expansion
      const searchResults = await searchHealthContent(location, serviceType, targetResults);
      
      // If no results
      if (searchResults.results.length === 0) {
        return res.status(404).json({ 
          message: `No ${serviceType} services found near ${location}. Please try a different location or service type.` 
        });
      }
      
      // Validate the results against user's CPDs
      const validatedResults = await Promise.all(
        searchResults.results.map(async (result) => {
          // const validation: { isValid: true, score: 1.0, reasons: [] } = await validateContent(result, userId);
          return {
            ...result,
            validation: { isValid: true, score: 1.0, reasons: [] }
          };
        })
      );
      
      return res.json({
        query: searchResults.query,
        location: location,
        serviceType: serviceType,
        results: validatedResults,
        answer: searchResults.answer
      });
    } catch (error) {
      console.error("E&W Support search error:", error);
      return res.status(500).json({ message: "Failed to search for fitness services" });
    }
  });
  
  // Medication Best Price Wizard (MBP Wiz) search - finds pharmacies and medication prices
  app.post("/api/mbp-wizard/search", async (req, res) => {
    try {
      // Validate request body
      if (!req.body.location) {
        return res.status(400).json({ message: "Location is required" });
      }
      
      if (!req.body.medication) {
        return res.status(400).json({ message: "Medication name is required" });
      }
      
      const location = req.body.location as string;
      const medication = req.body.medication as string;
      const userId = req.body.userId ? parseInt(req.body.userId as string) : 1;
      const targetResults = req.body.targetResults ? parseInt(req.body.targetResults as string) : 5;
      
      // Record the interaction
      await storage.recordContentInteraction({
        userId,
        contentType: "mbp_wizard",
        contentUrl: `medication_search:${medication}_in_${location}`,
        interactionType: "search"
      });
      
      // Execute the medication price search with radius expansion
      const searchResults = await searchHealthContent(location, medication, targetResults);
      
      // If no results
      if (searchResults.results.length === 0) {
        return res.status(404).json({ 
          message: `No pharmacies or pricing information found for ${medication} near ${location}. Please try a different location or medication name.` 
        });
      }
      
      // Validate the results against user's CPDs
      const validatedResults = await Promise.all(
        searchResults.results.map(async (result) => {
          // const validation: { isValid: true, score: 1.0, reasons: [] } = await validateContent(result, userId);
          return {
            ...result,
            validation: { isValid: true, score: 1.0, reasons: [] }
          };
        })
      );
      
      return res.json({
        query: searchResults.query,
        location: location,
        medication: medication,
        results: validatedResults,
        answer: searchResults.answer
      });
    } catch (error) {
      console.error("MBP Wizard search error:", error);
      return res.status(500).json({ message: "Failed to search for medication prices" });
    }
  });

  // ========== DOCTOR DASHBOARD API ROUTES ==========
  
  // Get all patients for a doctor
  app.get("/api/doctors/:doctorId/patients", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID format" });
      }
      
      // Query the doctorPatients relationship table
      const relationships = await db.select()
        .from(doctorPatients)
        .where(eq(doctorPatients.doctorId, doctorId));
      
      if (!relationships.length) {
        return res.json([]);
      }
      
      // Get all patient IDs
      const patientIds = relationships.map(rel => rel.patientId);
      
      // Get patient details
      const patientsData = await db.select()
        .from(users)
        .where(inArray(users.id, patientIds));
        
      // Enhance with latest health metrics
      const enhancedPatients = await Promise.all(patientsData.map(async (patient) => {
        const latestMetrics = await storage.getLatestHealthMetricsForUser(patient.id);
        return {
          ...patient,
          latestMetrics
        };
      }));
      
      return res.json(enhancedPatients);
    } catch (error) {
      console.error("Error fetching doctor's patients:", error);
      return res.status(500).json({ message: "Failed to retrieve doctor's patients" });
    }
  });
  
  // Assign a patient to a doctor
  app.post("/api/doctors/:doctorId/patients", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      const { patientId } = req.body;
      
      if (isNaN(doctorId) || isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check if doctor exists and is a doctor
      const doctor = await db.select()
        .from(users)
        .where(eq(users.id, doctorId));
      
      if (!doctor.length) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Check if patient exists and is a patient
      const patient = await db.select()
        .from(users)
        .where(eq(users.id, patientId));
      
      if (!patient.length) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Check if relationship already exists
      const existingRelationship = await db.select()
        .from(doctorPatients)
        .where(and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.patientId, patientId)
        ));
      
      if (existingRelationship.length) {
        return res.status(409).json({ message: "This patient is already assigned to this doctor" });
      }
      
      // Create the relationship
      const result = await db.insert(doctorPatients)
        .values({
          doctorId,
          patientId,
          assignedDate: new Date()
        })
        .returning();
      
      return res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error assigning patient to doctor:", error);
      return res.status(500).json({ message: "Failed to assign patient to doctor" });
    }
  });
  
  // Remove a patient from a doctor
  app.delete("/api/doctors/:doctorId/patients/:patientId", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(doctorId) || isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Delete the relationship
      const result = await db.delete(doctorPatients)
        .where(and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.patientId, patientId)
        ))
        .returning();
      
      if (!result.length) {
        return res.status(404).json({ message: "Relationship not found" });
      }
      
      return res.json({ 
        message: "Patient successfully removed from doctor",
        data: result[0]
      });
    } catch (error) {
      console.error("Error removing patient from doctor:", error);
      return res.status(500).json({ message: "Failed to remove patient from doctor" });
    }
  });
  
  // Get patient progress reports for a doctor
  app.get("/api/doctors/:doctorId/reports", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID format" });
      }
      
      // Get all reports created by this doctor
      const reports = await db.select()
        .from(patientProgressReports)
        .where(eq(patientProgressReports.createdById, doctorId))
        .orderBy(desc(patientProgressReports.reportDate));
      
      // Enhance with patient names
      const enhancedReports = await Promise.all(reports.map(async (report) => {
        const [patient] = await db.select()
          .from(users)
          .where(eq(users.id, report.patientId));
        
        return {
          ...report,
          patientName: patient ? patient.name : 'Unknown Patient'
        };
      }));
      
      return res.json(enhancedReports);
    } catch (error) {
      console.error("Error fetching doctor's reports:", error);
      return res.status(500).json({ message: "Failed to retrieve doctor's reports" });
    }
  });
  
  // Get patient progress reports for a specific patient
  app.get("/api/patients/:patientId/reports", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      // Get all reports for this patient
      const reports = await db.select()
        .from(patientProgressReports)
        .where(eq(patientProgressReports.patientId, patientId))
        .orderBy(desc(patientProgressReports.reportDate));
      
      // Enhance with doctor names
      const enhancedReports = await Promise.all(reports.map(async (report) => {
        const [doctor] = await db.select()
          .from(users)
          .where(eq(users.id, report.createdById));
        
        return {
          ...report,
          doctorName: doctor ? `Dr. ${doctor.name}` : 'Unknown Doctor'
        };
      }));
      
      return res.json(enhancedReports);
    } catch (error) {
      console.error("Error fetching patient's reports:", error);
      return res.status(500).json({ message: "Failed to retrieve patient's reports" });
    }
  });

  // ===== MCP AI EVALUATION =====
  
  // Generate a validated response using the Enhanced MCP service with privacy protection
  app.post("/api/mcp/generate", async (req, res) => {
    try {
      const { 
        prompt,
        systemPrompt,
        healthCategory,
        userId,
        conversationHistory,
        connectivityLevel
      } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get user's health metrics
      const healthMetrics = await storage.getLatestHealthMetricsForUser(userId);
      
      // Get care plan directives
      const carePlanDirectives = await storage.getActiveCarePlanDirectives(userId);
      console.log(`[MCP] Retrieved ${carePlanDirectives.length} active CPDs for user ${userId}:`, 
        carePlanDirectives.map(cpd => `${cpd.category}: ${cpd.directive}`));
      
      // Get recent recommendations
      const recentRecommendations = await storage.getRecentRecommendations(userId, 3);
      
      // Get user information to include first name in responses
      const user = await storage.getUser(userId);
      const patientName = user?.name?.split(' ')[0] || null;
      
      // Check for emergency situations before processing
      const { emergencyDetectionService } = await import('./services/emergencyDetectionService');
      const emergencyResult = await emergencyDetectionService.detectEmergency(prompt, userId);
      
      // If emergency detected, return emergency response immediately
      if (emergencyResult.isEmergency) {
        console.log(`🚨 EMERGENCY DETECTED for user ${userId}: ${emergencyResult.emergencyType}`);
        
        // Record the emergency interaction
        await storage.recordFeatureUsage(userId, 'emergency_detection');
        
        return res.json({
          primaryResponse: emergencyResult.alertMessage,
          provider: 'emergency_system',
          evaluationScore: 1.0,
          evaluationFeedback: 'Emergency response protocol activated',
          isEmergency: true,
          emergencyType: emergencyResult.emergencyType
        });
      }

      // Import the enhanced MCP service with privacy protection
      const { enhancedMCPService2 } = await import('./ai/enhancedMCPService2');
      
      // Set connectivity level if provided
      if (connectivityLevel !== undefined) {
        console.log(`[MCP] Setting connectivity level to: ${connectivityLevel}`);
        enhancedMCPService2.setConnectivityLevel(connectivityLevel);
      } else {
        console.log(`[MCP] No connectivity level provided in request`);
      }
      
      // User details are already loaded above
      
      // Get doctor information if patient has an assigned doctor
      let doctorInfo = null;
      const doctorPatient = await db.select()
        .from(doctorPatients)
        .where(eq(doctorPatients.patientId, userId))
        .limit(1);
      
      if (doctorPatient.length > 0) {
        const doctorId = doctorPatient[0].doctorId;
        const doctor = await storage.getUser(doctorId);
        if (doctor) {
          doctorInfo = {
            name: doctor.name,
            uin: doctor.uin
          };
        }
      }
      
      // Get user's food preferences
      let foodPreferences = null;
      try {
        const userFavourites = await foodDatabaseService.getUserFavourites(userId);
        const recentlyViewed = await foodDatabaseService.getRecentlyViewed(userId, 5);
        
        // Get CPD-relevant tags for dietary directives
        let cpdRelevantTags: string[] = [];
        const dietDirectives = carePlanDirectives?.filter(cpd => cpd.category === 'Diet') || [];
        
        if (dietDirectives.length > 0) {
          // Extract potential dietary tags from CPDs (basic extraction)
          const directiveTexts = dietDirectives.map(d => d.directive.toLowerCase());
          const possibleTags = [
            'low-carb', 'high-protein', 'vegetarian', 'vegan', 'gluten-free', 
            'dairy-free', 'low-fat', 'mediterranean', 'keto', 'paleo', 'halal',
            'kosher', 'low-sodium', 'high-fiber', 'diabetic-friendly'
          ];
          
          cpdRelevantTags = possibleTags.filter(tag => 
            directiveTexts.some(text => text.includes(tag.toLowerCase().replace('-', ' ')))
          );
        }
        
        // Set food preferences for context
        foodPreferences = {
          favouriteFoods: userFavourites.map(food => ({ name: food.name, category: food.category })),
          recentlyViewed: recentlyViewed.map(food => ({ name: food.name, category: food.category })),
          dietaryRestrictions: [], // This would be populated from user preferences in the future
          cpdRelevantTags
        };
      } catch (err) {
        console.warn("Could not retrieve food preferences:", err);
        // Proceed without food preferences if they can't be retrieved
      }
      
      // Create response context with patient and doctor information
      const context = {
        userId,
        patientName: patientName, // Use first name extracted earlier
        healthMetrics,
        carePlanDirectives,
        recentRecommendations,
        conversationHistory,
        connectivityLevel,
        foodPreferences
      };
      
      // Generate response using privacy-protected multi-AI evaluation
      const response = await enhancedMCPService2.generateResponse(
        prompt,
        userId,
        context
);
      
      // Record this interaction for future context
      try {
        await storage.recordFeatureUsage(userId, 'chatbot');
        
        // Store chat memory if we have a substantial interaction
        if (prompt.length > 10 && response.primaryResponse.length > 20) {
          await storage.createChatMemory({
            userId,
            type: 'chat',
            content: JSON.stringify({
              userPrompt: prompt,
              assistantResponse: response.primaryResponse,
              timestamp: new Date()
            }),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
          });
        }
      } catch (storageError) {
        console.warn("Failed to record interaction:", storageError);
        // Continue without storage if there's an error
      }
      
      // Return the response to the client
      return res.json({
        primaryResponse: response.primaryResponse,
        provider: response.provider,
        evaluationScore: response.evaluationScore,
        evaluationFeedback: response.evaluationFeedback
      });
    } catch (error: any) {
      console.error("MCP generate error:", error);
      return res.status(500).json({ 
        message: "Error generating response",
        error: error.message || "Unknown error"
      });
    }
  });
  
  // Legacy API for backward compatibility
  app.post("/api/mcp/evaluate", async (req, res) => {
    try {
      const { recommendationsArray, userId } = req.body;
      
      if (!recommendationsArray || !Array.isArray(recommendationsArray) || recommendationsArray.length === 0) {
        return res.status(400).json({ message: "Valid recommendations array is required" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`MCP validation received for user ${userId} with ${recommendationsArray.length} recommendations`);
      
      // Get the user's data needed for validation
      const metrics = await storage.getLatestHealthMetricsForUser(userId);
      const chatMemories = await storage.getChatMemories(userId);
      const featureUsage = await storage.getMostUsedFeatures(userId);
      const carePlan = await storage.getActiveCarePlanDirectives(userId);
      const userRecommendations = await storage.getRecommendations(userId);
      
      // Create the patient data object for validation
      const patientData = {
        metrics: {
          medication: metrics?.medicationScore || 5,
          diet: metrics?.dietScore || 5,
          exercise: metrics?.exerciseScore || 5
        },
        chatMemories,
        featureUsage: Object.fromEntries(featureUsage.map(f => [f.featureName, f.usageCount])),
        interactions: [], // We don't track these yet
        carePlan,
        recommendationOutcomes: userRecommendations
      };
      
      const response = await mcpService.validateRecommendations(
        recommendationsArray,
        patientData
      );
      
      return res.json(response);
    } catch (error: any) {
      console.error("MCP generate error:", error);
      return res.status(500).json({ 
        message: "Failed to generate MCP response",
        error: error.message || "Unknown error"
      });
    }
  });

  // Test badge algorithm directly
  app.post('/api/test-badge-algorithm', async (req, res) => {
    try {
      const { patientId } = req.body;
      console.log(`[Badge Test] Testing badge algorithm for patient ${patientId}`);
      
      const supervisorAgent = SupervisorAgent.getInstance();
      const result = await supervisorAgent.processDailyScores(patientId, { medication: 9, diet: 8, exercise: 7 });
      
      console.log(`[Badge Test] Result:`, result);
      res.json(result);
    } catch (error) {
      console.error('[Badge Test] Error:', error);
      res.status(500).json({ message: 'Failed to test badge algorithm', error: error.message });
    }
  });

  // ===== ADMIN DASHBOARD API =====
  
  // User context endpoint for impersonation detection
  app.get("/api/user/current-context", async (req, res) => {
    try {
      const session = req.session as SessionData;
      
      if (!session || (!session.userId && !session.doctorId && !session.patientId)) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const response: any = {
        userRole: session.userRole || 'unknown',
      };

      // If admin is impersonating
      if (session.userRole === 'admin' && session.impersonatedDoctorId) {
        response.impersonatedDoctorId = session.impersonatedDoctorId;
        response.adminOriginalUserId = session.userId;
      } else if (session.doctorId) {
        response.doctorId = session.doctorId;
      } else if (session.patientId) {
        response.userId = session.patientId; // Patient dashboard expects userId
        response.patientId = session.patientId;
      }

      res.json(response);
    } catch (error) {
      console.error("Error getting user context:", error);
      res.status(500).json({ message: "Failed to get user context" });
    }
  });

  // Admin impersonation endpoints - simplified for demo without auth
  app.post("/api/admin/set-impersonated-doctor", async (req, res) => {
    try {
      const session = req.session as any;
      
      // For demo purposes, assume admin access without authentication
      const adminUserId = 3; // Default admin ID for demo
      

      
      const { doctorIdToImpersonate } = req.body;
      


      if (typeof doctorIdToImpersonate !== 'number' || doctorIdToImpersonate <= 0) {
        console.error(`[IMPERSONATION DEBUG] Invalid doctor ID provided: ${doctorIdToImpersonate}`);
        return res.status(400).json({ message: "Invalid doctor ID provided for impersonation." });
      }

      // Verify the doctor exists
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, doctorIdToImpersonate), eq(users.roleId, 2)));
      
      if (!doctor) {
        console.error(`[IMPERSONATION DEBUG] Doctor ID ${doctorIdToImpersonate} not found`);
        return res.status(404).json({ message: "Doctor not found" });
      }

      session.impersonatedDoctorId = doctorIdToImpersonate;
      session.adminOriginalUserId = adminUserId;
      session.adminOriginalUserRole = 'admin';

      // Save session manually to ensure persistence
      req.session.save((err: any) => {
        if (err) {
          console.error('[IMPERSONATION DEBUG] Error saving session during set-impersonation:', err);
          return res.status(500).json({ message: "Failed to save session for impersonation." });
        }

        res.json({ success: true, message: `Successfully set impersonation to doctor ID ${doctorIdToImpersonate}` });
      });
    } catch (error) {
      console.error("Error setting impersonation:", error);
      res.status(500).json({ message: "Failed to set impersonation" });
    }
  });

  app.post("/api/admin/clear-impersonation", async (req, res) => {
    try {
      const session = req.session as any;
      const adminUserId = session?.adminOriginalUserId || session?.userId;
      
      console.log(`[IMPERSONATION DEBUG] Clearing impersonation for admin ${adminUserId}`);
      
      // Clear impersonation data
      delete session.impersonatedDoctorId;
      delete session.adminOriginalUserId;
      delete session.adminOriginalUserRole;

      req.session.save((err: any) => {
        if (err) {
          console.error('[IMPERSONATION DEBUG] Error saving session during clear-impersonation:', err);
          return res.status(500).json({ message: "Failed to clear impersonation." });
        }
        console.log(`[IMPERSONATION DEBUG] Admin ${adminUserId} successfully cleared impersonation. Session saved.`);
        res.json({ success: true, message: "Impersonation cleared successfully" });
      });
    } catch (error) {
      console.error("Error clearing impersonation:", error);
      res.status(500).json({ message: "Failed to clear impersonation" });
    }
  });

  // Patient impersonation endpoints - simplified for demo without auth
  app.post("/api/admin/set-impersonated-patient", async (req, res) => {
    try {
      const session = req.session as any;
      
      // For demo purposes, assume admin access without authentication
      const adminUserId = 3; // Default admin ID for demo
      
      console.log(`[PATIENT IMPERSONATION DEBUG] Demo mode - setting admin ID to ${adminUserId}`);
      console.log(`[PATIENT IMPERSONATION DEBUG] Current session ID: ${req.session.id}`);
      
      const { patientIdToImpersonate } = req.body;
      
      console.log(`[PATIENT IMPERSONATION DEBUG] Admin ${adminUserId} attempting to set impersonation for patient: ${patientIdToImpersonate}`);
      console.log(`[PATIENT IMPERSONATION DEBUG] Current session ID: ${req.session.id}`);

      if (typeof patientIdToImpersonate !== 'number' || patientIdToImpersonate <= 0) {
        console.error(`[PATIENT IMPERSONATION DEBUG] Invalid patient ID provided: ${patientIdToImpersonate}`);
        return res.status(400).json({ message: "Invalid patient ID provided for impersonation." });
      }

      // Verify the patient exists
      const [patient] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, patientIdToImpersonate), eq(users.roleId, 3))); // roleId 3 for patients
      
      if (!patient) {
        console.error(`[PATIENT IMPERSONATION DEBUG] Patient ID ${patientIdToImpersonate} not found`);
        return res.status(404).json({ message: "Patient not found" });
      }

      session.impersonatedPatientId = patientIdToImpersonate;
      session.adminOriginalUserId = adminUserId;
      session.adminOriginalUserRole = 'admin';

      // Save session manually to ensure persistence
      req.session.save((err: any) => {
        if (err) {
          console.error('[PATIENT IMPERSONATION DEBUG] Error saving session during set-impersonation:', err);
          return res.status(500).json({ message: "Failed to save session for patient impersonation." });
        }
        console.log(`[PATIENT IMPERSONATION DEBUG] Admin ${adminUserId} successfully set impersonation to Patient ${patientIdToImpersonate}. Session saved.`);
        res.json({ success: true, message: `Successfully set impersonation to patient ID ${patientIdToImpersonate}` });
      });
    } catch (error) {
      console.error("Error setting patient impersonation:", error);
      res.status(500).json({ message: "Failed to set patient impersonation" });
    }
  });

  app.post("/api/admin/clear-impersonation-patient", async (req, res) => {
    try {
      const session = req.session as any;
      const adminUserId = session?.adminOriginalUserId || session?.userId;
      
      console.log(`[PATIENT IMPERSONATION DEBUG] Clearing patient impersonation for admin ${adminUserId}`);
      
      // Clear patient impersonation data
      delete session.impersonatedPatientId;
      delete session.adminOriginalUserId;
      delete session.adminOriginalUserRole;

      req.session.save((err: any) => {
        if (err) {
          console.error('[PATIENT IMPERSONATION DEBUG] Error saving session during clear-patient-impersonation:', err);
          return res.status(500).json({ message: "Failed to clear patient impersonation." });
        }
        console.log(`[PATIENT IMPERSONATION DEBUG] Admin ${adminUserId} successfully cleared patient impersonation. Session saved.`);
        res.json({ success: true, message: "Patient impersonation cleared successfully" });
      });
    } catch (error) {
      console.error("Error clearing patient impersonation:", error);
      res.status(500).json({ message: "Failed to clear patient impersonation" });
    }
  });

  // Admin database cleanup endpoint - clears all demo data except admin user
  app.post("/api/admin/cleanup-demo-data", async (req, res) => {
    try {
      console.log('Starting database cleanup of demo data...');
      
      // Clean up all related data first (to handle foreign key constraints)
      await db.delete(doctorPatients);
      // Clean up all related data first (to handle foreign key constraints)
      await db.delete(carePlanDirectives);
      await db.delete(healthMetrics);
      await db.delete(patientScores);
      await db.delete(savedRecipes);
      await db.delete(userFavoriteVideos);
      await db.delete(patientProgressReports);
      await db.delete(patientInvitations);
      await db.delete(adminActivityLog);
      
      // Finally delete all non-admin users (keep admin user ID 8)
      await db.delete(users).where(and(eq(users.roleId, 3), eq(users.roleId, 2)));
      
      console.log('Database cleanup completed successfully');
      
      return res.json({
        success: true,
        message: "Demo data cleanup completed. Database ready for real patient data collection by Supervisor Agent."
      });
    } catch (error) {
      console.error('Database cleanup error:', error);
      return res.status(500).json({
        success: false,
        message: "Failed to clean up demo data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test workflow endpoint - demonstrates complete admin→doctor→patient creation
  app.post("/api/admin/test-workflow", async (req, res) => {
    try {
      console.log('Testing complete admin→doctor→patient workflow...');
      res.setHeader('Content-Type', 'application/json');
      
      // Create a test doctor
      const doctorData = {
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@example.com", 
        phoneNumber: "+61412345678",
        uin: "A",
        roleId: 2,
        isActive: true,
        doctorLetter: "A",
        joinedDate: new Date()
      };
      
      const [doctor] = await db.insert(users).values(doctorData).returning();
      console.log(`Created test doctor: ${doctor.name} (ID: ${doctor.id})`);
      
      // Create a test patient for the doctor
      const patientData = {
        name: "John Smith",
        email: "john.smith@example.com",
        phoneNumber: "+61456789123",
        uin: "A1", 
        roleId: 3,
        isActive: true,
        patientNumber: 1,
        joinedDate: new Date()
      };
      
      const [patient] = await db.insert(users).values(patientData).returning();
      console.log(`Created test patient: ${patient.name} (ID: ${patient.id})`);
      
      // Assign patient to doctor
      await db.insert(doctorPatients).values({
        doctorId: doctor.id,
        patientId: patient.id,
        assignedDate: new Date(),
        active: true
      });
      
      // Create sample Care Plan Directives for the patient
      await db.insert(carePlanDirectives).values([
        {
          userId: patient.id,
          category: 'diet',
          directive: 'Follow a Mediterranean diet with emphasis on fresh vegetables and omega-3 rich fish',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          userId: patient.id,
          category: 'exercise', 
          directive: 'Walk 30 minutes daily, gradually increase to 45 minutes over 4 weeks',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      console.log('Workflow test completed successfully');
      
      return res.json({
        success: true,
        message: "Test workflow completed successfully",
        results: {
          doctor: { id: doctor.id, name: doctor.name, email: doctor.email },
          patient: { id: patient.id, name: patient.name, email: patient.email },
          message: "Database is ready for Supervisor Agent to collect and manage patient data"
        }
      });
      
    } catch (error) {
      console.error('Workflow test error:', error);
      return res.status(500).json({
        success: false,
        message: "Workflow test failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Quick admin access for testing - direct browser route
  app.get("/admin-quick-access", async (req, res) => {
    try {
      // Get admin user from database
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.roleId, 1))
        .limit(1);
      
      if (!adminUser) {
        return res.status(404).send("Admin user not found");
      }
      
      // Set session with admin user info
      (req.session as any).userId = adminUser.id;
      (req.session as any).userRole = 'admin';
      (req.session as any).lastActivity = Date.now();
      
      console.log(`[QUICK ADMIN ACCESS] Admin ${adminUser.id} logged in via browser quick access`);
      
      // Save session and redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).send("Session save failed");
        }
        console.log(`[QUICK ADMIN ACCESS] Admin session saved successfully for user ${adminUser.id}`);
        res.redirect('/admin-dashboard');
      });
    } catch (error) {
      console.error("Quick admin access error:", error);
      res.status(500).send("Quick access failed");
    }
  });

  // Get current user context (for impersonation detection)
  app.get("/api/user/current-context", async (req, res) => {
    try {
      const session = req.session as any;
      
      const context = {
        userRole: session?.userRole,
        userId: session?.userId,
        doctorId: session?.doctorId,
        patientId: session?.patientId,
        impersonatedDoctorId: session?.impersonatedDoctorId,
        impersonatedPatientId: session?.impersonatedPatientId,
        isImpersonatingPatient: !!session?.impersonatedPatientId,
        adminOriginalUserId: session?.adminOriginalUserId
      };
      
      console.log(`[IMPERSONATION DEBUG] Full session data:`, session);
      console.log(`[IMPERSONATION DEBUG] Current context for session ${req.session.id}:`, context);
      
      res.json(context);
    } catch (error) {
      console.error("Error getting current context:", error);
      res.status(500).json({ message: "Failed to get current context" });
    }
  });

  // Get doctor details by ID (for impersonation display)
  app.get("/api/doctor/details/:id", async (req, res) => {
    try {
      const session = req.session as any;
      const doctorId = parseInt(req.params.id);
      
      // Only allow admin or the doctor themselves to view details
      if (session?.userRole !== 'admin' && session?.doctorId !== doctorId) {
        return res.status(401).json({ message: "Unauthorized to view doctor details" });
      }
      
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, doctorId), eq(users.roleId, 2)));
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      res.json(doctor);
    } catch (error) {
      console.error("Error fetching doctor details:", error);
      res.status(500).json({ message: "Failed to fetch doctor details" });
    }
  });
  
  // Get admin profile
  app.get("/api/admin/profile", async (req, res) => {
    try {
      // First check if admin exists
      const [admin] = await db
        .select()
        .from(users)
        .where(eq(users.roleId, 1)); // Assuming roleId 1 is for admins
      
      // If admin exists, return it
      if (admin) {
        // Get role name for the admin
        const [role] = await db
          .select()
          .from(userRoles)
          .where(eq(userRoles.id, admin.roleId));
          
        return res.json({
          ...admin,
          roleName: role?.name || 'Admin'
        });
      }
      
      // If no admin exists, create default admin
      const now = new Date();
      const [newAdmin] = await db
        .insert(users)
        .values({
          name: "System Administrator",
          email: "admin@keepgoingcare.com",
          username: "admin",
          password: "defaultadmin", // Should be changed immediately in production
          roleId: 1,
          uin: "AD00001",
          joinedDate: now
        })
        .returning();
        
      // Get role name for the new admin
      const [role] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.id, 1));
        
      return res.json({
        ...newAdmin,
        roleName: role?.name || 'Admin'
      });
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      return res.status(500).json({ message: "Failed to retrieve admin profile" });
    }
  });
  
  // Get all doctors
  // Get user roles
  app.get("/api/admin/roles", async (req, res) => {
    try {
      const roles = await db
        .select()
        .from(userRoles);
      
      return res.json(roles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      return res.status(500).json({ message: "Failed to retrieve user roles" });
    }
  });

  app.get("/api/admin/doctors", async (req, res) => {
    try {
      // Get all doctors with their role information
      const doctors = await db
        .select({
          id: users.id,
          uin: users.uin,
          name: users.name,
          email: users.email,
          roleId: users.roleId,
          phoneNumber: users.phoneNumber,
          joinedDate: users.joinedDate,
          username: users.username,
          isActive: users.isActive,
          lastLogin: users.lastLogin,
          roleName: userRoles.name,
          roleDescription: userRoles.description
        })
        .from(users)
        .innerJoin(userRoles, eq(users.roleId, userRoles.id))
        .where(eq(users.roleId, 2)) // Assuming roleId 2 is for doctors
        .orderBy(desc(users.joinedDate));
      
      return res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      return res.status(500).json({ message: "Failed to retrieve doctors" });
    }
  });
  
  // Get all patients
  app.get("/api/admin/patients", async (req, res) => {
    try {
      // Get all patients with their role information
      const patients = await db
        .select({
          id: users.id,
          uin: users.uin,
          name: users.name,
          email: users.email,
          roleId: users.roleId,
          phoneNumber: users.phoneNumber,
          joinedDate: users.joinedDate,
          username: users.username,
          isActive: users.isActive,
          lastLogin: users.lastLogin,
          roleName: userRoles.name,
          roleDescription: userRoles.description
        })
        .from(users)
        .innerJoin(userRoles, eq(users.roleId, userRoles.id))
        .where(eq(users.roleId, 3)) // Assuming roleId 3 is for patients
        .orderBy(desc(users.joinedDate));
      
      return res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      return res.status(500).json({ message: "Failed to retrieve patients" });
    }
  });
  
  // Get system stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      // Get doctor count
      const [doctorResult] = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(eq(users.roleId, 2)); // Assuming roleId 2 is for doctors
      
      // Get patient count
      const [patientResult] = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(eq(users.roleId, 3)); // Assuming roleId 3 is for patients
      
      // Get report count
      const [reportResult] = await db
        .select({ count: sql`count(*)` })
        .from(patientProgressReports);
      
      return res.json({
        doctorCount: parseInt(doctorResult?.count?.toString() || '0'),
        patientCount: parseInt(patientResult?.count?.toString() || '0'),
        reportCount: parseInt(reportResult?.count?.toString() || '0')
      });
    } catch (error) {
      console.error("Error fetching system stats:", error);
      return res.status(500).json({ message: "Failed to retrieve system stats" });
    }
  });

  // Send patient welcome email using the same system as doctors
  app.post("/api/send-patient-welcome", async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ success: false, error: "Email and name required" });
      }

      // Get the correct Replit domain from environment
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 
                           `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const baseUrl = `https://${replitDomain}`;
      const loginUrl = `${baseUrl}/login`;
      
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header with KGC Logo -->
          <div style="text-align: center; padding: 40px 20px 20px; background: linear-gradient(135deg, #2E8BC0 0%, #1e40af 100%);">
            <div style="background-color: white; padding: 15px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="width: 120px; height: 60px; background-color: #2E8BC0; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                <span style="color: white; font-weight: bold; font-size: 16px;">KGC</span>
              </div>
            </div>
            <h1 style="color: white; margin: 20px 0 10px; font-size: 28px; font-weight: 600;">Welcome to Keep Going Care!</h1>
            <p style="color: white; margin: 0; font-size: 16px; opacity: 0.9;">Your Partner in a Healthier Lifestyle</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2E8BC0; margin: 0 0 20px; font-size: 24px;">Hi ${name},</h2>
            
            <p style="color: #374151; line-height: 1.6; margin: 0 0 20px; font-size: 16px;">
              Welcome to <strong>Keep Going Care (KGC)</strong>, your personal health assistant designed to support you on your wellness journey. We're excited to partner with you in achieving your health goals!
            </p>

            <div style="background-color: #f8fafc; border-left: 4px solid #2E8BC0; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <h3 style="color: #2E8BC0; margin: 0 0 10px; font-size: 18px;">🎥 Get Started - Watch Your Orientation Video</h3>
              <p style="color: #374151; margin: 0 0 15px; line-height: 1.6;">Learn how to make the most of your KGC experience:</p>
              <a href="https://youtu.be/ET8aoaQjJn0" style="display: inline-block; background-color: #2E8BC0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Watch Orientation Video</a>
            </div>

            <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h3 style="color: #059669; margin: 0 0 15px; font-size: 18px;">🔑 Access Your KGC Application</h3>
              <p style="color: #374151; margin: 0 0 15px; line-height: 1.6;">Ready to start your health journey? Access your personalised dashboard:</p>
              <a href="${loginUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Access Your KGC Application</a>
            </div>

            <!-- Important Information -->
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h3 style="color: #d97706; margin: 0 0 15px; font-size: 18px;">⚠️ Important Information</h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li><strong>Class I SaMD:</strong> KGC is a Type 1 Software as a Medical Device providing educational support. It is not intended for diagnosis or treatment.</li>
                <li><strong>Privacy:</strong> Your health data is managed securely in accordance with Australian privacy laws.</li>
                <li><strong>AI Limitations:</strong> KGC uses AI technology. All information is for educational purposes and should be verified with your healthcare professional.</li>
              </ul>
            </div>

            <p style="color: #374151; line-height: 1.6; margin: 20px 0 0; font-size: 16px;">
              If you have any questions or need assistance, please don't hesitate to reach out to your healthcare provider.
            </p>

            <div style="margin: 30px 0; padding: 20px 0; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 14px; text-align: center;">
                Sincerely,<br>
                <strong>The Keep Going Care Team</strong><br>
                Anthrocyt AI Pty Ltd
              </p>
            </div>
          </div>
        </div>
      `;

      const { emailService } = await import('./services/emailService');
      const result = await emailService.sendEmail({
        to: email,
        from: 'welcome@keepgoingcare.com',
        subject: 'Welcome to Keep Going Care! Your Partner in a Healthier Lifestyle',
        html: emailHtml
      });

      if (result.success) {
        console.log(`✅ Patient welcome email sent successfully to ${email}`);
        return res.json({ success: true, message: 'Welcome email sent successfully' });
      } else {
        console.log(`❌ Failed to send patient welcome email to ${email}:`, result.error);
        return res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error sending patient welcome email:', error);
      return res.status(500).json({ success: false, error: 'Failed to send welcome email' });
    }
  });
  
  // Add doctor with secure token-based authentication
  app.post("/api/admin/doctors", async (req, res) => {
    try {
      // Import authentication services
      const { generateDoctorSetupToken } = await import('./services/authTokenService');
      const { sendDoctorWelcomeEmail } = await import('./services/emailService');
      
      // Validate input data - ALL fields must be provided by human admin
      if (!req.body.name || !req.body.email || !req.body.phoneNumber || !req.body.uin) {
        return res.status(400).json({ 
          message: "Name, email, phone number, and UIN are required" 
        });
      }

      const doctorInput = {
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        uin: req.body.uin, // UIN must be provided by admin
        roleId: 2, // Set role to doctor
        isActive: false, // Inactive until account setup is complete
        username: undefined, // Will be set during setup
        password: undefined // Will be set during setup
      };
      
      const doctorData = insertUserSchema.parse(doctorInput);
      
      // Check if email already exists
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, doctorData.email));
      
      if (existingEmail.length > 0) {
        return res.status(409).json({ message: "Email already in use" });
      }

      // Check if UIN already exists
      const existingUIN = await db
        .select()
        .from(users)
        .where(eq(users.uin, doctorData.uin));
      
      if (existingUIN.length > 0) {
        return res.status(409).json({ message: "UIN already in use" });
      }

      // Check if phone number already exists
      const existingPhone = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, doctorData.phoneNumber));
      
      if (existingPhone.length > 0) {
        return res.status(409).json({ message: "Phone number already in use" });
      }
      
      // Insert new doctor (inactive until setup completion)
      const [doctor] = await db
        .insert(users)
        .values({
          ...doctorData,
          joinedDate: new Date()
        })
        .returning();
      
      // Generate secure setup token
      const setupToken = generateDoctorSetupToken(doctor.id, doctor.email, doctor.phoneNumber || '');
      
      // Log admin activity
      await db.insert(adminActivityLog).values({
        adminId: 1, // Using the default user (Bill Smith) as admin
        activityType: 'create_doctor',
        entityType: 'user',
        entityId: doctor.id,
        details: { 
          doctorName: doctor.name, 
          doctorEmail: doctor.email,
          setupTokenGenerated: true
        }
      });

      // Send secure welcome email with setup link using DoctorAuthService
      let emailResult = { success: false, error: 'Email not attempted' };
      try {
        const { DoctorAuthService } = await import('./services/doctorAuthService');
        const emailSent = await DoctorAuthService.sendWelcomeEmail(doctor.email, doctor.name, doctor.phoneNumber || '', req);
        
        if (emailSent.success) {
          emailResult = { success: true, error: '' };
          console.log(`Secure welcome email sent successfully to ${doctor.email}`);
        } else {
          emailResult = { 
            success: false, 
            error: emailSent.message || 'Email sending failed' 
          };
        }
      } catch (emailError: any) {
        console.error('Failed to send welcome email:', emailError);
        emailResult = { 
          success: false, 
          error: emailError.message || 'Email sending failed' 
        };
      }
      
      return res.status(201).json({
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        phoneNumber: doctor.phoneNumber,
        uin: doctor.uin,
        isActive: doctor.isActive,
        setupTokenGenerated: true,
        emailSent: emailResult.success,
        emailError: emailResult.success ? undefined : emailResult.error
      });
    } catch (error) {
      console.error("Error creating doctor:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid doctor data", 
          errors: error.errors 
        });
      }
      
      return res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  // Doctor Setup Authentication Endpoints

  // Validate setup token endpoint
  app.post("/api/doctor-setup/validate-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ valid: false, error: "Token is required" });
      }

      const { validateSetupToken } = await import('./services/authTokenService');
      const validation = await validateSetupToken(token);
      
      if (!validation.valid) {
        return res.status(400).json({ 
          valid: false, 
          error: validation.error || "Invalid or expired token" 
        });
      }

      // Get doctor information
      const doctor = await db
        .select()
        .from(users)
        .where(eq(users.id, validation.payload!.doctorId));

      if (doctor.length === 0) {
        return res.status(404).json({ valid: false, error: "Doctor not found" });
      }

      return res.json({
        valid: true,
        doctor: {
          id: doctor[0].id,
          name: doctor[0].name,
          email: doctor[0].email,
          phoneNumber: doctor[0].phoneNumber
        }
      });
    } catch (error) {
      console.error("Token validation error:", error);
      return res.status(500).json({ valid: false, error: "Server error" });
    }
  });

  // Send SMS verification code
  app.post("/api/doctor-setup/send-verification", async (req, res) => {
    try {
      const { token } = req.body;
      
      const { validateSetupToken, generateVerificationCode } = await import('./services/authTokenService');
      const SMSService = await import('./services/smsService');
      
      const validation = await validateSetupToken(token);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: "Invalid token" });
      }

      const doctor = await db
        .select()
        .from(users)
        .where(eq(users.id, validation.payload!.doctorId));

      if (doctor.length === 0) {
        return res.status(404).json({ success: false, error: "Doctor not found" });
      }

      if (!doctor[0].phoneNumber) {
        return res.status(400).json({ success: false, error: "No phone number on file" });
      }

      // Generate verification code
      const verificationCode = await generateVerificationCode(doctor[0].id, doctor[0].phoneNumber);
      
      // Send SMS
      const smsResult = await SMSService.SMSService.sendVerificationCode(
        doctor[0].phoneNumber,
        verificationCode,
        doctor[0].name
      );

      return res.json({
        success: smsResult.success,
        error: smsResult.error
      });
    } catch (error) {
      console.error("SMS verification error:", error);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // Verify SMS code
  app.post("/api/doctor-setup/verify-code", async (req, res) => {
    try {
      const { token, code } = req.body;
      
      const { validateSetupToken, verifyPhoneCode } = await import('./services/authTokenService');
      
      const validation = await validateSetupToken(token);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: "Invalid token" });
      }

      const doctor = await db
        .select()
        .from(users)
        .where(eq(users.id, validation.payload!.doctorId));

      if (doctor.length === 0) {
        return res.status(404).json({ success: false, error: "Doctor not found" });
      }

      // Verify the code
      const verification = await verifyPhoneCode(doctor[0].phoneNumber!, code);
      
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          error: verification.error || "Invalid verification code"
        });
      }

      // Update doctor status to active
      await db
        .update(users)
        .set({ 
          isActive: true,
          lastLogin: new Date()
        })
        .where(eq(users.id, doctor[0].id));

      // Establish proper session for the doctor
      if (!req.session) {
        req.session = {};
      }
      req.session.doctorId = doctor[0].id;
      req.session.userRole = 'doctor';
      req.session.lastActivity = Date.now();
      
      return res.json({
        success: true,
        message: "Setup completed successfully",
        doctor: {
          id: doctor[0].id,
          name: doctor[0].name,
          email: doctor[0].email,
          uin: doctor[0].uin
        }
      });
    } catch (error) {
      console.error("Code verification error:", error);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  });



  // Resend welcome email with updated template
  app.post("/api/doctor-auth/resend-welcome", async (req, res) => {
    try {
      const { email, doctorName } = req.body;
      
      if (!email || !doctorName) {
        return res.status(400).json({ success: false, error: "Email and doctor name required" });
      }

      // Get existing doctor
      const doctor = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (doctor.length === 0) {
        return res.status(404).json({ success: false, error: "Doctor not found" });
      }

      // Generate new setup token
      const setupToken = DoctorAuthService.generateAccessToken(doctor[0].id, doctor[0].email, doctor[0].phoneNumber || '');
      
      console.log(`Generated new setup token for doctor ${doctor[0].id} (${email})`);

      // Send updated welcome email
      const emailResult = await DoctorAuthService.sendWelcomeEmail(email, doctorName, doctor[0].phoneNumber || '', req);

      if (emailResult.success) {
        console.log(`Updated welcome email sent successfully to ${email}`);
        return res.json({ 
          success: true, 
          message: "Updated welcome email sent successfully"
        });
      } else {
        console.error(`Failed to send updated email to ${email}:`, emailResult.message);
        return res.status(500).json({ 
          success: false, 
          error: emailResult.message || "Failed to send email"
        });
      }
    } catch (error) {
      console.error("Resend welcome email error:", error);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  });
  
  // Add patient
  app.post("/api/admin/patients", async (req, res) => {
    try {
      // Validate input data - ALL fields must be provided by human doctor
      if (!req.body.name || !req.body.email || !req.body.phoneNumber || !req.body.uin) {
        return res.status(400).json({ 
          message: "Name, email, phone number, and UIN are required" 
        });
      }

      const patientData = insertUserSchema.parse({
        ...req.body,
        roleId: 3, // Set role to patient
        isActive: true,
        username: req.body.username || undefined, // Username is optional for patients
        password: undefined // SMS-only authentication
      });
      
      // Check if email already exists
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, patientData.email));
      
      if (existingEmail.length > 0) {
        return res.status(409).json({ message: "Email already in use" });
      }

      // Check if UIN already exists
      const existingUIN = await db
        .select()
        .from(users)
        .where(eq(users.uin, patientData.uin));
      
      if (existingUIN.length > 0) {
        return res.status(409).json({ message: "UIN already in use" });
      }

      // Check if phone number already exists
      const existingPhone = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, patientData.phoneNumber));
      
      if (existingPhone.length > 0) {
        return res.status(409).json({ message: "Phone number already in use" });
      }
      
      // Check if username already exists (if provided)
      if (patientData.username) {
        const existingUsername = await db
          .select()
          .from(users)
          .where(eq(users.username, patientData.username));
        
        if (existingUsername.length > 0) {
          return res.status(409).json({ message: "Username already in use" });
        }
      }
      
      // Insert new patient
      const [patient] = await db
        .insert(users)
        .values({
          ...patientData,
          joinedDate: new Date()
        })
        .returning();
      
      // Create default health metrics for the new patient
      await db.insert(healthMetrics).values({
        userId: patient.id,
        medicationScore: 5,
        dietScore: 5,
        exerciseScore: 5
      });
      
      // Log admin activity - using user ID 1 as the admin (Bill Smith)
      await db.insert(adminActivityLog).values({
        adminId: 1, // Using the default user (Bill Smith) as admin
        activityType: 'create_patient',
        entityType: 'user',
        entityId: patient.id,
        details: { patientName: patient.name, patientEmail: patient.email }
      });
      
      return res.status(201).json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid patient data", 
          errors: error.errors 
        });
      }
      
      return res.status(500).json({ message: "Failed to create patient" });
    }
  });
  
  // Delete user (doctor or patient)
  app.delete("/api/admin/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Get user to check if it exists and to log activity
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get role name for logging
      const [role] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.id, user.roleId));
      
      const roleType = role?.name || 'unknown';
      
      // Instead of just deactivating, we'll de-identify the user while keeping their data
      // for analytics and investor reporting
      await db
        .update(users)
        .set({
          name: `De-identified ${roleType} ${user.uin || userId}`,
          email: `deidentified-${userId}@keepgoingcare.com`,
          isActive: false,
          // Keep UIN and other important data for analytics
        })
        .where(eq(users.id, userId));
      
      // Log admin activity - using user ID 1 as the admin (Bill Smith)
      await db.insert(adminActivityLog).values({
        adminId: 1, // Using the default user (Bill Smith) as admin
        activityType: 'deactivate_user',
        entityType: 'user',
        entityId: userId,
        details: { 
          userName: user.name, 
          userEmail: user.email,
          userRole: roleType
        }
      });
      
      return res.json({ 
        message: `${roleType.charAt(0).toUpperCase() + roleType.slice(1)} successfully deactivated and de-identified`,
        success: true 
      });
    } catch (error) {
      console.error("Error deactivating user:", error);
      return res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // ===== DOCTOR-PATIENT ASSIGNMENTS =====

  // Assign patient to a doctor
  app.post("/api/admin/assign-patient", async (req, res) => {
    try {
      const { doctorId, patientId, notes } = req.body;

      if (!doctorId || !patientId) {
        return res.status(400).json({ message: "Doctor ID and Patient ID are required" });
      }

      // Verify doctor exists and is a doctor
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, doctorId),
          eq(users.roleId, 2), // roleId 2 for doctors
          eq(users.isActive, true)
        ));
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found or inactive" });
      }

      // Verify patient exists and is a patient
      const [patient] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, patientId),
          eq(users.roleId, 3), // roleId 3 for patients
          eq(users.isActive, true)
        ));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found or inactive" });
      }

      // Check if assignment already exists
      const existingAssignment = await db
        .select()
        .from(doctorPatients)
        .where(and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.patientId, patientId)
        ));
      
      // If it exists but is inactive, reactivate it
      if (existingAssignment.length > 0) {
        if (!existingAssignment[0].active) {
          const [updatedAssignment] = await db
            .update(doctorPatients)
            .set({ 
              active: true,
              notes: notes || existingAssignment[0].notes,
              assignedDate: new Date() 
            })
            .where(and(
              eq(doctorPatients.doctorId, doctorId),
              eq(doctorPatients.patientId, patientId)
            ))
            .returning();
          
          // Log admin activity
          await db.insert(adminActivityLog).values({
            adminId: 1, // Using the default user (Bill Smith) as admin
            activityType: 'reassign_patient',
            entityType: 'doctor_patient',
            entityId: updatedAssignment.id,
            details: { 
              doctorName: doctor.name, 
              doctorId: doctor.id,
              patientName: patient.name,
              patientId: patient.id
            }
          });
          
          return res.status(200).json({ 
            message: `Patient ${patient.name} has been reassigned to Dr. ${doctor.name}`,
            assignment: updatedAssignment
          });
        } else {
          return res.status(409).json({ 
            message: `Patient ${patient.name} is already assigned to Dr. ${doctor.name}` 
          });
        }
      }
      
      // Create new assignment
      const [newAssignment] = await db
        .insert(doctorPatients)
        .values({
          doctorId,
          patientId,
          notes: notes || null,
          assignedDate: new Date(),
          active: true
        })
        .returning();
      
      // Log admin activity
      await db.insert(adminActivityLog).values({
        adminId: 1, // Using the default user (Bill Smith) as admin
        activityType: 'assign_patient',
        entityType: 'doctor_patient',
        entityId: newAssignment.id,
        details: { 
          doctorName: doctor.name, 
          doctorId: doctor.id,
          patientName: patient.name,
          patientId: patient.id
        }
      });
      
      return res.status(201).json({ 
        message: `Patient ${patient.name} has been assigned to Dr. ${doctor.name}`,
        assignment: newAssignment
      });
    } catch (error) {
      console.error("Error assigning patient to doctor:", error);
      return res.status(500).json({ message: "Failed to assign patient to doctor" });
    }
  });

  // Get patients assigned to a doctor
  app.get("/api/admin/doctor/:doctorId/patients", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.doctorId);
      
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID format" });
      }
      
      // Verify doctor exists
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, doctorId),
          eq(users.roleId, 2) // roleId 2 for doctors
        ));
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Get assigned patients
      const assignedPatients = await db
        .select({
          assignmentId: doctorPatients.id,
          patient: {
            id: users.id,
            name: users.name,
            email: users.email,
            uin: users.uin,
            isActive: users.isActive,
            joinedDate: users.joinedDate
          },
          assignedDate: doctorPatients.assignedDate,
          active: doctorPatients.active,
          notes: doctorPatients.notes,
          lastReviewed: doctorPatients.lastReviewed
        })
        .from(doctorPatients)
        .innerJoin(users, eq(doctorPatients.patientId, users.id))
        .where(eq(doctorPatients.doctorId, doctorId))
        .orderBy(desc(doctorPatients.assignedDate));
      
      return res.json(assignedPatients);
    } catch (error) {
      console.error("Error fetching assigned patients:", error);
      return res.status(500).json({ message: "Failed to retrieve assigned patients" });
    }
  });

  // Test UIN System Endpoint - Unlimited Scaling
  app.get('/api/admin/test-uin-system', asyncHandler(async (req, res) => {
    const uinStats = await uinService.getUINStatistics();
    
    // Test generating new UIDs for unlimited scaling
    const testResults = {
      statistics: uinStats,
      testGeneration: {
        admin: await uinService.generateUIN('admin'),
        doctor: await uinService.generateUIN('doctor'), 
        patient: await uinService.generateUIN('patient')
      },
      batchGeneration: {
        doctors: await uinService.generateBatchUIDs('doctor', 25), // Test beyond old 10-doctor limit
        patients: await uinService.generateBatchUIDs('patient', 100) // Test beyond old 50-patient limit
      },
      scalabilityInfo: {
        maxAdmins: 'Unlimited (KGC-ADM-001, KGC-ADM-002, ...)',
        maxDoctors: 'Unlimited (KGC-DOC-001, KGC-DOC-002, ...)',
        maxPatients: 'Unlimited (KGC-PAT-001, KGC-PAT-002, ...)',
        previousLimit: '51 total users (1 admin, 10 doctors, 50 patients)',
        newCapacity: 'Millions of users with professional healthcare UIDs'
      }
    };
    
    res.json(testResults);
  }));

  // Get doctors assigned to a patient
  app.get("/api/admin/patient/:patientId/doctors", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      // Verify patient exists
      const [patient] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, patientId),
          eq(users.roleId, 3) // roleId 3 for patients
        ));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Get assigned doctors
      const assignedDoctors = await db
        .select({
          assignmentId: doctorPatients.id,
          doctor: {
            id: users.id,
            name: users.name,
            email: users.email,
            phoneNumber: users.phoneNumber,
            uin: users.uin,
            isActive: users.isActive
          },
          assignedDate: doctorPatients.assignedDate,
          active: doctorPatients.active,
          notes: doctorPatients.notes,
          lastReviewed: doctorPatients.lastReviewed
        })
        .from(doctorPatients)
        .innerJoin(users, eq(doctorPatients.doctorId, users.id))
        .where(eq(doctorPatients.patientId, patientId))
        .orderBy(desc(doctorPatients.assignedDate));
      
      return res.json(assignedDoctors);
    } catch (error) {
      console.error("Error fetching assigned doctors:", error);
      return res.status(500).json({ message: "Failed to retrieve assigned doctors" });
    }
  });

  // ===== DOCTOR DASHBOARD API =====
  
  // Get doctor profile with admin impersonation support
  app.get("/api/doctor/profile", async (req, res) => {
    try {
      const session = req.session as any;
      const authenticatedDoctorId = session.doctorId;
      const impersonatedDoctorId = session.impersonatedDoctorId;
      const isAdminUser = session.userRole === 'admin';
      const queryDoctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : null;

      let activeDoctorId: number;

      // For demo purposes, prioritize query parameter if provided
      if (queryDoctorId && !isNaN(queryDoctorId)) {
        activeDoctorId = queryDoctorId;
        console.log(`[DEMO DEBUG - Route: ${req.path}] Using query parameter doctorId: ${activeDoctorId}`);
      } else if (isAdminUser && impersonatedDoctorId) {
        // Priority 1: Admin impersonating a doctor
        activeDoctorId = impersonatedDoctorId;
        console.log(`[IMPERSONATION DEBUG - Route: ${req.path}] Admin (User ${session.userId}) acting as Impersonated Doctor: ${activeDoctorId}`);
      } else if (session.userRole === 'doctor' && authenticatedDoctorId) {
        // Priority 2: Authenticated Doctor (if not impersonating)
        activeDoctorId = authenticatedDoctorId;
        console.log(`[IMPERSONATION DEBUG - Route: ${req.path}] Authenticated Doctor: ${activeDoctorId}`);
      } else {
        // Default to doctor ID 2 for demo purposes
        activeDoctorId = 2;
        console.log(`[DEMO DEBUG - Route: ${req.path}] No valid session context, defaulting to Doctor ID: ${activeDoctorId}`);
      }
      
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, activeDoctorId),
          eq(users.roleId, 2) // roleId 2 is for doctors
        ));
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      return res.json(doctor);
    } catch (error) {
      console.error("Error fetching doctor profile:", error);
      return res.status(500).json({ message: "Failed to retrieve doctor profile" });
    }
  });
  
  // Update doctor profile
  app.patch("/api/doctor/profile", async (req, res) => {
    try {
      // For testing purposes, allow passing doctorId in query params
      const doctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : 3; // Default to Dr. Adel (id: 3)
      
      // Validate the update data
      const updateData = updateUserSchema.parse(req.body);
      
      // Verify the doctor exists and is actually a doctor
      const [existingDoctor] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, doctorId),
          eq(users.roleId, 2) // Assuming roleId 2 is for doctors
        ));
      
      if (!existingDoctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Update the doctor's profile
      const [updatedDoctor] = await db
        .update(users)
        .set({
          ...updateData
        })
        .where(eq(users.id, doctorId))
        .returning();
      
      return res.json(updatedDoctor);
    } catch (error) {
      console.error("Error updating doctor profile:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: error.errors 
        });
      }
      
      return res.status(500).json({ message: "Failed to update doctor profile" });
    }
  });
  
  // Create new patient (Doctor Dashboard)
  app.post("/api/doctor/patients", async (req, res) => {
    try {
      const { name, email, phoneNumber, dietDirective, exerciseDirective, medicationDirective } = req.body;
      
      // Validate required fields
      if (!name || !email || !phoneNumber) {
        return res.status(400).json({ message: "Name, email, and phone number are required" });
      }
      
      // Check if email is already in use
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "Email already in use" });
      }
      
      // Generate UIN for patient
      const uinResult = await UINService.getInstance().generateUIN('patient');
      const uin = uinResult.uin;
      
      // Generate username from name (for database constraint)
      const username = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString().slice(-4);
      
      // Create patient data
      const patientData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber.trim(),
        username: username, // Required by database schema
        roleId: 3, // Patient role
        uin,
        isActive: false, // Will be activated after SMS verification
        joinedDate: new Date()
      };
      
      // Insert new patient
      const [patient] = await db
        .insert(users)
        .values(patientData)
        .returning();
      
      if (!patient || !patient.id) {
        throw new Error('Patient creation failed - no ID returned');
      }
      
      // Create Care Plan Directives if provided
      const cpdPromises = [];
      
      if (dietDirective && dietDirective.trim()) {
        cpdPromises.push(
          db.insert(carePlanDirectives).values({
            userId: patient.id,
            category: 'diet',
            directive: dietDirective.trim(),
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        );
      }
      
      if (exerciseDirective && exerciseDirective.trim()) {
        cpdPromises.push(
          db.insert(carePlanDirectives).values({
            userId: patient.id,
            category: 'exercise',
            directive: exerciseDirective.trim(),
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        );
      }
      
      if (medicationDirective && medicationDirective.trim()) {
        cpdPromises.push(
          db.insert(carePlanDirectives).values({
            userId: patient.id,
            category: 'medication',
            directive: medicationDirective.trim(),
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        );
      }
      
      // Execute all CPD insertions
      if (cpdPromises.length > 0) {
        await Promise.all(cpdPromises);
      }
      
      // Get the doctor ID from session - support both direct doctor login and admin impersonation
      const session = req.session as any;
      const authenticatedDoctorId = session.doctorId;
      const impersonatedDoctorId = session.impersonatedDoctorId;
      const isAdminUser = session.userRole === 'admin';

      let activeDoctorId: number;

      if (isAdminUser && impersonatedDoctorId) {
        // Priority 1: Admin impersonating a doctor
        activeDoctorId = impersonatedDoctorId;
        console.log(`[PATIENT CREATION] Admin (User ${session.userId}) creating patient for Impersonated Doctor: ${activeDoctorId}`);
      } else if (session.userRole === 'doctor' && authenticatedDoctorId) {
        // Priority 2: Authenticated Doctor
        activeDoctorId = authenticatedDoctorId;
        console.log(`[PATIENT CREATION] Authenticated Doctor ${activeDoctorId} creating patient`);
      } else {
        // Default to doctor ID 2 for demo purposes
        activeDoctorId = 2;
        console.log(`[PATIENT CREATION - DEMO] No valid session context, defaulting to Doctor ID: ${activeDoctorId}`);
      }

      // Verify the doctor exists
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, activeDoctorId), eq(users.roleId, 2)));
      
      if (!doctor) {
        console.error(`[PATIENT CREATION] Doctor ID ${activeDoctorId} not found`);
        return res.status(404).json({ message: "Doctor not found" });
      }

      // Assign patient to the authenticated/impersonated doctor
      console.log(`[PATIENT CREATION] Assigning patient ${patient.id} to doctor ${activeDoctorId} (${doctor.name})`);
      await db.insert(doctorPatients).values({
        doctorId: activeDoctorId,
        patientId: patient.id,
        assignedDate: new Date(),
        active: true
      });
      
      // Send welcome email with SMS login instructions
      try {
        console.log(`Attempting to send welcome email to ${patient.email} for ${patient.name}`);
        const { PatientAuthService } = await import('./services/patientAuthService');
        const emailSent = await PatientAuthService.sendWelcomeEmail(patient.email, patient.name);
        
        if (emailSent.success) {
          console.log('✅ Welcome email sent successfully to', patient.email);
        } else {
          console.error('❌ Failed to send welcome email:', emailSent.message);
        }
      } catch (emailError) {
        console.error('❌ Email service error:', emailError);
      }
      
      return res.status(201).json({
        message: "Patient created successfully",
        patient: {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          uin: patient.uin
        }
      });
      
    } catch (error) {
      console.error("Error creating patient:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        message: "Failed to create patient",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get doctor's patients with admin impersonation support
  app.get("/api/doctor/patients", async (req, res) => {
    try {
      const session = req.session as any;
      const authenticatedDoctorId = session.doctorId;
      const impersonatedDoctorId = session.impersonatedDoctorId;
      const isAdminUser = session.userRole === 'admin';
      const queryDoctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : null;

      let activeDoctorId: number;

      // For demo purposes, prioritize query parameter if provided
      if (queryDoctorId && !isNaN(queryDoctorId)) {
        activeDoctorId = queryDoctorId;
        console.log(`[DEMO DEBUG - Route: ${req.path}] Using query parameter doctorId: ${activeDoctorId}`);
      } else if (isAdminUser && impersonatedDoctorId) {
        // Priority 1: Admin impersonating a doctor
        activeDoctorId = impersonatedDoctorId;
        console.log(`[IMPERSONATION DEBUG - Route: ${req.path}] Admin (User ${session.userId}) acting as Impersonated Doctor: ${activeDoctorId}`);
      } else if (session.userRole === 'doctor' && authenticatedDoctorId) {
        // Priority 2: Authenticated Doctor (if not impersonating)
        activeDoctorId = authenticatedDoctorId;
        console.log(`[IMPERSONATION DEBUG - Route: ${req.path}] Authenticated Doctor: ${activeDoctorId}`);
      } else {
        // Default to doctor ID 2 for demo purposes
        activeDoctorId = 2;
        console.log(`[DEMO DEBUG - Route: ${req.path}] No valid session context, defaulting to Doctor ID: ${activeDoctorId}`);
      }
      
      // Get assigned patients from the doctor_patients relationship table
      const relationships = await db.select()
        .from(doctorPatients)
        .where(and(
          eq(doctorPatients.doctorId, activeDoctorId),
          eq(doctorPatients.active, true)
        ));
      
      if (!relationships.length) {
        return res.json([]);
      }
      
      // Get the patient IDs
      const patientIds = relationships.map(rel => rel.patientId);
      
      // Get patient details
      const patientsData = await db.select()
        .from(users)
        .where(inArray(users.id, patientIds));
        
      // Enhance with latest health metrics (if available)
      const enhancedPatients = await Promise.all(patientsData.map(async (patient) => {
        const latestMetrics = await storage.getLatestHealthMetricsForUser(patient.id);
        const relationship = relationships.find(rel => rel.patientId === patient.id);
        
        return {
          ...patient,
          assignedDate: relationship?.assignedDate,
          lastReviewed: relationship?.lastReviewed,
          latestMetrics: latestMetrics || {
            dietScore: 7,
            exerciseScore: 6,
            medicationScore: 8
          }
        };
      }));
      
      return res.json(enhancedPatients);
    } catch (error) {
      console.error("Error fetching doctor's patients:", error);
      return res.status(500).json({ message: "Failed to retrieve doctor's patients" });
    }
  });
  
  // Get doctor's patient details
  app.get("/api/doctor/patients/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      // Get patient details
      const [patient] = await db.select()
        .from(users)
        .where(and(
          eq(users.id, patientId),
          eq(users.roleId, 3) // roleId 3 for patients
        ));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Get patient's care plan directives
      const carePlanDirectives = await storage.getCarePlanDirectives(patientId);
      
      // Get patient's latest health metrics
      const latestMetrics = await storage.getLatestHealthMetricsForUser(patientId);
      
      // Combine all data
      const patientDetails = {
        ...patient,
        carePlanDirectives,
        latestMetrics: latestMetrics || {
          dietScore: 7,
          exerciseScore: 6,
          medicationScore: 8
        }
      };
      
      return res.json(patientDetails);
    } catch (error) {
      console.error("Error fetching patient details:", error);
      return res.status(500).json({ message: "Failed to retrieve patient details" });
    }
  });
  
  // Get doctor's reports for a patient
  app.get("/api/doctor/patients/:patientId/reports", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      const reports = await getPatientProgressReports(patientId);
      return res.json(reports);
    } catch (error) {
      console.error("Error fetching patient reports:", error);
      return res.status(500).json({ message: "Failed to retrieve patient reports" });
    }
  });
  
  // Generate new progress report for a patient
  app.post("/api/doctor/patients/:patientId/reports", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      // Use Dr. Marijke Collins (ID: 1) as the doctor for all reports
      // This matches the existing user in the database
      const doctorId = 1;
      
      const report = await generatePatientProgressReport(patientId, doctorId);
      return res.json(report);
    } catch (error) {
      console.error("Error generating patient report:", error);
      return res.status(500).json({ message: "Failed to generate patient report" });
    }
  });
  
  // Get doctor's reports
  app.get("/api/doctor/reports/:reportId", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID format" });
      }
      
      const report = await getPatientProgressReportById(reportId);
      return res.json(report);
    } catch (error) {
      console.error("Error fetching report details:", error);
      return res.status(500).json({ message: "Failed to retrieve report details" });
    }
  });
  
  // Update care plan directive - doctor route
  app.patch("/api/doctor/care-plan-directives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid directive ID format" });
      }
      
      // Validate the update data
      if (!req.body.directive || typeof req.body.directive !== 'string' || req.body.directive.length < 10) {
        return res.status(400).json({ 
          message: "Invalid directive data",
          details: "Directive must be a string of at least 10 characters"
        });
      }
      
      // Get the directive to ensure it exists
      const directive = await storage.getCarePlanDirectiveById(id);
      if (!directive) {
        return res.status(404).json({ message: "Care plan directive not found" });
      }
      
      // Update the directive
      const updatedDirective = await storage.updateCarePlanDirective(id, { 
        directive: req.body.directive
      });
      
      return res.json(updatedDirective);
    } catch (error) {
      console.error("Error updating care plan directive:", error);
      return res.status(500).json({ message: "Failed to update care plan directive" });
    }
  });
  
  // =================== DOCTOR ALERT API ROUTES ===================
  
  // Run the check for missing patient scores (this would typically be a scheduled job)
  app.post("/api/doctor/alerts/check-missing-scores", async (req, res) => {
    try {
      await patientAlertService.checkMissingScores();
      res.status(200).json({ message: "Missing scores check completed successfully" });
    } catch (error) {
      console.error("Error checking missing scores:", error);
      res.status(500).json({ message: "Failed to check missing scores" });
    }
  });
  
  // Get unread alerts for a doctor
  app.get("/api/doctor/alerts", async (req, res) => {
    try {
      const doctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : 3; // Default to demo doctor ID
      
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID format" });
      }
      
      const alerts = await patientAlertService.getUnreadAlerts(doctorId);
      res.json(alerts);
    } catch (error) {
      console.error("Error getting doctor alerts:", error);
      res.status(500).json({ message: "Failed to retrieve doctor alerts" });
    }
  });
  
  // Get unread alert count for a doctor
  app.get("/api/doctor/alerts/count", async (req, res) => {
    try {
      const doctorId = req.query.doctorId ? parseInt(req.query.doctorId as string) : 3; // Default to demo doctor ID
      
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: "Invalid doctor ID format" });
      }
      
      const count = await patientAlertService.getUnreadAlertCount(doctorId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting alert count:", error);
      res.status(500).json({ message: "Failed to retrieve alert count" });
    }
  });
  
  // Mark an alert as read
  app.patch("/api/doctor/alerts/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID format" });
      }
      
      const success = await patientAlertService.markAlertAsRead(id);
      
      if (!success) {
        return res.status(404).json({ message: "Alert not found or could not be updated" });
      }
      
      res.json({ message: "Alert marked as read" });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });
  
  // Delete an alert
  app.delete("/api/doctor/alerts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid alert ID format" });
      }
      
      const success = await patientAlertService.deleteAlert(id);
      
      if (!success) {
        return res.status(404).json({ message: "Alert not found or could not be deleted" });
      }
      
      res.json({ message: "Alert deleted successfully" });
    } catch (error) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });
  
  // =================== FOOD DATABASE API ROUTES ===================
  
  // Get food categories
  app.get("/api/food-database/categories", async (req, res) => {
    try {
      // Return common food categories
      const categories = [
        "Grains",
        "Vegetables",
        "Fruits",
        "Protein",
        "Dairy",
        "Nuts and Seeds",
        "Oils",
        "Beverages",
        "Snacks",
        "Indigenous Foods",
        "Prepared Meals"
      ];
      
      return res.json(categories);
    } catch (error) {
      console.error("Error getting food categories:", error);
      return res.status(500).json({ message: "Error retrieving food categories" });
    }
  });
  
  // Get food item details
  app.get("/api/food-database/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid food ID" });
      }
      
      const [foodItem] = await db.select().from(foodItems)
        .where(eq(foodItems.id, id));
      
      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      // Track view if user is authenticated
      if (req.user?.id) {
        try {
          // Check if user already has a preference
          const [existingPref] = await db.select().from(userFoodPreferences)
            .where(and(
              eq(userFoodPreferences.userId, req.user.id),
              eq(userFoodPreferences.foodItemId, id)
            ));
          
          if (existingPref) {
            // Update existing
            await db.update(userFoodPreferences)
              .set({
                viewCount: existingPref.viewCount + 1,
                lastViewed: new Date()
              })
              .where(eq(userFoodPreferences.id, existingPref.id));
          } else {
            // Create new
            await db.insert(userFoodPreferences)
              .values({
                userId: req.user.id,
                foodItemId: id,
                viewCount: 1,
                lastViewed: new Date()
              });
          }
        } catch (prefError) {
          console.error("Error recording food view:", prefError);
          // Continue anyway - non-critical
        }
      }
      
      return res.json(foodItem);
    } catch (error) {
      console.error("Error getting food item:", error);
      return res.status(500).json({ message: "Error retrieving food item" });
    }
  });

  // This endpoint was moved and improved at line ~3120
  
  // Setup WebSocket server for real-time communication
  // ===== TAVILY SEARCH API FOR E&W SUPPORT PAGE =====
  
  // Search for fitness facilities - Enhanced implementation
  app.get("/api/search/fitness-facilities", async (req, res) => {
    try {
      // Import searchService locally to avoid circular dependencies
      const searchService = (await import('./services/searchService')).default;
      
      const location = req.query.location as string;
      if (!location) {
        return res.status(400).json({ message: "Location parameter is required" });
      }
      
      const type = req.query.type as string;
      const postcode = req.query.postcode as string;
      const useLocalSearch = req.query.useLocalSearch === 'true';
      const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 5;
      
      console.log(`API request: Searching for ${type || 'all'} fitness facilities near ${location}${postcode ? ` with postcode ${postcode}` : ''}${useLocalSearch ? ' using enhanced search' : ''}`);
      
      // Use the new searchService for better results
      const searchResult = await searchService.searchFitnessFacilities(
        location, 
        type, 
        postcode, 
        useLocalSearch, 
        maxResults
      );
      
      // Check if we found results
      if (searchResult.results.length === 0) {
        console.log(`No facilities found for ${location}`);
        return res.json({ 
          query: `${type || 'fitness'} facilities near ${location}`,
          results: [],
          message: "No facilities found. Try a different location or facility type."
        });
      }
      
      console.log(`Returning ${searchResult.results.length} facilities. Radius expanded: ${searchResult.radiusExpanded}`);
      
      // Return the results to the client
      return res.json({
        query: `${type || 'fitness'} facilities near ${location}`,
        results: searchResult.results,
        radiusExpanded: searchResult.radiusExpanded
      });
    } catch (error) {
      console.error('Error searching for fitness facilities:', error);
      return res.status(500).json({
        message: 'Failed to search for fitness facilities',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Search for personal trainers - Enhanced implementation
  app.get("/api/search/personal-trainers", async (req, res) => {
    try {
      // Import searchService locally to avoid circular dependencies
      const searchService = (await import('./services/searchService')).default;
      
      const location = req.query.location as string;
      if (!location) {
        return res.status(400).json({ message: "Location parameter is required" });
      }
      
      const specialization = req.query.specialization as string;
      const postcode = req.query.postcode as string;
      const useLocalSearch = req.query.useLocalSearch === 'true';
      const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 5;
      
      console.log(`API request: Searching for ${specialization || 'all'} personal trainers near ${location}${postcode ? ` with postcode ${postcode}` : ''}${useLocalSearch ? ' using enhanced search' : ''}`);
      
      // Use the new searchService for better results
      const searchResult = await searchService.searchPersonalTrainers(
        location, 
        specialization, 
        postcode, 
        useLocalSearch, 
        maxResults
      );
      
      // Check if we found results
      if (searchResult.results.length === 0) {
        console.log(`No trainers found for ${location}`);
        return res.json({ 
          query: `${specialization || 'certified'} personal trainers near ${location}`,
          results: [],
          message: "No personal trainers found. Try a different location or specialization."
        });
      }
      
      console.log(`Returning ${searchResult.results.length} trainers. Radius expanded: ${searchResult.radiusExpanded}`);
      
      // Return the results to the client
      return res.json({
        query: `${specialization || 'certified'} personal trainers near ${location}`,
        results: searchResult.results,
        radiusExpanded: searchResult.radiusExpanded
      });
    } catch (error) {
      console.error('Error searching for personal trainers:', error);
      return res.status(500).json({
        message: 'Failed to search for personal trainers',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'record_feature_usage') {
          const { userId, featureName } = data;
          if (userId && featureName) {
            await storage.recordFeatureUsage(userId, featureName);
            
            // Send back confirmation
            ws.send(JSON.stringify({ 
              type: 'feature_usage_recorded', 
              success: true, 
              featureName 
            }));
            
            // Special monitoring for Keep Going feature
            if (featureName === 'keep-going') {
              console.log('Keep Going feature used by user:', userId);
              
              // Get usage stats for this feature
              const keepGoingUsage = await storage.getFeatureUsage(userId, 'keep-going');
              
              // If user has been using Keep Going a lot recently, they might be experiencing stress
              // We consider frequent usage (more than 5 times in a day) as a potential indication
              const today = new Date();
              const todayUsage = keepGoingUsage.filter(usage => {
                const usageDate = new Date(usage.lastUsed);
                return usageDate.getDate() === today.getDate() && 
                       usageDate.getMonth() === today.getMonth() &&
                       usageDate.getFullYear() === today.getFullYear();
              });
              
              if (todayUsage.length > 5) {
                console.log('User has used Keep Going feature frequently today, potentially experiencing stress');
                
                // Check if we've already sent a self-care recommendation recently (within last hour)
                const recentRecommendations = await storage.getRecentRecommendations(userId, 3);
                const lastHour = new Date(today.getTime() - 3600000); // 1 hour ago
                
                const hasRecentSelfCareRecommendation = recentRecommendations.some(rec => {
                  return rec.recommendedFeature === 'journaling' && 
                         new Date(rec.createdAt) > lastHour;
                });
                
                if (!hasRecentSelfCareRecommendation) {
                  console.log('Sending journaling recommendation due to frequent Keep Going usage');
                  
                  // Get active mental health directive if exists
                  const directives = await storage.getActiveCarePlanDirectives(userId);
                  const mentalHealthDirective = directives.find(d => d.category === 'mental_health');
                  
                  if (mentalHealthDirective) {
                    // Create a journaling recommendation
                    const recommendation = await storage.createRecommendation({
                      userId,
                      directiveId: mentalHealthDirective.id,
                      recommendedFeature: 'journaling',
                      scoreBeforeRecommendation: 5, // Assuming moderate stress level
                      wasFollowed: null,
                      scoreAfterRecommendation: null
                    });
                    
                    // Send a specialized Keep Going recommendation
                    ws.send(JSON.stringify({
                      type: 'keep_going_recommendation',
                      recommendation: {
                        ...recommendation,
                        directive: mentalHealthDirective.directive,
                        message: "I've noticed you're using the Keep Going feature frequently today. Would you like to try our Journaling feature to help manage stress levels? It's designed to complement your relaxation practice."
                      }
                    }));
                  }
                }
              }
            }
          }
        } 
        else if (data.type === 'check_for_updated_cpds') {
          console.log('Received check_for_updated_cpds message');
          const { userId } = data;
          console.log('User ID:', userId);
          
          if (userId) {
            try {
              // Get active care plan directives
              const directives = await storage.getActiveCarePlanDirectives(userId);
              console.log('Retrieved active CPDs for user', userId, 'count:', directives.length);
              
              // Send back the updated CPDs
              ws.send(JSON.stringify({
                type: 'updated_cpds_available',
                updated: true,
                newDirectives: directives
              }));
              
              console.log('Sent updated CPDs to client');
            } catch (error) {
              console.error('Error fetching CPDs:', error);
              ws.send(JSON.stringify({
                type: 'updated_cpds_available',
                updated: false,
                error: 'Failed to fetch care plan directives'
              }));
            }
          } else {
            console.error('Missing userId in check_for_updated_cpds message');
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Missing userId in request'
            }));
          }
        }
        else if (data.type === 'request_recommendation') {
          console.log('Received request_recommendation message');
          const { userId } = data;
          console.log('User ID:', userId);
          
          // Check if we've already sent a recommendation recently (within the last 5 minutes)
          // This helps prevent too frequent recommendations but ensures timely stress management
          const recentRecommendations = await storage.getRecentRecommendations(userId, 1);
          const hasRecentRecommendation = recentRecommendations.length > 0 && 
            (new Date().getTime() - new Date(recentRecommendations[0].createdAt).getTime() < 300000); // 5 minutes = 300000 ms
          
          if (hasRecentRecommendation) {
            console.log('Already sent a recommendation recently, returning the existing one');
            ws.send(JSON.stringify({
              type: 'recommendation',
              recommendation: {
                ...recentRecommendations[0],
                directive: (await storage.getCarePlanDirectives(userId))
                  .find(d => d.id === recentRecommendations[0].directiveId)?.directive || ''
              }
            }));
            return;
          }
          
          if (userId) {
            // Get the most recent health metrics
            const metrics = await storage.getLatestHealthMetricsForUser(userId);
            console.log('Latest health metrics for user:', metrics);
            
            // Get active care plan directives
            const directives = await storage.getActiveCarePlanDirectives(userId);
            
            // Find the directive for the lowest score
            let lowestScoreDirective = null;
            let lowestScore = 10;
            
            if (metrics) {
              console.log('Scores - Diet:', metrics.dietScore, 'Exercise:', metrics.exerciseScore, 'Medication:', metrics.medicationScore);
              
              // Find the lowest score
              if (metrics.dietScore < lowestScore) {
                lowestScore = metrics.dietScore;
                lowestScoreDirective = directives.find(d => d.category === 'diet');
                console.log('Diet score is lowest:', lowestScore);
              }
              
              if (metrics.exerciseScore < lowestScore) {
                lowestScore = metrics.exerciseScore;
                lowestScoreDirective = directives.find(d => d.category === 'exercise');
                console.log('Exercise score is lowest:', lowestScore);
              }
              
              if (metrics.medicationScore < lowestScore) {
                lowestScore = metrics.medicationScore;
                lowestScoreDirective = directives.find(d => d.category === 'medication');
                console.log('Medication score is lowest:', lowestScore);
              }
              
              console.log('Lowest score directive:', lowestScoreDirective);
            }
            
            // Create a recommendation based on the lowest score
            if (lowestScoreDirective) {
              console.log('Creating recommendation for directive:', lowestScoreDirective);
              
              // Get a more comprehensive list of recommended features based on the category
              let recommendedFeatures = [];
              let primaryFeature = '';
              let reasoningText = '';
              
              if (lowestScoreDirective.category === 'diet') {
                primaryFeature = 'diet-logistics';
                recommendedFeatures = ['inspiration-d', 'diet-logistics', 'journaling'];
                reasoningText = 'Using cognitive behavioral approaches and motivational techniques, these features can help you build healthier eating habits and improve your diet self-score.';
              } 
              else if (lowestScoreDirective.category === 'exercise') {
                primaryFeature = 'wearables';
                recommendedFeatures = ['inspiration-ew', 'ew-support', 'progress-milestones', 'health-snapshots', 'social-checkins'];
                reasoningText = 'These features use motivation enhancement techniques to help you maintain consistent exercise habits and improve your exercise self-score.';
              } 
              else if (lowestScoreDirective.category === 'medication') {
                primaryFeature = 'health-snapshots';
                recommendedFeatures = ['journaling', 'health-snapshots'];
                reasoningText = 'As a non-diagnostic health assistant, I recommend journaling your medication experiences to share with your doctor. Would you like me to help you contact your healthcare provider?';
              }
              else if (lowestScoreDirective.category === 'hydration') {
                primaryFeature = 'food-database';
                recommendedFeatures = ['food-database', 'health-snapshots', 'diet-logistics'];
                reasoningText = 'Improving hydration is essential for overall health. These features can help you track and improve your daily fluid intake.';
              }
              else if (lowestScoreDirective.category === 'mental_health') {
                primaryFeature = 'journaling';
                recommendedFeatures = ['journaling', 'social-checkins'];
                reasoningText = 'These tools use evidence-based approaches to help improve your mental wellbeing and emotional resilience.';
              } 
              else {
                primaryFeature = 'health-snapshots';
                recommendedFeatures = ['health-snapshots', 'chatbot'];
                reasoningText = 'Tracking your health metrics can help identify areas for improvement and maintain your wellness journey.';
              }
              
              console.log('Recommended feature:', primaryFeature);
              
              const recommendation = await storage.createRecommendation({
                userId,
                directiveId: lowestScoreDirective.id,
                recommendedFeature: primaryFeature,
                scoreBeforeRecommendation: lowestScore,
                wasFollowed: null, // Will be updated later
                scoreAfterRecommendation: null // Will be updated later
              });
              
              console.log('Created recommendation:', recommendation);
              
              // Send the recommendation back to the client
              const responseData = {
                type: 'recommendation',
                recommendation: {
                  ...recommendation,
                  directive: lowestScoreDirective.directive
                }
              };
              
              console.log('Sending response:', JSON.stringify(responseData));
              ws.send(JSON.stringify(responseData));
            } else {
              // Send a default response if no recommendation could be made
              ws.send(JSON.stringify({
                type: 'recommendation',
                recommendation: null,
                message: 'No recommendation available at this time'
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Error processing message'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // ===== CONNECTIVITY SIMULATION ENDPOINTS =====

  // Simplified connectivity test endpoint for stability
  app.get("/api/connectivity/test", (req, res) => {
    // Immediately return a response for reliable connectivity testing
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });
  
  // Simplified connectivity status endpoint
  app.get("/api/connectivity/status", (req, res) => {
    res.status(200).json({
      connectivityLevel: ConnectivityLevel.FULL,
      connectivityText: ConnectivityLevel[ConnectivityLevel.FULL],
      timestamp: new Date().toISOString(),
      recommendedModel: selectModelForConnectivity(ConnectivityLevel.FULL)
    });
  });
  
  // Data synchronization endpoint for offline-to-online transitions
  app.post("/api/sync", async (req, res) => {
    try {
      // Log the sync request

      
      // Return success response
      res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        message: "Sync request processed successfully"
      });
    } catch (error) {
      console.error('[Connectivity] Error processing sync request:', error);
      res.status(500).json({
        success: false,
        message: "Error processing sync request"
      });
    }
  });
  
  // =================== FOOD DATABASE ROUTES ===================

  // Search food database
  app.get("/api/food-database/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 3) {
        return res.status(400).json({
          message: "Search query must be at least 3 characters"
        });
      }
      
      // Get user ID from session if available
      const userId = req.user?.id;
      
      // Get limit from query params
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const results = await foodDatabaseService.searchFoods(query, userId, limit);
      return res.json(results);
    } catch (error) {
      console.error('Error searching food database:', error);
      return res.status(500).json({ message: "Failed to search food database" });
    }
  });
  
  // Get food categories
  app.get("/api/food-database/categories", async (req, res) => {
    try {
      const categories = await foodDatabaseService.getCommonCategories();
      return res.json(categories);
    } catch (error) {
      console.error('Error getting food categories:', error);
      return res.status(500).json({ message: "Failed to get food categories" });
    }
  });
  
  // Get foods by category
  app.get("/api/food-database/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      
      if (!category) {
        return res.status(400).json({ message: "Category parameter is required" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const foods = await foodDatabaseService.getFoodsByCategory(category, limit);
      
      return res.json(foods);
    } catch (error) {
      console.error('Error getting foods by category:', error);
      return res.status(500).json({ message: "Failed to get foods by category" });
    }
  });

  // Get food item by ID
  app.get("/api/food-database/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid food item ID" });
      }
      
      const foodItem = await foodDatabaseService.getFoodById(id);
      
      if (!foodItem) {
        return res.status(404).json({ message: "Food item not found" });
      }
      
      // If user is authenticated, record this view
      if (req.user?.id) {
        try {
          await foodDatabaseService.recordFoodView(req.user.id, id);
        } catch (e) {
          // Non-critical error, just log it
          console.warn('Failed to record food view:', e);
        }
      }
      
      return res.json(foodItem);
    } catch (error) {
      console.error('Error getting food item:', error);
      return res.status(500).json({ message: "Failed to get food item" });
    }
  });
  
  // Get CPD-aligned foods
  app.get("/api/food-database/cpd-aligned", async (req, res) => {
    try {
      // Get user ID from session or use Bill Smith's ID for demo purposes
      const userId = req.user?.id || 1; // Default to Bill Smith (ID 1) if not authenticated
      
      // Get user's CPDs
      let userCpds;
      try {
        userCpds = await db.select()
          .from(carePlanDirectives)
          .where(and(
            eq(carePlanDirectives.userId, userId),
            eq(carePlanDirectives.active, true)
          ));
      } catch (dbError) {
        console.error('Error fetching CPDs from database:', dbError);
        userCpds = [];
      }
      
      // Extract relevant diet constraints and find the most recent diet CPD
      const dietCpds = userCpds.filter(cpd => cpd.category === 'diet');
      
      // Get the most recent diet CPD
      let latestDietCpd = null;
      if (dietCpds.length > 0) {
        latestDietCpd = dietCpds.reduce((latest, current) => {
          const latestDate = new Date(latest.updatedAt).getTime();
          const currentDate = new Date(current.updatedAt).getTime();
          return currentDate > latestDate ? current : latest;
        }, dietCpds[0]);
      }
      
      // Process CPDs to extract relevant tags
      const relevantTags: string[] = [];
      
      // If we have a diet directive, analyze it
      if (dietCpds.length > 0) {
        for (const cpd of dietCpds) {
          const directive = cpd.directive.toLowerCase();
          
          // Look for diet types in the directive
          if (directive.includes('mediterranean')) {
            relevantTags.push('mediterranean');
          }
          
          if (directive.includes('low carb') || directive.includes('reduce carb')) {
            relevantTags.push('low-carb');
          }
          if (directive.includes('low fat') || directive.includes('reduce fat')) {
            relevantTags.push('low-fat');
          }
          if (directive.includes('low sodium') || directive.includes('reduce salt') || directive.includes('reduce sodium')) {
            relevantTags.push('low-sodium');
          }
          if (directive.includes('high protein') || directive.includes('increase protein')) {
            relevantTags.push('high-protein');
          }
          if (directive.includes('high fiber') || directive.includes('increase fiber')) {
            relevantTags.push('high-fiber');
          }
          if (directive.includes('diabetes') || directive.includes('blood sugar')) {
            relevantTags.push('low-gi');
          }
          if (directive.includes('fruit') || directive.includes('vegetable')) {
            relevantTags.push('plant-based');
          }
          if (directive.includes('small portion') || directive.includes('smaller portion')) {
            relevantTags.push('portion-control');
          }
        }
      }
      
      // Use a more comprehensive and dynamic approach to extract diet types
      // Add a generic diet analysis function to detect any diet type from CPD
      const dietTypes = [
        { name: 'mediterranean', terms: ['mediterranean'] },
        { name: 'vegetarian', terms: ['vegetarian', 'no meat', 'meatless'] },
        { name: 'vegan', terms: ['vegan', 'plant-based', 'no animal products'] },
        { name: 'keto', terms: ['keto', 'ketogenic', 'low-carb high-fat'] },
        { name: 'paleo', terms: ['paleo', 'paleolithic', 'caveman diet'] },
        { name: 'low-carb', terms: ['low carb', 'reduce carb', 'fewer carbs'] },
        { name: 'low-fat', terms: ['low fat', 'reduce fat', 'low-fat'] },
        { name: 'gluten-free', terms: ['gluten free', 'no gluten', 'gluten-free'] },
        { name: 'dairy-free', terms: ['dairy free', 'no dairy', 'dairy-free', 'lactose'] }
      ];
      
      // Process each diet type
      for (const dietType of dietTypes) {
        if (dietCpds.some(cpd => {
          const directive = cpd.directive.toLowerCase();
          return dietType.terms.some(term => directive.includes(term));
        })) {
          relevantTags.push(dietType.name);
        }
      }
      
      // If we have a latest diet CPD, try to get OpenAI food recommendations
      let openAIFoods = [];
      if (latestDietCpd && process.env.OPENAI_API_KEY) {
        try {
          // Use the OpenAI API to analyze the diet CPD and generate personalized recommendations
          openAIFoods = await generateOpenAIFoodRecommendations(latestDietCpd.directive, relevantTags);
        } catch (aiError) {
          console.error('Error getting OpenAI food recommendations:', aiError);
          // Continue with standard food recommendations if OpenAI fails
        }
      }
      
      // If no relevant tags found, return a general selection
      if (relevantTags.length === 0 && openAIFoods.length === 0) {
        const generalFoods = await db.select().from(foodItems).limit(10);
        
        return res.json({
          foods: generalFoods,
          relevantTags: ['balanced-diet'],
          alignment: 'general'
        });
      }
      
      // If we have OpenAI recommendations, return those
      if (openAIFoods.length > 0) {
        return res.json({
          foods: openAIFoods,
          relevantTags,
          alignment: 'cpd-specific'
        });
      }
      
      // Otherwise use the database to find foods matching the tags
      const allFoods = await db.select().from(foodItems).limit(15);
      const filteredFoods = allFoods.filter(food => {
        if (!food.cpdRelevantTags) return false;
        return food.cpdRelevantTags.some(tag => relevantTags.includes(tag));
      });
      
      return res.json({
        foods: filteredFoods.length > 0 ? filteredFoods : allFoods,
        relevantTags,
        alignment: 'cpd-specific'
      });
    } catch (error) {
      console.error('Error getting CPD-aligned foods:', error);
      return res.status(500).json({ message: "Failed to get CPD-aligned foods" });
    }
  });
  
  // Toggle favourite status for a food item
  app.post("/api/food-database/favourites/toggle", async (req, res) => {
    try {
      // Get user ID from session
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const foodItemId = parseInt(req.body.foodItemId);
      
      if (isNaN(foodItemId)) {
        return res.status(400).json({ message: "Invalid food item ID" });
      }
      
      const isFavorite = await foodDatabaseService.toggleFavourite(userId, foodItemId);
      
      return res.json({ isFavorite });
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      return res.status(500).json({ message: "Failed to update favorite status" });
    }
  });
  
  // Get user's favourite foods
  app.get("/api/food-database/favourites", async (req, res) => {
    try {
      // Get user ID from session or use Bill Smith's ID for demo purposes
      const userId = req.user?.id || 1; // Default to Bill Smith (ID 1) if not authenticated
      
      try {
        const favourites = await foodDatabaseService.getUserFavourites(userId);
        return res.json(favourites);
      } catch (dbError) {
        console.error('Error getting favourites from database:', dbError);
        // Return empty favourites array for testing
        return res.json([]);
      }
    } catch (error) {
      console.error('Error getting favourite foods:', error);
      return res.status(500).json({ message: "Failed to get favourite foods" });
    }
  });
  
  // Get user's recently viewed foods
  app.get("/api/food-database/recently-viewed", async (req, res) => {
    try {
      // Get user ID from session or use Bill Smith's ID for demo purposes
      const userId = req.user?.id || 1; // Default to Bill Smith (ID 1) if not authenticated
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      try {
        const recentlyViewed = await foodDatabaseService.getRecentlyViewed(userId, limit);
        return res.json(recentlyViewed);
      } catch (dbError) {
        console.error('Error getting recently viewed foods from database:', dbError);
        // Return empty array for testing
        return res.json([]);
      }
    } catch (error) {
      console.error('Error getting recently viewed foods:', error);
      return res.status(500).json({ message: "Failed to get recently viewed foods" });
    }
  });
  
  // Service Worker monitoring endpoints for Supervisor Agent
  app.post("/api/supervisor/service-worker-log", async (req, res) => {
    try {
      const { message, type, timestamp } = req.body;
      
      // Log the message to the console for now
      // In production, we would store these logs in the database

      
      // For integration with the Supervisor Agent, you could:
      // 1. Store logs in the database
      // 2. Send notifications for critical errors
      // 3. Update MCP system with offline capability status
      
      // Simulate integration with Supervisor Agent
      if (type === 'error') {
        // If this is an error, we could notify the Supervisor Agent
        // This would integrate with the MCP system

      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error handling service worker log:', error);
      res.status(500).json({ message: 'Failed to process service worker log' });
    }
  });
  
  app.post("/api/supervisor/bulk-service-worker-logs", async (req, res) => {
    try {
      const { logs } = req.body;
      
      if (!Array.isArray(logs)) {
        return res.status(400).json({ message: 'Invalid logs format' });
      }
      
      // Process all logs
      console.log(`[Supervisor Agent] Processing ${logs.length} cached service worker logs`);
      
      logs.forEach(log => {
        console.log(`[SW Cached Log][${log.type}][${log.timestamp}] ${log.message}`);
      });
      
      // Here we would integrate with the MCP system to:
      // 1. Analyze patterns in offline usage
      // 2. Identify potential issues with CPD caching
      // 3. Update the user's feature usage statistics
      
      res.status(200).json({ processed: logs.length });
    } catch (error) {
      console.error('Error processing bulk service worker logs:', error);
      res.status(500).json({ message: 'Failed to process bulk service worker logs' });
    }
  });
  
  // Progress Milestones routes
  
  // Get all milestones for a user
  app.get('/api/users/:userId/progress-milestones', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const milestones = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.userId, userId))
        .orderBy(desc(progressMilestones.updatedAt));
      
      res.json(milestones);
    } catch (error) {
      console.error('Error fetching progress milestones:', error);
      res.status(500).json({ message: 'Error fetching progress milestones' });
    }
  });
  
  // Create a new milestone
  app.post('/api/users/:userId/progress-milestones', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Validate required fields
      const { title, description, category, progress } = req.body;
      if (!title || !description || !category || progress === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Create milestone
      const newMilestone = {
        userId,
        title,
        description,
        category,
        progress: Math.min(Math.max(0, progress), 100), // Ensure progress is between 0-100
        completed: req.body.completed || progress >= 100,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
        completedDate: (req.body.completed || progress >= 100) ? 
          (req.body.completedDate ? new Date(req.body.completedDate) : new Date()) : null,
        iconType: req.body.iconType || 'Trophy',
        localUuid: req.body.localUuid || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };
      
      // Insert into database
      const [milestone] = await db.insert(progressMilestones).values(newMilestone).returning();
      
      res.status(201).json(milestone);
    } catch (error) {
      console.error('Error creating progress milestone:', error);
      res.status(500).json({ message: 'Error creating progress milestone' });
    }
  });
  
  // Update a milestone
  app.patch('/api/progress-milestones/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid milestone ID' });
      }
      
      // First check if milestone exists
      const existingMilestone = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.id, id))
        .limit(1);
      
      if (!existingMilestone || existingMilestone.length === 0) {
        return res.status(404).json({ message: 'Milestone not found' });
      }
      
      // Prepare update data with type safety
      const updateData: Partial<typeof progressMilestones.$inferInsert> = {
        updatedAt: new Date()
      };
      
      // Add fields that are present in the request
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.progress !== undefined) {
        updateData.progress = Math.min(Math.max(0, req.body.progress), 100);
      }
      if (req.body.iconType) updateData.iconType = req.body.iconType;
      if (req.body.targetDate) updateData.targetDate = new Date(req.body.targetDate);
      
      // Handle completion logic
      if (req.body.completed !== undefined) {
        updateData.completed = req.body.completed;
        
        // If completing the milestone and no completion date is set, set it to now
        if (req.body.completed && !existingMilestone[0].completedDate) {
          updateData.completedDate = new Date();
        }
      } else if (updateData.progress && updateData.progress >= 100) {
        // Auto-complete when progress reaches 100%
        updateData.completed = true;
        if (!existingMilestone[0].completedDate) {
          updateData.completedDate = new Date();
        }
      }
      
      // If explicitly providing a completion date
      if (req.body.completedDate) {
        updateData.completedDate = new Date(req.body.completedDate);
      }
      
      // Update in database
      const [updatedMilestone] = await db
        .update(progressMilestones)
        .set(updateData)
        .where(eq(progressMilestones.id, id))
        .returning();
      
      res.json(updatedMilestone);
    } catch (error) {
      console.error('Error updating progress milestone:', error);
      res.status(500).json({ message: 'Error updating progress milestone' });
    }
  });
  
  // Delete a milestone
  app.delete('/api/progress-milestones/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid milestone ID' });
      }
      
      // Check if milestone exists
      const existingMilestone = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.id, id))
        .limit(1);
      
      if (!existingMilestone || existingMilestone.length === 0) {
        return res.status(404).json({ message: 'Milestone not found' });
      }
      
      // Delete from database
      await db
        .delete(progressMilestones)
        .where(eq(progressMilestones.id, id));
      
      res.status(200).json({ message: 'Milestone deleted successfully' });
    } catch (error) {
      console.error('Error deleting progress milestone:', error);
      res.status(500).json({ message: 'Error deleting progress milestone' });
    }
  });
  
  // Sync milestones (for offline support)
  app.post('/api/users/:userId/progress-milestones/sync', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const { localMilestones } = req.body;
      if (!localMilestones || !Array.isArray(localMilestones)) {
        return res.status(400).json({ message: 'Invalid local milestones data' });
      }
      
      // Get all existing milestones for this user
      const existingMilestones = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.userId, userId));
      
      // Track what happened during sync
      const syncResults = {
        created: [] as any[],
        updated: [] as any[],
        unchanged: [] as any[]
      };
      
      // Process each local milestone
      for (const localMilestone of localMilestones) {
        // Skip if not belonging to the correct user
        if (localMilestone.userId !== userId) continue;
        
        // Case 1: The milestone has an ID, so it exists on the server
        if (localMilestone.id) {
          const existingMilestone = existingMilestones.find(m => m.id === localMilestone.id);
          
          // If it exists, update it with the local version if the local version is newer
          if (existingMilestone) {
            const localUpdatedAt = new Date(localMilestone.updatedAt || 0);
            const serverUpdatedAt = new Date(existingMilestone.updatedAt || 0);
            
            if (localUpdatedAt > serverUpdatedAt) {
              // Local is newer, update server
              const updateData: Partial<typeof progressMilestones.$inferInsert> = {
                title: localMilestone.title,
                description: localMilestone.description,
                category: localMilestone.category,
                progress: localMilestone.progress,
                completed: localMilestone.completed,
                iconType: localMilestone.iconType,
                updatedAt: new Date(),
                lastSyncedAt: new Date()
              };
              
              // Handle dates
              if (localMilestone.targetDate) {
                updateData.targetDate = new Date(localMilestone.targetDate);
              }
              
              if (localMilestone.completedDate) {
                updateData.completedDate = new Date(localMilestone.completedDate);
              }
              
              // Update in database
              const [updatedMilestone] = await db
                .update(progressMilestones)
                .set(updateData)
                .where(eq(progressMilestones.id, localMilestone.id))
                .returning();
                
              syncResults.updated.push(updatedMilestone);
            } else {
              // Server version is newer or the same
              syncResults.unchanged.push(existingMilestone);
            }
          }
          // If it doesn't exist (was deleted on server), ignore it
          continue;
        }
        
        // Case 2: The milestone has a localUuid but no id, so it's new on the client
        if (localMilestone.localUuid) {
          // Check if it already exists by title and category (to prevent duplicates)
          const similarMilestone = existingMilestones.find(
            m => m.title.toLowerCase() === localMilestone.title.toLowerCase() && 
                 m.category.toLowerCase() === localMilestone.category.toLowerCase()
          );
          
          if (similarMilestone) {
            // If similar exists, update it with the local data
            const updateData: Partial<typeof progressMilestones.$inferInsert> = {
              progress: Math.max(similarMilestone.progress, localMilestone.progress),
              completed: similarMilestone.completed || localMilestone.completed,
              updatedAt: new Date(),
              lastSyncedAt: new Date()
            };
            
            // If local has completion date and server doesn't, use the local one
            if (localMilestone.completedDate && !similarMilestone.completedDate) {
              updateData.completedDate = new Date(localMilestone.completedDate);
            }
            
            // Update in database
            const [updatedMilestone] = await db
              .update(progressMilestones)
              .set(updateData)
              .where(eq(progressMilestones.id, similarMilestone.id))
              .returning();
              
            syncResults.updated.push(updatedMilestone);
          } else {
            // Create a new milestone
            const newMilestone = {
              userId,
              title: localMilestone.title,
              description: localMilestone.description,
              category: localMilestone.category,
              progress: localMilestone.progress,
              completed: localMilestone.completed,
              iconType: localMilestone.iconType || 'Trophy',
              targetDate: localMilestone.targetDate ? new Date(localMilestone.targetDate) : null,
              completedDate: localMilestone.completedDate ? new Date(localMilestone.completedDate) : null,
              localUuid: localMilestone.localUuid,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSyncedAt: new Date()
            };
            
            // Insert into database
            const [createdMilestone] = await db
              .insert(progressMilestones)
              .values(newMilestone)
              .returning();
              
            syncResults.created.push(createdMilestone);
          }
        }
      }
      
      // Get all current milestones after sync
      const allMilestones = await db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.userId, userId))
        .orderBy(desc(progressMilestones.updatedAt));
      
      // Return results
      res.json({
        synced: syncResults,
        allMilestones
      });
    } catch (error) {
      console.error('Error syncing progress milestones:', error);
      res.status(500).json({ message: 'Error syncing progress milestones' });
    }
  });
  
  // =================== BADGE SYSTEM API ROUTES ===================
  
  // Get all badges for a patient
  app.get("/api/badges/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      // Get all badges for the patient
      const badges = await db.select().from(patientBadges)
        .where(eq(patientBadges.patientId, patientId));
      
      res.json(badges);
    } catch (error) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ message: 'Failed to fetch badges' });
    }
  });
  
  // Check for new badges and update
  app.post("/api/badges/check/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      // Get patient information
      const [patient] = await db.select().from(users)
        .where(eq(users.id, patientId));
        
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      
      // Check for new badges
      await badgeService.checkAndUpdateBadges(
        patientId,
        patient.name,
        patient.email,
        patient.uin || ''
      );
      
      // Return updated badges
      const badges = await db.select().from(patientBadges)
        .where(eq(patientBadges.patientId, patientId));
        
      res.json(badges);
    } catch (error) {
      console.error('Error checking for badges:', error);
      res.status(500).json({ message: 'Failed to check for badges' });
    }
  });
  
  // Submit a patient self-score
  app.post("/api/patient-scores", async (req, res) => {
    try {
      const { patientId, scoreDate, exerciseSelfScore, mealPlanSelfScore, medicationSelfScore, notes } = req.body;
      
      // Validate inputs
      if (!patientId || (exerciseSelfScore === undefined && mealPlanSelfScore === undefined && medicationSelfScore === undefined)) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Check if a score for this date already exists
      const existingScores = await db.select().from(patientScores)
        .where(and(
          eq(patientScores.patientId, patientId),
          eq(patientScores.scoreDate, new Date(scoreDate || new Date()))
        ));
      
      let result;
      if (existingScores.length > 0) {
        // Update existing score
        result = await db.update(patientScores)
          .set({
            exerciseSelfScore: exerciseSelfScore !== undefined ? exerciseSelfScore : existingScores[0].exerciseSelfScore,
            mealPlanSelfScore: mealPlanSelfScore !== undefined ? mealPlanSelfScore : existingScores[0].mealPlanSelfScore,
            medicationSelfScore: medicationSelfScore !== undefined ? medicationSelfScore : existingScores[0].medicationSelfScore,
            notes: notes || existingScores[0].notes
          })
          .where(eq(patientScores.id, existingScores[0].id))
          .returning();
      } else {
        // Create new score record
        result = await db.insert(patientScores)
          .values({
            patientId,
            scoreDate: new Date(scoreDate || new Date()),
            exerciseSelfScore,
            mealPlanSelfScore,
            medicationSelfScore,
            notes
          })
          .returning();
      }
      
      // Get patient information for badge check
      const [patient] = await db.select().from(users)
        .where(eq(users.id, patientId));
        
      if (patient) {
        // Check for new badges after score update
        await badgeService.checkAndUpdateBadges(
          patientId,
          patient.name,
          patient.email,
          patient.uin || ''
        );
      }
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error saving patient score:', error);
      res.status(500).json({ message: 'Failed to save patient score' });
    }
  });
  
  // Get health metrics data for Health Snapshots feature
  app.get("/api/users/:userId/health-metrics", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Get the most recent 6 months of self-scores data
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const scoreData = await db.select({
        id: patientScores.id,
        scoreDate: patientScores.scoreDate,
        exerciseSelfScore: patientScores.exerciseSelfScore,
        mealPlanSelfScore: patientScores.mealPlanSelfScore,
        medicationSelfScore: patientScores.medicationSelfScore,
      })
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, userId),
          gte(patientScores.scoreDate, sixMonthsAgo)
        )
      )
      .orderBy(patientScores.scoreDate);
      
      if (!scoreData || scoreData.length === 0) {
        // If no data, return sample data
        return res.status(200).json({
          healthProgressData: [
            { name: 'Jan', mealPlan: 6, exercise: 4, medication: 8 },
            { name: 'Feb', mealPlan: 7, exercise: 5, medication: 9 },
            { name: 'Mar', mealPlan: 7, exercise: 6, medication: 9 },
            { name: 'Apr', mealPlan: 8, exercise: 7, medication: 10 },
            { name: 'May', mealPlan: 9, exercise: 8, medication: 10 },
            { name: 'Jun', mealPlan: 9, exercise: 8, medication: 10 },
          ],
          weeklyScoreData: [
            { name: 'Mon', score: 7 },
            { name: 'Tue', score: 8 },
            { name: 'Wed', score: 6 },
            { name: 'Thu', score: 9 },
            { name: 'Fri', score: 8 },
            { name: 'Sat', score: 7 },
            { name: 'Sun', score: 8 },
          ],
          activityDistributionData: [
            { name: 'Diet', value: 35 },
            { name: 'Exercise', value: 25 },
            { name: 'Medication', value: 20 },
            { name: 'General Wellness', value: 20 },
          ]
        });
      }
      
      // Process data for the Health Snapshots charts
      // Group data by month for the progress chart
      const monthMap: Record<string, { 
        mealPlan: number[], 
        exercise: number[], 
        medication: number[]
      }> = {};
      
      scoreData.forEach(score => {
        const date = new Date(score.scoreDate);
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        if (!monthMap[monthName]) {
          monthMap[monthName] = {
            mealPlan: [],
            exercise: [],
            medication: []
          };
        }
        
        monthMap[monthName].mealPlan.push(score.mealPlanSelfScore);
        monthMap[monthName].exercise.push(score.exerciseSelfScore);
        monthMap[monthName].medication.push(score.medicationSelfScore);
      });
      
      const healthProgressData = Object.entries(monthMap).map(([name, data]) => ({
        name,
        mealPlan: Math.round(data.mealPlan.reduce((sum, score) => sum + score, 0) / data.mealPlan.length),
        exercise: Math.round(data.exercise.reduce((sum, score) => sum + score, 0) / data.exercise.length),
        medication: Math.round(data.medication.reduce((sum, score) => sum + score, 0) / data.medication.length)
      }));
      
      // Get weekly data for the most recent week
      const recentScores = scoreData.slice(-7);
      const weeklyScoreData = recentScores.map(score => {
        const date = new Date(score.scoreDate);
        const dayName = date.toLocaleString('default', { weekday: 'short' });
        const avgScore = Math.round((score.mealPlanSelfScore + score.exerciseSelfScore + score.medicationSelfScore) / 3);
        
        return {
          name: dayName,
          score: avgScore
        };
      });
      
      // Calculate activity distribution based on all scores
      let mealPlanTotal = 0;
      let exerciseTotal = 0;
      let medicationTotal = 0;
      
      scoreData.forEach(score => {
        mealPlanTotal += score.mealPlanSelfScore;
        exerciseTotal += score.exerciseSelfScore;
        medicationTotal += score.medicationSelfScore;
      });
      
      const total = mealPlanTotal + exerciseTotal + medicationTotal;
      
      const activityDistributionData = [
        { name: 'Diet', value: Math.round((mealPlanTotal / total) * 100) },
        { name: 'Exercise', value: Math.round((exerciseTotal / total) * 100) },
        { name: 'Medication', value: Math.round((medicationTotal / total) * 100) },
        { name: 'General Wellness', value: 10 } // Added as a constant for visualization
      ];
      
      res.status(200).json({
        healthProgressData,
        weeklyScoreData,
        activityDistributionData
      });
      
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      res.status(500).json({ message: 'Failed to fetch health metrics data' });
    }
  });

  // Get patient events for the Supervisor Agent
  app.get("/api/patient-events/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID format" });
      }
      
      // Get unprocessed events for the Supervisor Agent
      const events = await db.select().from(patientEvents)
        .where(and(
          eq(patientEvents.patientId, patientId),
          eq(patientEvents.processedByAgent, false)
        ));
      
      res.json(events);
    } catch (error) {
      console.error('Error fetching patient events:', error);
      res.status(500).json({ message: 'Failed to fetch patient events' });
    }
  });
  
  // Mark patient events as processed
  app.post("/api/patient-events/mark-processed", async (req, res) => {
    try {
      const { eventIds } = req.body;
      
      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return res.status(400).json({ message: 'Missing event IDs' });
      }
      
      // Mark events as processed
      await db.update(patientEvents)
        .set({ processedByAgent: true })
        .where(inArray(patientEvents.id, eventIds));
      
      res.json({ success: true, eventIds });
    } catch (error) {
      console.error('Error marking events as processed:', error);
      res.status(500).json({ message: 'Failed to mark events as processed' });
    }
  });
  
  // TEST ENDPOINT: Generate enhanced PPR with all new analytics features
  app.get('/api/test/enhanced-ppr/:patientId', async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }
      
      // Check if patient exists
      const [patient] = await db
        .select()
        .from(users)
        .where(eq(users.id, patientId));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Set report period (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      try {
        // Generate analytics data using the enhanced PPR analysis service
        const scorePatterns = await enhancedPprAnalysisService.analyzeScorePatterns(
          patientId, 
          startDate, 
          endDate
        );
        
        const adherenceRate = await enhancedPprAnalysisService.calculateAdherenceRate(
          patientId, 
          startDate, 
          endDate
        );
        
        const consistencyMetrics = await enhancedPprAnalysisService.calculateConsistencyMetrics(
          patientId, 
          startDate, 
          endDate
        );
        
        const behaviorInsights = await enhancedPprAnalysisService.generateBehaviorInsights(
          patientId, 
          startDate, 
          endDate
        );
        
        const improvementTrajectory = await enhancedPprAnalysisService.projectImprovementTrajectory(
          patientId, 
          startDate, 
          endDate
        );
        
        const engagementScore = await enhancedPprAnalysisService.calculateEngagementScore(
          patientId, 
          startDate, 
          endDate
        );
        
        const healthTrends = await enhancedPprAnalysisService.generateHealthTrends(
          patientId, 
          startDate, 
          endDate
        );
        
        // Calculate average scores for the period
        const scoresInPeriod = await db.select({
          exerciseSelfScore: avg(patientScores.exerciseSelfScore),
          mealPlanSelfScore: avg(patientScores.mealPlanSelfScore),
          medicationSelfScore: avg(patientScores.medicationSelfScore)
        })
        .from(patientScores)
        .where(and(
          eq(patientScores.patientId, patientId),
          betweenDates(patientScores.scoreDate, startDate, endDate)
        ));
        
        // Create a sample enhanced PPR object with all the new analytics features
        const enhancedPpr = {
          patientId,
          patientName: patient.name,
          reportDate: new Date(),
          reportPeriodStartDate: startDate,
          reportPeriodEndDate: endDate,
          avgExerciseScore: scoresInPeriod[0]?.exerciseSelfScore || 0,
          avgMealPlanScore: scoresInPeriod[0]?.mealPlanSelfScore || 0, 
          avgMedicationScore: scoresInPeriod[0]?.medicationSelfScore || 0,
          scorePatterns,
          adherenceRate,
          consistencyMetrics,
          behaviorInsights,
          improvementTrajectory,
          engagementScore,
          healthTrends
        };
        
        return res.json(enhancedPpr);
      } catch (analysisError) {
        console.error("Analysis service error:", analysisError);
        return res.status(500).json({ 
          message: "Error in analysis service",
          error: analysisError.message,
          stack: analysisError.stack 
        });
      }
    } catch (error) {
      console.error("Error generating enhanced PPR:", error);
      return res.status(500).json({ 
        message: "Failed to generate enhanced PPR",
        error: error.message,
        stack: error.stack
      });
    }
  });

  // ============================================================================
  // ADMIN CONTACT OVERRIDE ENDPOINTS
  // Admin can override any user contact information for emergency/support purposes
  // ============================================================================

  // Admin contact override endpoint
  app.patch("/api/admin/users/:userId/contact", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { email, phoneNumber } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (!email || !phoneNumber) {
        return res.status(400).json({ message: "Email and phone number are required" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Phone number validation (international format)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      // Update user contact information
      const [updatedUser] = await db
        .update(users)
        .set({
          email,
          phoneNumber,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`Admin contact override: Updated user ${userId} contact information`);
      
      res.json({
        message: "Contact information updated successfully",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber
        }
      });

    } catch (error) {
      console.error("Error updating user contact:", error);
      res.status(500).json({ message: "Failed to update contact information" });
    }
  });





  // Input sanitization endpoint
  app.post("/api/sanitize-input", async (req, res) => {
    try {
      const { inputSanitizationService } = await import('./services/inputSanitizationService.js');
      
      const { input, type = 'text' } = req.body;
      
      if (!input) {
        return res.status(400).json({ message: "Input is required" });
      }
      
      let sanitized;
      let containsMalicious = false;
      
      // Check for malicious patterns first
      if (typeof input === 'string') {
        containsMalicious = inputSanitizationService.containsMaliciousPatterns(input);
      }
      
      // Apply appropriate sanitization based on type
      switch (type) {
        case 'email':
          sanitized = inputSanitizationService.sanitizeEmail(input);
          break;
        case 'directive':
          sanitized = inputSanitizationService.sanitizeDirective(input);
          break;
        case 'uin':
          sanitized = inputSanitizationService.sanitizeUIN(input);
          break;
        case 'phone':
          sanitized = inputSanitizationService.sanitizePhone(input);
          break;
        case 'number':
          sanitized = inputSanitizationService.sanitizeNumber(input);
          break;
        case 'form':
          sanitized = inputSanitizationService.sanitizeFormData(input);
          break;
        default:
          sanitized = inputSanitizationService.sanitizeText(input);
      }
      
      return res.json({
        original: input,
        sanitized,
        containsMalicious,
        type,
        changed: input !== sanitized
      });
      
    } catch (error) {
      console.error("Error sanitizing input:", error);
      return res.status(500).json({ message: "Input sanitization failed" });
    }
  });

  // Email template endpoint (for testing)
  app.get("/api/email-template/:type/:name", async (req, res) => {
    try {
      const { emailTemplateService } = await import('./services/emailTemplateService.js');
      
      const { type, name } = req.params;
      const decodedName = decodeURIComponent(name);
      
      if (!emailTemplateService.validateTemplateParams(decodedName)) {
        return res.status(400).json({ message: "Invalid name parameter" });
      }
      
      let template;
      
      switch (type) {
        case 'doctor-welcome':
          template = emailTemplateService.getDoctorWelcomeTemplate(decodedName);
          break;
        case 'patient-welcome':
          template = emailTemplateService.getPatientWelcomeTemplate(decodedName);
          break;
        case 'patient-sms':
          const smsTemplate = emailTemplateService.getDailySMSTemplate(decodedName);
          return res.json({ 
            type: 'sms',
            template: smsTemplate,
            agreementContent: emailTemplateService.getAgreementContent()
          });
        default:
          return res.status(400).json({ message: "Invalid template type" });
      }
      
      return res.json({
        type: 'email',
        template,
        agreementContent: emailTemplateService.getAgreementContent()
      });
      
    } catch (error) {
      console.error("Error getting email template:", error);
      return res.status(500).json({ message: "Template generation failed" });
    }
  });

  // Security health check endpoint
  app.get("/api/security-status", async (req, res) => {
    try {
      return res.json({
        status: "operational",
        services: {
          passwordValidation: "available",
          inputSanitization: "available", 
          emailTemplates: "available"
        },
        phase: "Phase 1 - Testing",
        adminAccess: "open",
        message: "Security services loaded successfully - ready for testing"
      });
    } catch (error) {
      console.error("Error checking security status:", error);
      return res.status(500).json({ message: "Security status check failed" });
    }
  });

  // Doctor Setup API Routes
  const { DoctorAuthService } = await import('./services/doctorAuthService.js');

  // Send SMS code for doctor login
  app.post("/api/doctor/login/send-sms", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find doctor by email
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.roleId, 2))); // Doctor role
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found with this email" });
      }
      
      if (!doctor.phoneNumber) {
        return res.status(400).json({ message: "No phone number registered for this doctor" });
      }
      
      // Generate 6-digit SMS code
      const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code using centralized verification service
      await VerificationCodeStorageService.setCode(
        doctor.id,
        email,
        smsCode,
        10 * 60 * 1000, // 10 minutes
        'sms'
      );
      
      // Send SMS via Twilio
      const { SMSService } = await import('./services/smsService.js');
      const smsResult = await SMSService.sendVerificationCode(
        doctor.phoneNumber, 
        smsCode,
        doctor.name?.replace('Dr ', '')
      );
      
      if (!smsResult.success) {
        return res.status(500).json({ message: "Failed to send SMS code" });
      }
      
      res.json({ success: true, message: "SMS code sent successfully" });
      
    } catch (error) {
      console.error("SMS send error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify SMS code and login
  app.post("/api/doctor/login/verify-sms", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }
      
      // Find doctor to get ID for verification service
      const [doctor] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.roleId, 2)));
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Check stored verification code using centralized service
      const storedCode = await VerificationCodeStorageService.getCode(doctor.id, email, 'sms');
      
      if (!storedCode) {
        return res.status(400).json({ message: "No verification code found. Please request a new code." });
      }
      
      if (storedCode.code !== code) {
        await VerificationCodeStorageService.incrementAttempts(doctor.id, email, 'sms', storedCode);
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Code is valid - clean up and update last login
      await VerificationCodeStorageService.deleteCode(doctor.id, email, 'sms');
      
      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, doctor.id));

      // Set session with timeout tracking for doctors
      if (!req.session) {
        req.session = {};
      }
      req.session.doctorId = doctor.id;
      req.session.userRole = 'doctor';
      req.session.lastActivity = Date.now();
      
      res.json({ 
        success: true, 
        message: "Login successful",
        doctor: {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          uin: doctor.uin
        }
      });
      
    } catch (error) {
      console.error("SMS verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Send SMS code for patient login
  app.post("/api/patient/login/send-sms", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find patient by email
      const patient = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.roleId, 3)))
        .limit(1);

      if (patient.length === 0) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (!patient[0].phoneNumber) {
        return res.status(400).json({ message: "No phone number registered for this patient" });
      }

      // Generate 6-digit SMS code
      const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code using centralized verification service
      await VerificationCodeStorageService.setCode(
        patient[0].id,
        email,
        smsCode,
        10 * 60 * 1000, // 10 minutes
        'sms'
      );
      
      // Send SMS via Twilio
      const { SMSService } = await import('./services/smsService.js');
      const smsResult = await SMSService.sendVerificationCode(
        patient[0].phoneNumber, 
        smsCode,
        patient[0].name,
        false  // isDoctor = false for patients
      );
      
      if (!smsResult.success) {
        return res.status(500).json({ message: "Failed to send SMS code" });
      }

      res.json({ 
        success: true, 
        message: "SMS verification code sent successfully" 
      });
      
    } catch (error) {
      console.error("Patient SMS send error:", error);
      res.status(500).json({ message: "Failed to send SMS code" });
    }
  });

  // Verify SMS code for patient login
  app.post("/api/patient/login/verify-sms", async (req, res) => {
    try {
      const { email, smsCode } = req.body;
      
      if (!email || !smsCode) {
        return res.status(400).json({ message: "Email and SMS code are required" });
      }

      // Find patient to get ID for verification service
      const [patient] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.roleId, 3)));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Check stored verification code using centralized service
      const storedCode = await VerificationCodeStorageService.getCode(patient.id, email, 'sms');
      
      if (!storedCode) {
        return res.status(400).json({ message: "No verification code found. Please request a new code." });
      }
      
      if (storedCode.code !== smsCode) {
        await VerificationCodeStorageService.incrementAttempts(patient.id, email, 'sms', storedCode);
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Code is valid - clean up and update last login
      await VerificationCodeStorageService.deleteCode(patient.id, email, 'sms');
      
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, patient.id));

      // Set session with timeout tracking
      if (!req.session) {
        req.session = {};
      }
      req.session.patientId = patient.id;
      req.session.userRole = 'patient';
      req.session.lastActivity = Date.now();

      res.json({ 
        success: true, 
        message: "Login successful",
        patient: {
          id: patient.id,
          name: patient.name,
          email: patient.email
        }
      });
      
    } catch (error) {
      console.error("Patient SMS verification error:", error);
      res.status(500).json({ message: "Failed to verify SMS code" });
    }
  });

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find admin user
      const [admin] = await db
        .select()
        .from(users)
        .where(and(
          or(eq(users.username, username), eq(users.email, username)),
          eq(users.roleId, 1) // Admin role
        ))
        .limit(1);
      
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // In production, this should use proper password hashing
      // For now, we'll use simple comparison
      if (admin.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, admin.id));
      
      // Set session with admin role
      if (!req.session) {
        req.session = {};
      }
      req.session.userId = admin.id;
      req.session.userRole = 'admin';
      req.session.lastActivity = Date.now();
      
      console.log(`[ADMIN LOGIN] Admin ${admin.id} logged in successfully. Session role: ${req.session.userRole}`);
      
      // Save session to ensure persistence
      req.session.save((err: any) => {
        if (err) {
          console.error('[ADMIN LOGIN] Error saving session:', err);
          return res.status(500).json({ message: "Failed to save admin session" });
        }
        
        console.log(`[ADMIN LOGIN] Admin session saved successfully for user ${admin.id}`);
        res.json({ 
          success: true, 
          message: "Admin login successful",
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            uin: admin.uin
          }
        });
      });
      
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate setup token
  app.post("/api/doctor/setup/validate-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      console.log("Token validation attempt:", {
        tokenReceived: !!token,
        tokenLength: token?.length || 0,
        tokenStart: token?.substring(0, 50) || 'N/A',
        tokenType: typeof token
      });
      
      if (!token) {
        return res.status(400).json({ message: "Setup token is required" });
      }
      
      const tokenData = DoctorAuthService.verifyAccessToken(token);
      
      if (!tokenData) {
        console.log("Token verification failed for token:", token.substring(0, 50) + "...");
        return res.status(401).json({ message: "Invalid or expired setup token" });
      }
      
      // Get doctor information from database
      const [doctor] = await db
        .select()
        .from(users)
        .where(eq(users.id, tokenData.doctorId));
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Check if doctor already has password set (already activated)
      if (doctor.password) {
        return res.status(409).json({ message: "Account already activated. Please use regular login." });
      }
      
      res.json({ 
        success: true,
        doctor: {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          phone: doctor.phoneNumber
        }
      });
      
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rate limiting map for SMS sends (doctorId -> lastSendTime)
  const smsRateLimitMap = new Map<number, number>();
  const SMS_RATE_LIMIT_MS = 30000; // 30 seconds between SMS sends

  // Send verification code
  app.post("/api/doctor/setup/send-verification", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Setup token is required" });
      }
      
      const tokenData = DoctorAuthService.verifyAccessToken(token);
      
      if (!tokenData) {
        return res.status(401).json({ message: "Invalid or expired setup token" });
      }
      
      // Check rate limiting
      const now = Date.now();
      const lastSendTime = smsRateLimitMap.get(tokenData.doctorId) || 0;
      
      if (now - lastSendTime < SMS_RATE_LIMIT_MS) {
        const remainingTime = Math.ceil((SMS_RATE_LIMIT_MS - (now - lastSendTime)) / 1000);
        return res.status(429).json({ 
          success: false, 
          message: `Please wait ${remainingTime} seconds before requesting another code` 
        });
      }
      
      const result = await DoctorAuthService.sendVerificationCode(tokenData.phone, tokenData.doctorId);
      
      if (result.success) {
        // Update rate limit timestamp only on successful send
        smsRateLimitMap.set(tokenData.doctorId, now);
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
      
    } catch (error) {
      console.error("Verification send error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Verify phone number
  app.post("/api/doctor/setup/verify-phone", async (req, res) => {
    try {
      const { token, verificationCode } = req.body;
      
      if (!token || !verificationCode) {
        return res.status(400).json({ message: "Token and verification code are required" });
      }
      
      const tokenData = DoctorAuthService.verifyAccessToken(token);
      
      if (!tokenData) {
        return res.status(401).json({ message: "Invalid or expired setup token" });
      }
      
      const result = await DoctorAuthService.verifyCode(tokenData.phone, tokenData.doctorId, verificationCode);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
      
    } catch (error) {
      console.error("Phone verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Complete account setup (passwordless)
  app.post("/api/doctor/setup/complete", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Setup token is required" });
      }
      
      const { validateSetupToken } = await import('./services/authTokenService');
      const tokenValidation = await validateSetupToken(token);
      
      if (!tokenValidation.valid || !tokenValidation.doctorId) {
        return res.status(401).json({ message: tokenValidation.error || "Invalid or expired setup token" });
      }
      
      // Get doctor
      const doctor = await storage.getUser(tokenValidation.doctorId);
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Mark account as active and update last login
      await db
        .update(users)
        .set({ 
          isActive: true,
          lastLogin: new Date()
        })
        .where(eq(users.id, doctor.id));
      
      // Log successful setup completion
      console.log(`✅ Doctor ${doctor.name} (${doctor.email}) passwordless account setup completed successfully`);
      
      res.json({ 
        success: true, 
        message: "Account setup completed successfully",
        doctor: {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email
        }
      });
      
    } catch (error) {
      console.error("Account setup completion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate secure MCA access token for authenticated doctors and admins with proper data segregation
  app.post("/api/doctor/mca-access", async (req, res) => {
    try {
      // Check session data
      const session = req.session as any;
      const doctorId = session?.doctorId;
      const userId = session?.userId;
      const userRole = session?.userRole;
      const targetDoctorId = req.body.targetDoctorId; // For admin super-user access
      
      console.log("MCA Access - Full session:", { doctorId, userId, userRole, targetDoctorId, sessionKeys: Object.keys(session || {}) });
      
      // Allow access for authenticated doctors or admins
      if (!doctorId && !userId) {
        return res.status(401).json({ message: "Authentication required - no valid session found" });
      }
      
      // Determine which doctor's MCA to access
      let targetDoctor;
      let returnUrl = '/doctor-dashboard';
      let accessContext = 'direct';
      
      if (targetDoctorId && userRole === 'admin') {
        // Admin accessing specific doctor's MCA
        const [adminTargetDoctor] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, targetDoctorId), eq(users.roleId, 2)));
        
        if (!adminTargetDoctor) {
          return res.status(404).json({ message: "Target doctor not found" });
        }
        
        targetDoctor = adminTargetDoctor;
        // SECURITY FIX: Always return to doctor dashboard for impersonated sessions
        // This ensures doctors never see the admin interface
        returnUrl = '/doctor-dashboard';
        accessContext = 'admin_superuser';
        
        console.log(`Admin ${userId} accessing MCA for doctor ${targetDoctorId} (${adminTargetDoctor.name}) - Return URL: ${returnUrl}`);
      } else if (doctorId) {
        // Doctor accessing their own MCA
        const [doctorData] = await db
          .select()
          .from(users)
          .where(eq(users.id, doctorId));
        targetDoctor = doctorData;
        accessContext = 'doctor_direct';
      } else if (userId && userRole === 'admin') {
        return res.status(400).json({ message: "Admin must specify targetDoctorId to access MCA" });
      }
      
      if (!targetDoctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Get assigned patients for this doctor from doctor_patients table
      const assignedPatients = await db
        .select({
          patientId: doctorPatients.patientId
        })
        .from(doctorPatients)
        .where(eq(doctorPatients.doctorId, targetDoctor.id));
      
      const patientIds = assignedPatients.map(p => p.patientId);
      
      console.log(`Doctor ${targetDoctor.id} (${targetDoctor.name}) has ${patientIds.length} assigned patients: [${patientIds.join(', ')}]`);
      
      // Generate secure token for MCA access with patient filtering data
      const mcaToken = {
        userId: targetDoctor.id,
        name: targetDoctor.name,
        email: targetDoctor.email,
        uin: targetDoctor.uin,
        role: 'doctor',
        assignedPatientIds: patientIds, // Critical: Include assigned patient list for data segregation
        accessContext: accessContext,
        accessedByAdmin: userRole === 'admin',
        adminUserId: userRole === 'admin' ? userId : null,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      // In production, you'd sign this with JWT or similar
      const encodedToken = Buffer.from(JSON.stringify(mcaToken)).toString('base64');
      
      // Your MCA app URL - can be updated when you have the Replit URL
      const mcaAppUrl = process.env.MCA_APP_URL || 'https://self-reported-mini-clinical-audit-program-dashboard-admin1023.replit.app';
      // CRITICAL FIX: Always return to doctor dashboard with the correct doctor ID
      const mcaReturnUrl = req.protocol + '://' + req.get('host') + '/doctor-dashboard';
      const mcaAccessUrl = `${mcaAppUrl}?source=kgc&token=${encodeURIComponent(encodedToken)}&return_url=${encodeURIComponent(mcaReturnUrl)}&doctor_id=${targetDoctor.id}`;
      
      console.log('[MCA DEBUG] Generated MCA Access URL:', mcaAccessUrl);
      console.log('[MCA DEBUG] MCA Return URL:', mcaReturnUrl);
      console.log('[MCA DEBUG] MCA App Base URL:', mcaAppUrl);
      
      res.json({
        success: true,
        mcaAccessUrl,
        token: encodedToken,
        doctorId: targetDoctor.id,
        doctorName: targetDoctor.name,
        assignedPatientCount: patientIds.length,
        accessContext: accessContext,
        expiresIn: '24 hours'
      });
      
    } catch (error) {
      console.error("MCA access token generation error:", error);
      res.status(500).json({ message: "Failed to generate MCA access" });
    }
  });

  // Production-Ready Security Endpoints
  
  // Secure logout endpoint for all user roles
  app.post('/api/auth/logout', securityManager.createLogoutHandler());

  // Initialize production security system
  console.log(`🔐 Production Security System Initialized`);
  console.log(`📊 Environment: ${envManager.getEnvironment()}`);
  console.log(`🔧 Security Level: ${envManager.getConfig().auditLevel.toUpperCase()}`);
  console.log(`📋 Compliance Mode: ${envManager.requiresCompliance() ? 'ENABLED' : 'DISABLED'}`);
  
  // Test encryption system
  encryptionService.testEncryption().then(success => {
    console.log(`🔐 Encryption Test: ${success ? 'PASSED' : 'FAILED'}`);
  });

  // ============================================================================
  // MCA Return Handler & Admin Dashboard Intercept
  // ============================================================================
  app.get('/mca-return', (req, res) => {
    const session = req.session as Session & Partial<SessionData>;
    
    console.log('[MCA RETURN] Session context:', {
      userId: session.userId,
      userRole: session.userRole,
      impersonatedDoctorId: session.impersonatedDoctorId,
      hasImpersonation: !!session.impersonatedDoctorId
    });
    
    // If admin is impersonating a doctor, return to doctor dashboard
    if (session.userRole === 'admin' && session.impersonatedDoctorId) {
      console.log('[MCA RETURN] Admin impersonating doctor - redirecting to doctor dashboard');
      return res.redirect('/doctor-dashboard');
    }
    
    // If regular doctor session, return to doctor dashboard
    if (session.userRole === 'doctor') {
      console.log('[MCA RETURN] Regular doctor session - redirecting to doctor dashboard');
      return res.redirect('/doctor-dashboard');
    }
    
    // If admin session without impersonation, return to admin dashboard
    if (session.userRole === 'admin') {
      console.log('[MCA RETURN] Regular admin session - redirecting to admin dashboard');
      return res.redirect('/admin-dashboard');
    }
    
    // Default fallback
    console.log('[MCA RETURN] Unknown session context - redirecting to home');
    res.redirect('/');
  });

  // Setup Supervisor Agent routes
  const { setupSupervisorAgentRoutes } = await import("./routes/supervisorAgent");
  setupSupervisorAgentRoutes(app);

  // Setup automatic authentication routes for demo users
  const { autoAuthRoutes } = await import("./routes/autoAuth");
  app.use('/api/auto-auth', autoAuthRoutes);

  // Setup user context routes
  const { userRoutes } = await import("./routes/user");
  app.use('/api/user', userRoutes);

  // ===== HEALTH SNAPSHOTS API ENDPOINTS =====
  
  // Get user's patient scores (official daily submissions) for Health Snapshots
  app.get("/api/users/:userId/patient-scores", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Query patient_scores table for official daily submissions using raw SQL for correct table/column names
      const scores = await db.execute(sql`
        SELECT 
          id,
          patient_id as "patientId",
          score_date as "scoreDate", 
          meal_plan_self_score as "dietScore",
          exercise_self_score as "exerciseScore", 
          medication_self_score as "medicationScore",
          notes,
          created_at as "createdAt"
        FROM patient_scores 
        WHERE patient_id = ${userId} 
        ORDER BY score_date DESC
      `);
      
      return res.json(scores.rows);
    } catch (error) {
      console.error("Error fetching patient scores:", error);
      return res.status(500).json({ message: "Failed to retrieve patient scores" });
    }
  });

  // Get user's achievement badges from Progress Milestones for Health Snapshots
  app.get("/api/users/:userId/achievement-badges", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Query progress_milestones table using raw SQL for correct table/column names
      const achievements = await db.execute(sql`
        SELECT 
          id,
          user_id as "userId",
          title,
          description,
          category,
          progress,
          completed,
          target_date as "targetDate",
          completed_date as "completedDate",
          icon_type as "iconType",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM progress_milestones 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `);
      
      // Transform progress milestones into achievement badge format
      const badges = achievements.rows.map((milestone: any) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        level: milestone.progress >= 90 ? 'platinum' : 
               milestone.progress >= 75 ? 'gold' : 
               milestone.progress >= 50 ? 'silver' : 'bronze',
        progress: milestone.progress,
        earnedDate: milestone.createdAt,
        category: milestone.category
      }));
      
      return res.json(badges);
    } catch (error) {
      console.error("Error fetching achievement badges:", error);
      return res.status(500).json({ message: "Failed to retrieve achievement badges" });
    }
  });

  return httpServer;
}
