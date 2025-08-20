import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';
import { securityConfig } from "./config/security";
import { securityHeaders, secureErrorHandler, checkEnvironmentSecurity, apiRateLimit } from "./middleware/security";

// Load environment variables
import { config } from 'dotenv';
config();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in development to maintain stability
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

// Validate environment configuration
const envValidation = securityConfig.validateEnvironment();
if (!envValidation.valid) {
  console.error('❌ Environment validation failed:');
  envValidation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✅ Environment validation passed');

const app = express();

// Configure trust proxy safely for Replit environment
// Only trust proxies from Replit infrastructure
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Security middleware - apply first
app.use(securityHeaders);
app.use(checkEnvironmentSecurity);

// CORS configuration
app.use(cors(securityConfig.getCORSConfig()));

// Rate limiting
app.use('/api', apiRateLimit);

// Import helmet middleware
import { helmetMiddleware } from './middleware/helmet';
app.use(helmetMiddleware);

// Simple but robust security middleware
import { phiAuditLogger, healthcareSessionTimeout } from './middleware/hipaaCompliance';

// Apply essential healthcare security (only what's needed)
app.use(healthcareSessionTimeout);
app.use('/api/patients', phiAuditLogger);
app.use('/api/health-metrics', phiAuditLogger);
app.use('/api/care-plan-directives', phiAuditLogger);

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
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

// Health check endpoint for AWS load balancer
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

(async () => {
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable for AWS, fallback to 5000 for development
  const port = process.env.PORT || 5000;
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
})();
