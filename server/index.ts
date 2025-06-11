import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite";
import { sessionTimeoutMiddleware } from "./sessionTimeout";

// Load environment variables
import { config } from 'dotenv';
config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Apply session timeout middleware globally
app.use(sessionTimeoutMiddleware);

// Critical fix: Add API route bypass middleware BEFORE any other middleware
app.use((req, res, next) => {
  // Mark API requests for bypass
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || 
      req.path.startsWith('/admin/') || req.path.startsWith('/doctors/') || 
      req.path.startsWith('/patients/') || req.path.startsWith('/users/') ||
      req.path.startsWith('/v2/') || req.path.startsWith('/v4/') || 
      req.path.startsWith('/privacy/')) {
    req.isApiRoute = true;
  }
  next();
});

(async () => {
  // Register API routes first to prevent Vite interference
  await registerRoutes(app);

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const server = app.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });
})();
