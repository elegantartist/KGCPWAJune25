import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite";
import { sessionTimeoutMiddleware } from "./sessionTimeout.js";
import adminRoutes from './api/adminRoutes'; // Import the new admin routes
import patientRouter from './api/patient'; // Import the new patient routes
import authRoutes from './api/authRoutes'; // Import the new auth routes
// Load environment variables at the very top
import { config } from 'dotenv';
config();

const app = express();

// --- GLOBAL REQUEST LOGGER AT THE VERY TOP ---
app.use((req, res, next) => {
  console.log(`[GLOBAL_REQUEST_LOGGER] Received Request - Method: ${req.method}, URL: ${req.originalUrl}`);
  next();
});
// ---------------------------------------------

// In development, the Vite server runs on a different port, so we need to
// enable CORS to allow the client to reach the API.
if (app.get("env") === "development") {
  app.use(cors({
    origin: "http://localhost:5173", // Default Vite port
    credentials: true, // Recommended for apps that use sessions/cookies
  }));
}

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

// Apply session timeout middleware globally (assuming it's defined elsewhere)
app.use(sessionTimeoutMiddleware);

(async () => {
  // Register the new, centralized API routes under the /api prefix
  app.use('/api', apiRoutes);
  app.use('/api/admin', adminRoutes); // Register the admin routes
  app.use('/api/patient', patientRouter); // Register the patient routes
  app.use('/api/auth', authRoutes); // Register the auth routes

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

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
})();
