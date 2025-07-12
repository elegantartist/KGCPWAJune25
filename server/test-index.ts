import express, { Express as ExpressAppType } from "express";
import { registerRoutes } from "./routes";
import adminRoutes from './api/adminRoutes';
import patientRouter from './api/patient';
import authRoutes from './api/authRoutes';

export async function createTestApp() {
  const app: ExpressAppType = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Mount the placeholder routers to match the main app's structure
  if (adminRoutes) app.use('/api/admin', adminRoutes);
  if (patientRouter) app.use('/api/patient', patientRouter);
  if (authRoutes) app.use('/api/auth', authRoutes);

  // Register the main routes from routes.ts
  await registerRoutes(app);

  return app;
}
