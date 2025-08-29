import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check for DATABASE_URL with informative error for cloud deployments
if (!process.env.DATABASE_URL) {
  console.error("🚨 CRITICAL: DATABASE_URL environment variable is missing");
  console.error("For Google Cloud Run, ensure DATABASE_URL is set in the service configuration");
  console.error("For AWS App Runner, ensure DATABASE_URL is provided via Secrets Manager");
  throw new Error(
    "DATABASE_URL must be set. Cloud deployment requires database connection string in environment variables.",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
export const db = drizzle(pool, { schema });