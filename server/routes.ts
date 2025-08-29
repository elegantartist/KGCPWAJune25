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

  // Apply enhanced security middleware to all API routes
  const { securityMiddleware } = await import('./middleware/securityEnhancement');
  app.use("/api", securityMiddleware.setHeaders);
  app.use("/api", securityMiddleware.validateSession);
  app.use("/api", securityMiddleware.sanitizeInput);
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
      
      // Update milestone - properly handle date fields
      const updateData = { ...req.body };
      
      // Convert date strings to Date objects if they exist
      if (updateData.targetDate && typeof updateData.targetDate === 'string') {
        updateData.targetDate = new Date(updateData.targetDate);
      }
      if (updateData.completedDate && typeof updateData.completedDate === 'string') {
        updateData.completedDate = new Date(updateData.completedDate);
      }
      if (updateData.createdAt && typeof updateData.createdAt === 'string') {
        updateData.createdAt = new Date(updateData.createdAt);
      }
      
      const [updatedMilestone] = await db
        .update(progressMilestones)
        .set({
          ...updateData,
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
            // Update the server version - properly handle date fields
            const [updatedMilestone] = await db
              .update(progressMilestones)
              .set({
                title: localMilestone.title,
                description: localMilestone.description,
                category: localMilestone.category,
                progress: localMilestone.progress,
                completed: localMilestone.completed,
                targetDate: localMilestone.targetDate ? new Date(localMilestone.targetDate) : null,
                completedDate: localMilestone.completedDate ? new Date(localMilestone.completedDate) : null,
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
          // Create a new milestone on the server - properly handle date fields
          const [newMilestone] = await db
            .insert(progressMilestones)
            .values({
              userId,
              title: localMilestone.title,
              description: localMilestone.description,
              category: localMilestone.category,
              progress: localMilestone.progress || 0,
              completed: localMilestone.completed || false,
              targetDate: localMilestone.targetDate ? new Date(localMilestone.targetDate) : null,
              completedDate: localMilestone.completedDate ? new Date(localMilestone.completedDate) : null,
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

  // Submit a patient self-score (CRITICAL ENDPOINT)
  app.post("/api/patient-scores", async (req, res) => {
    try {
      const { patientId, scoreDate, exerciseSelfScore, mealPlanSelfScore, medicationSelfScore, notes } = req.body;
      
      // Enhanced input validation and sanitization
      if (!patientId || (exerciseSelfScore === undefined && mealPlanSelfScore === undefined && medicationSelfScore === undefined)) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Validate score ranges (1-10) to prevent data corruption
      const validateScore = (score: any, name: string) => {
        if (score !== undefined && (typeof score !== 'number' || score < 1 || score > 10)) {
          throw new Error(`${name} must be a number between 1 and 10`);
        }
      };

      validateScore(exerciseSelfScore, 'Exercise score');
      validateScore(mealPlanSelfScore, 'Meal plan score');
      validateScore(medicationSelfScore, 'Medication score');

      // Validate patientId is a positive integer
      const parsedPatientId = parseInt(patientId);
      if (isNaN(parsedPatientId) || parsedPatientId <= 0) {
        return res.status(400).json({ message: 'Invalid patient ID' });
      }

      // Session-based authorization check
      const session = req.session as any;
      if (session?.userRole === 'patient' && session?.userId !== parsedPatientId) {
        return res.status(403).json({ message: 'Access denied: Cannot submit scores for other patients' });
      }

      // Sanitize notes to prevent XSS
      const sanitizedNotes = notes ? notes.toString().slice(0, 500) : null;
      
      // Check if a score for this date already exists
      const existingScores = await db.select().from(patientScores)
        .where(and(
          eq(patientScores.patientId, parsedPatientId),
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
            notes: sanitizedNotes || existingScores[0].notes
          })
          .where(eq(patientScores.id, existingScores[0].id))
          .returning();
      } else {
        // Create new score record
        result = await db.insert(patientScores)
          .values({
            patientId: parsedPatientId,
            scoreDate: new Date(scoreDate || new Date()),
            exerciseSelfScore,
            mealPlanSelfScore,
            medicationSelfScore,
            notes: sanitizedNotes
          })
          .returning();
      }
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error saving patient score:', error);
      res.status(500).json({ message: 'Failed to save patient score' });
    }
  });

  // Register Supervisor Agent routes
  const { setupSupervisorAgentRoutes } = await import('./routes/supervisorAgent');
  setupSupervisorAgentRoutes(app);

  console.log('🔧 All routes have been registered successfully');

  return app;
}
