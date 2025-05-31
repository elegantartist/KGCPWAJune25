-- PostgreSQL initialization script for KGC Health Application
-- This script creates necessary tables and initial data for deployment
-- Execute with: psql -U [username] -d [dbname] -f init-postgres.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas
-- (optional - if you want to organize tables in separate schemas)
-- CREATE SCHEMA IF NOT EXISTS kgc_app;
-- SET search_path TO kgc_app, public;

-- Create sequence for session management
CREATE SEQUENCE IF NOT EXISTS "session_seq" 
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    START WITH 1
    CACHE 1;

-- Create sessions table for connection-pg-simple
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Create tables if needed (these will be managed by Drizzle ORM)
-- The Drizzle push command will handle table creation during deployment

-- Add indexing optimizations
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" ("username");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_uin" ON "users" ("uin");
CREATE INDEX IF NOT EXISTS "idx_users_role_id" ON "users" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_cpd_user_id" ON "care_plan_directives" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_cpd_active" ON "care_plan_directives" ("active");
CREATE INDEX IF NOT EXISTS "idx_health_metrics_user_id" ON "health_metrics" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_feature_usage_user_id" ON "feature_usage" ("user_id", "feature_name");
CREATE INDEX IF NOT EXISTS "idx_recommendations_user_id" ON "recommendations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_memory_user_id" ON "chat_memory" ("user_id", "type");
CREATE INDEX IF NOT EXISTS "idx_doctor_patients_doctor_id" ON "doctor_patients" ("doctor_id");
CREATE INDEX IF NOT EXISTS "idx_doctor_patients_patient_id" ON "doctor_patients" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_ppr_patient_id" ON "patient_progress_reports" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_ppr_created_by_id" ON "patient_progress_reports" ("created_by_id");

-- Set up permissions (modify as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO [username];
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO [username];