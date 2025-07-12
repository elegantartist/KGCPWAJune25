import express, { type Request, Response, NextFunction, Express as ExpressAppType } from "express";
import http from 'http';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite"; // log is already imported
import { sessionTimeoutMiddleware } from "./sessionTimeout";
import adminRoutes from './api/adminRoutes';
import patientRouter from './api/patient';
import authRoutes from './api/authRoutes';
// Removed: import { logger as appLogger } from './lib/logger';

import { config } from 'dotenv';
config();

const app: ExpressAppType = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Use vite's log for general request logging too, or a more specific app logger if it existed
app.use((req: Request, res: Response, next: NextFunction) => {
  log(`Request Received: ${req.method} ${req.originalUrl}`, "request-logger"); // Using vite's log
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (this: Response, bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(this, [bodyJson, ...args] as any);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
            const responseStr = JSON.stringify(capturedJsonResponse);
            logLine += ` :: ${responseStr.substring(0, 200)}${responseStr.length > 200 ? '...' : ''}`;
        } catch (e) {
            logLine += ` :: [Unserializable Response]`;
        }
      }
      if (logLine.length > 300) {
        logLine = logLine.slice(0, 299) + "…";
      }
      log(logLine); // Uses log from ./vite for API logs
    }
  });
  next();
});

app.use(sessionTimeoutMiddleware);

async function setupApp(application: ExpressAppType) {
  if (adminRoutes) application.use('/api/admin', adminRoutes);
  if (patientRouter) application.use('/api/patient', patientRouter);
  if (authRoutes) application.use('/api/auth', authRoutes);
  await registerRoutes(application);

  application.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${status} - ${message} Path: ${_req.path}`, "error-handler");
    res.status(status).json({ message });
  });
}

let httpServerInstance: http.Server | undefined;

async function startServer(): Promise<http.Server> {
  await setupApp(app);

  httpServerInstance = http.createServer(app);

  const port = 5000;
  const server = httpServerInstance.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return server;
}

export { app, setupApp, startServer };

const currentFileUrl = import.meta.url;
const currentFilePath = new URL(currentFileUrl).pathname;
const isMainModule = (process.argv[1] === currentFilePath) ||
                     (typeof require !== 'undefined' && require.main === module);

if (isMainModule) {
  startServer().catch(err => {
    // Using vite's log for startup errors as well
    log(`Failed to start server: ${err.message || err} ErrorDetails: ${JSON.stringify(err)}`, "startup-error");
    process.exit(1);
  });
}
