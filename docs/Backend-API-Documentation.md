# Backend API Documentation
## Complete Server Implementation for Keep Going Care

### 1. Server Routes Structure
*File: `server/routes.ts`*

#### Motivational Image Management

```typescript
// GET /api/users/:userId/motivational-image
// Retrieve user's saved motivational image
app.get('/api/users/:userId/motivational-image', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const image = await storage.getMotivationalImage(userId);
    
    if (!image) {
      return res.status(404).json({ message: "No motivational image found" });
    }
    
    res.json(image);
  } catch (error) {
    console.error("Error fetching motivational image:", error);
    res.status(500).json({ message: "Failed to fetch motivational image" });
  }
});

// PUT /api/users/:userId/motivational-image  
// Save or update user's motivational image
app.put('/api/users/:userId/motivational-image', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { imageData } = req.body;
    
    console.log(`[DEBUG] PUT /api/users/${userId}/motivational-image - Request received`);
    console.log(`[DEBUG] Request body keys:`, Object.keys(req.body));
    console.log(`[DEBUG] Image data length:`, imageData?.length || 0);
    
    if (!imageData) {
      return res.status(400).json({ message: "Image data is required" });
    }
    
    console.log(`[DEBUG] Calling storage.updateMotivationalImage for user ${userId}`);
    const result = await storage.updateMotivationalImage(userId, imageData);
    console.log(`[DEBUG] Successfully updated motivational image for user ${userId}`);
    
    res.json(result);
  } catch (error) {
    console.error("Error saving motivational image:", error);
    res.status(500).json({ message: "Failed to save motivational image" });
  }
});
```

#### Daily Self-Scores Management

```typescript
// POST /api/patient-scores
// Submit daily health scores
app.post('/api/patient-scores', async (req, res) => {
  try {
    const { patientId, physicalHealth, mentalHealth, nutritionHealth, scoreDate } = req.body;
    
    // Validate input
    if (!patientId || physicalHealth === undefined || mentalHealth === undefined || nutritionHealth === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Validate score ranges (1-10)
    const scores = [physicalHealth, mentalHealth, nutritionHealth];
    const invalidScores = scores.filter(score => score < 1 || score > 10);
    if (invalidScores.length > 0) {
      return res.status(400).json({ message: "Scores must be between 1 and 10" });
    }
    
    const result = await storage.createPatientScore({
      patientId,
      scoreDate: scoreDate || new Date().toISOString().split('T')[0],
      physicalHealth,
      mentalHealth,
      nutritionHealth,
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating patient score:", error);
    res.status(500).json({ message: "Failed to create patient score" });
  }
});

// GET /api/patient-scores/:patientId
// Get patient's score history
app.get('/api/patient-scores/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const { startDate, endDate, limit } = req.query;
    
    const scores = await storage.getPatientScores(patientId, {
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    
    res.json(scores);
  } catch (error) {
    console.error("Error fetching patient scores:", error);
    res.status(500).json({ message: "Failed to fetch patient scores" });
  }
});
```

#### User Context and Authentication

```typescript
// GET /api/user/current-context
// Get current user's context and session info
app.get('/api/user/current-context', (req, res) => {
  const session = req.session as SessionData;
  
  if (!session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  res.json({
    userId: session.userId,
    userRole: session.userRole,
    dashboardType: session.dashboardType,
    doctorLetter: session.doctorLetter,
    patientNumber: session.patientNumber,
  });
});
```

### 2. Database Storage Layer
*File: `server/storage.ts`*

```typescript
import { db } from './db';
import { 
  motivationalImages, 
  patientScores, 
  users,
  type MotivationalImage,
  type PatientScore,
  type User 
} from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface IStorage {
  // Motivational Images
  getMotivationalImage(userId: number): Promise<MotivationalImage | undefined>;
  updateMotivationalImage(userId: number, imageData: string): Promise<MotivationalImage>;
  
  // Patient Scores
  createPatientScore(data: Omit<PatientScore, 'id' | 'createdAt'>): Promise<PatientScore>;
  getPatientScores(patientId: number, options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<PatientScore[]>;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  
  // Motivational Images
  async getMotivationalImage(userId: number): Promise<MotivationalImage | undefined> {
    const [image] = await db
      .select()
      .from(motivationalImages)
      .where(eq(motivationalImages.userId, userId))
      .limit(1);
    return image;
  }
  
  async updateMotivationalImage(userId: number, imageData: string): Promise<MotivationalImage> {
    const [result] = await db
      .insert(motivationalImages)
      .values({
        userId,
        imageData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: motivationalImages.userId,
        set: {
          imageData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return result;
  }
  
  // Patient Scores
  async createPatientScore(data: Omit<PatientScore, 'id' | 'createdAt'>): Promise<PatientScore> {
    const [result] = await db
      .insert(patientScores)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    
    return result;
  }
  
  async getPatientScores(patientId: number, options: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<PatientScore[]> {
    let query = db
      .select()
      .from(patientScores)
      .where(eq(patientScores.patientId, patientId));
    
    // Add date filters if provided
    if (options.startDate) {
      query = query.where(
        and(
          eq(patientScores.patientId, patientId),
          gte(patientScores.scoreDate, options.startDate)
        )
      );
    }
    
    if (options.endDate) {
      query = query.where(
        and(
          eq(patientScores.patientId, patientId),
          lte(patientScores.scoreDate, options.endDate)
        )
      );
    }
    
    // Order by date descending
    query = query.orderBy(desc(patientScores.scoreDate));
    
    // Apply limit if specified
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }
  
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }
  
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);
    return user;
  }
}

export const storage = new DatabaseStorage();
```

### 3. Database Schema
*File: `shared/schema.ts`*

```typescript
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uin: varchar('uin', { length: 10 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }).unique().notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  doctorLetter: varchar('doctor_letter', { length: 1 }),
  patientNumber: integer('patient_number'),
  createdByUserId: integer('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Motivational Images table
export const motivationalImages = pgTable('motivational_images', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  imageData: text('image_data').notNull(), // Base64 encoded image
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('motivational_images_user_id_idx').on(table.userId),
]);

// Patient Scores table (primary scoring system)
export const patientScores = pgTable('patient_scores', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => users.id),
  scoreDate: date('score_date').notNull(),
  physicalHealth: integer('physical_health').notNull(), // 1-10
  mentalHealth: integer('mental_health').notNull(), // 1-10
  nutritionHealth: integer('nutrition_health').notNull(), // 1-10
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('patient_scores_patient_id_idx').on(table.patientId),
  index('patient_scores_date_idx').on(table.scoreDate),
]);

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type MotivationalImage = typeof motivationalImages.$inferSelect;
export type InsertMotivationalImage = typeof motivationalImages.$inferInsert;

export type PatientScore = typeof patientScores.$inferSelect;
export type InsertPatientScore = typeof patientScores.$inferInsert;

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertMotivationalImageSchema = createInsertSchema(motivationalImages);
export const insertPatientScoreSchema = createInsertSchema(patientScores)
  .extend({
    physicalHealth: z.number().min(1).max(10),
    mentalHealth: z.number().min(1).max(10),
    nutritionHealth: z.number().min(1).max(10),
  });
```

### 4. Session Management
*File: `server/sessionTimeout.ts`*

```typescript
import { Request, Response, NextFunction } from 'express';

export interface SessionData {
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

// Session timeout configurations (in milliseconds)
const SESSION_TIMEOUTS = {
  admin: 60 * 60 * 1000,    // 60 minutes for admin
  doctor: 5 * 60 * 1000,    // 5 minutes for doctors  
  patient: 30 * 60 * 1000,  // 30 minutes for patients
  default: 30 * 60 * 1000,  // 30 minutes default
};

export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = req.session as SessionData;
  
  if (!session.userId) {
    return next(); // No session to timeout
  }
  
  const now = Date.now();
  const lastActivity = session.lastActivity || now;
  const userRole = session.userRole || 'patient';
  const timeout = SESSION_TIMEOUTS[userRole as keyof typeof SESSION_TIMEOUTS] || SESSION_TIMEOUTS.default;
  
  if (now - lastActivity > timeout) {
    // Session has expired
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying expired session:', err);
      }
      res.status(401).json({ 
        message: "Session expired", 
        code: "SESSION_TIMEOUT",
        timeout: timeout / 1000 // Return timeout in seconds
      });
    });
    return;
  }
  
  // Update last activity
  session.lastActivity = now;
  next();
}

export function updateSessionActivity(req: Request) {
  const session = req.session as SessionData;
  if (session.userId) {
    session.lastActivity = Date.now();
  }
}
```

### 5. Authentication Middleware
*File: `server/auth.ts`*

```typescript
import { Request, Response, NextFunction } from 'express';
import { SessionData } from './sessionTimeout';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as SessionData;
  
  if (!session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as SessionData;
    
    if (!session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!session.userRole || !allowedRoles.includes(session.userRole)) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: allowedRoles,
        current: session.userRole
      });
    }
    
    next();
  };
}
```

### 6. Error Handling Middleware

```typescript
// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Don't send stack traces to client in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    message: "Internal server error",
    ...(isDevelopment && { 
      error: err.message,
      stack: err.stack 
    })
  });
});
```

### 7. Database Connection
*File: `server/db.ts`*

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 30, // Connection timeout in seconds
});

export const db = drizzle(client, { schema });

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
```

This backend documentation provides all the server-side implementation details needed to recreate the Keep Going Care API with proper error handling, authentication, and database management.