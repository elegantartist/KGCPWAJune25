// Load environment variables FIRST - before any other imports
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';
import { securityConfig } from "./config/security";
import { securityHeaders, secureErrorHandler, checkEnvironmentSecurity, apiRateLimit } from "./middleware/security";

// AWS Secrets Manager integration
import { initializeSecrets } from "./config/awsSecrets";

// Initialize AWS secrets at startup
const initializeApp = async () => {
  try {
    console.log('🔐 Initializing KGC secrets from AWS Secrets Manager...');
    const secrets = await initializeSecrets();
    
    // Set environment variables for backward compatibility
    Object.entries(secrets).forEach(([key, value]) => {
      if (value) {
        process.env[key] = value;
      }
    });
    
    console.log('✅ KGC secrets loaded successfully');
  } catch (error) {
    console.error('DETAILED SECRETS_MANAGER_ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.log('ℹ️  Using environment variables as fallback');
  }

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Graceful shutdown handlers for AWS
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
  });

  // Validate environment configuration (non-fatal for cloud deployments)
  const envValidation = securityConfig.validateEnvironment();
  if (!envValidation.valid) {
    console.warn('⚠️ Environment validation warnings:');
    envValidation.errors.forEach(error => console.warn(`  - ${error}`));
    console.log('ℹ️ Continuing with available environment variables...');
  } else {
    console.log('✅ Environment validation passed');
  }

  const app = express();

  // Configure trust proxy safely for production environment
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

  // Security middleware - apply first
  app.use(securityHeaders);
  app.use(checkEnvironmentSecurity);

  // CORS configuration
  app.use(cors(securityConfig.getCORSConfig()));

  // Rate limiting
  app.use('/api', apiRateLimit);

  // Static file serving for videos (before Vite middleware) 
  app.use('/videos', express.static('public/videos', {
    setHeaders: (res, path, stat) => {
      if (path.endsWith('.mp4')) {
        res.set('Content-Type', 'video/mp4');
      } else if (path.endsWith('.mp3')) {
        res.set('Content-Type', 'audio/mpeg');
      }
    }
  }));

  // Body parsing with limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  // Register API routes and start server
  const server = await registerRoutes(app);

  // Setup Vite in development, serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable for cloud deployments (Google Cloud Run uses 8080)
  const port = process.env.PORT || (process.env.NODE_ENV === 'production' ? 8080 : 5000);
  console.log(`🌐 Starting server on port ${port} (NODE_ENV: ${process.env.NODE_ENV})`);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Start patient engagement monitoring service
    try {
      const { alertMonitorService } = await import("./services/alertMonitorService");
      alertMonitorService.startMonitoring();
      console.log('🔔 Patient Alert Monitor started: tracking daily submissions and 7PM reminders');
    } catch (error) {
      console.error('Failed to start alert monitoring service:', error);
    }
  });
};

// Initialize and start the application
initializeApp().catch(error => {
  console.error('Failed to initialize application:', error);
  process.exit(1);
});