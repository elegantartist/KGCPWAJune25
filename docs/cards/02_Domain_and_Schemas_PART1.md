SIZE: 21234 bytes

# Knowledge Card 02: Domain Models and Database Schemas

## Core Domain Entities

### User Entity (Multi-Role)
```typescript
// User types and roles
type UserRole = 'patient' | 'doctor' | 'admin';
type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_deletion';

interface User {
  id: string;                    // UUID primary key
  uin: string;                   // Unique identifier (KGC-PAT-001, KGC-DOC-001, etc.)
  role: UserRole;
  status: UserStatus;
  
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;                 // SMS authentication
  
  // Healthcare metadata
  dateOfBirth?: Date;           // Patients only
  medicalLicenseNumber?: string; // Doctors only
  
  // System metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  deletionRequestedAt?: Date;    // Soft delete tracking
}

// UIN (Unique Identification Number) Format
UIN_PATTERNS = {
  admin: /^KGC-ADM-\d{3}$/,     // KGC-ADM-001
  doctor: /^KGC-DOC-\d{3}$/,    // KGC-DOC-001  
  patient: /^KGC-PAT-\d{3}$/    // KGC-PAT-001
}
```

### Health Scoring Entity
```typescript
interface DailyScore {
  id: string;                    // UUID primary key
  userId: string;               // Foreign key to users table
  date: string;                 // YYYY-MM-DD format
  
  // Core health metrics (1-10 scale)
  overallScore: number;         // Overall wellbeing
  energyLevel: number;          // Energy/fatigue level
  moodScore: number;            // Emotional state
  painLevel?: number;           // Physical pain (optional)
  sleepQuality?: number;        // Sleep quality (optional)
  
  // Metadata
  notes?: string;               // Patient notes (max 500 chars)
  submittedAt: Date;           // Submission timestamp
  modifiedAt?: Date;           // Last modification
  
  // Validation constraints
  SCORE_MIN = 1;
  SCORE_MAX = 10;
  NOTES_MAX_LENGTH = 500;
}

// Scoring business rules
SCORING_RULES = {
  required_fields: ['overallScore', 'energyLevel', 'moodScore'],
  optional_fields: ['painLevel', 'sleepQuality', 'notes'],
  submission_window: '24_hours', // Can submit/edit within 24h
  reminder_time: '19:00',        // 7PM daily reminder
  streak_calculation: 'consecutive_days'
}
```

### Care Plan Directives (CPD)
```typescript
interface CarePlanDirective {
  id: string;                    // UUID primary key
  patientId: string;            // Foreign key to users (patient)
  doctorId: string;             // Foreign key to users (doctor)
  
  // Directive content
  title: string;                // Brief directive title
  description: string;          // Detailed instructions
  category: CPDCategory;        // Categorization
  priority: 'low' | 'medium' | 'high';
  
  // Compliance tracking
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  targetCompletionDate?: Date;
  actualCompletionDate?: Date;
  complianceScore?: number;     // 0-100% compliance
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdByDoctorId: string;
  lastReviewedAt?: Date;
}

type CPDCategory = 
  | 'medication_adherence'
  | 'exercise_routine'
  | 'dietary_changes'
  | 'mental_health_practices'
  | 'lifestyle_modifications'
  | 'monitoring_requirements'
  | 'follow_up_appointments';

// CPD compliance calculation
interface CPDCompliance {
  directiveId: string;
  patientId: string;
  trackingPeriod: 'daily' | 'weekly' | 'monthly';
  completedTasks: number;
  totalTasks: number;
  compliancePercentage: number; // (completed/total) * 100
  lastUpdated: Date;
}
```

### AI Interaction Entity
```typescript
interface AIInteraction {
  id: string;                    // UUID primary key
  userId: string;               // Foreign key to users table
  sessionId: string;            // Conversation session
  
  // Message content
  userMessage: string;          // Patient's input message
  aiResponse: string;           // AI-generated response
  messageType: MessageType;     // Classification
  
  // AI processing metadata
  aiProvider: 'openai' | 'anthropic';
  model: string;                // e.g., 'gpt-4o', 'claude-3-sonnet'
  tokensUsed: number;          // Token consumption tracking
  responseTimeMs: number;       // Performance monitoring
  
  // Safety and compliance
  emergencyDetected: boolean;   // Emergency keyword detection
  flaggedContent: boolean;      // Content moderation flag
  privacyFiltered: boolean;     // PII anonymization applied
  
  // Metadata
  createdAt: Date;
  piiAnonymizedAt?: Date;      // When PII was removed (90 days)
  retentionCategory: 'temporary' | 'permanent' | 'anonymized';
}

type MessageType = 
  | 'health_guidance'
  | 'motivational_support'
  | 'care_plan_assistance'
  | 'general_wellness'
  | 'emergency_detection'
  | 'system_interaction';

// Emergency detection keywords (for safety)
EMERGENCY_KEYWORDS = [
  'suicide', 'self-harm', 'kill myself', 'end my life',
  'overdose', 'emergency', 'urgent help', 'crisis',
  'can\'t go on', 'hurt myself', 'no hope'
];
```

### Audit and Compliance Entity
```typescript
interface AuditLog {
  id: string;                    // UUID primary key
  userId?: string;              // User performing action (nullable for system)
  sessionId?: string;           // Session identifier
  
  // Action details
  action: string;               // Action performed
  resource: string;             // Resource affected
  resourceId?: string;          // Specific resource ID
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  // Request context
  ipAddress: string;            // Client IP address
  userAgent: string;            // Client user agent
  url: string;                  // Request URL
  
  // Healthcare-specific fields
  patientDataAccessed: boolean; // PHI access flag
  healthDataModified: boolean;  // Health data modification flag
  emergencyTriggered: boolean;  // Emergency detection flag
  
  // Compliance metadata
  complianceType: ComplianceType;
  retentionPeriod: '7_years' | 'permanent';
  auditTrailHash: string;       // Integrity verification
  
  // Result details
  statusCode: number;
  success: boolean;
  errorMessage?: string;
  duration: number;             // Request duration in ms
  
  // Timestamp (immutable)
  timestamp: Date;              // ISO 8601 format
}

type ComplianceType = 
  | 'patient_data_access'
  | 'health_data_modification'
  | 'emergency_detection'
  | 'privacy_protection'
  | 'user_authentication'
  | 'system_administration'
  | 'data_export_request'
  | 'account_deletion';
```

## Database Schema (Drizzle ORM)

### Core Tables Definition
```typescript
// shared/schema.ts
import { pgTable, text, timestamp, integer, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  uin: text('uin').unique().notNull(),
  role: text('role').notNull(), // 'patient' | 'doctor' | 'admin'
  status: text('status').notNull().default('active'),
  
  // Personal information
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').unique().notNull(),
  phone: text('phone').unique().notNull(),
  
  // Healthcare-specific
  dateOfBirth: timestamp('date_of_birth'),
  medicalLicenseNumber: text('medical_license_number'),
  
  // System metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
  deletionRequestedAt: timestamp('deletion_requested_at')
});

// Daily health scores
export const dailyScores = pgTable('daily_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD format
  
  // Health metrics (1-10 scale)
  overallScore: integer('overall_score').notNull(),
  energyLevel: integer('energy_level').notNull(),
  moodScore: integer('mood_score').notNull(),
  painLevel: integer('pain_level'),
  sleepQuality: integer('sleep_quality'),
  
  // Metadata
  notes: text('notes'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  modifiedAt: timestamp('modified_at')
});

// Care plan directives
export const carePlanDirectives = pgTable('care_plan_directives', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').references(() => users.id).notNull(),
  doctorId: uuid('doctor_id').references(() => users.id).notNull(),
  
  // Directive content
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  priority: text('priority').notNull().default('medium'),
  
  // Status tracking
  status: text('status').notNull().default('active'),
  targetCompletionDate: timestamp('target_completion_date'),
  actualCompletionDate: timestamp('actual_completion_date'),
  complianceScore: integer('compliance_score'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdByDoctorId: uuid('created_by_doctor_id').references(() => users.id).notNull(),
  lastReviewedAt: timestamp('last_reviewed_at')
});

// AI chat interactions
export const aiInteractions = pgTable('ai_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sessionId: text('session_id').notNull(),
  
  // Message content
  userMessage: text('user_message').notNull(),
  aiResponse: text('ai_response').notNull(),
  messageType: text('message_type').notNull(),
  
  // AI metadata
  aiProvider: text('ai_provider').notNull(),
  model: text('model').notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  responseTimeMs: integer('response_time_ms').notNull(),
  
  // Safety flags
  emergencyDetected: boolean('emergency_detected').default(false),
  flaggedContent: boolean('flagged_content').default(false),
  privacyFiltered: boolean('privacy_filtered').default(false),
  
  // Compliance tracking
  createdAt: timestamp('created_at').defaultNow().notNull(),
  piiAnonymizedAt: timestamp('pii_anonymized_at'),
  retentionCategory: text('retention_category').notNull().default('temporary')
});

// Audit logs for compliance
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: text('session_id'),
  
  // Action details
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  method: text('method').notNull(),
  
  // Request context
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  url: text('url').notNull(),
  
  // Healthcare flags
  patientDataAccessed: boolean('patient_data_accessed').default(false),
  healthDataModified: boolean('health_data_modified').default(false),
  emergencyTriggered: boolean('emergency_triggered').default(false),
  
  // Compliance metadata
  complianceType: text('compliance_type').notNull(),
  retentionPeriod: text('retention_period').notNull().default('7_years'),
  auditTrailHash: text('audit_trail_hash').notNull(),
  
  // Result tracking
  statusCode: integer('status_code').notNull(),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  duration: integer('duration').notNull(),
  
  // Immutable timestamp
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Session management
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  data: jsonb('data').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

### Table Relationships and Constraints
```sql
-- Foreign key relationships
ALTER TABLE daily_scores ADD CONSTRAINT fk_daily_scores_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE care_plan_directives ADD CONSTRAINT fk_cpd_patient 
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE care_plan_directives ADD CONSTRAINT fk_cpd_doctor 
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE ai_interactions ADD CONSTRAINT fk_ai_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Check constraints for data integrity
ALTER TABLE users ADD CONSTRAINT check_user_role 
  CHECK (role IN ('patient', 'doctor', 'admin'));

ALTER TABLE users ADD CONSTRAINT check_user_status 
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending_deletion'));

ALTER TABLE daily_scores ADD CONSTRAINT check_score_range 
  CHECK (overall_score BETWEEN 1 AND 10 
     AND energy_level BETWEEN 1 AND 10 
     AND mood_score BETWEEN 1 AND 10
     AND (pain_level IS NULL OR pain_level BETWEEN 1 AND 10)
     AND (sleep_quality IS NULL OR sleep_quality BETWEEN 1 AND 10));

ALTER TABLE daily_scores ADD CONSTRAINT check_date_format 
  CHECK (date ~ '^\d{4}-\d{2}-\d{2}$');

ALTER TABLE care_plan_directives ADD CONSTRAINT check_cpd_status 
  CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));

ALTER TABLE care_plan_directives ADD CONSTRAINT check_cpd_priority 
  CHECK (priority IN ('low', 'medium', 'high'));

-- Unique constraints
ALTER TABLE users ADD CONSTRAINT unique_uin UNIQUE (uin);
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT unique_phone UNIQUE (phone);
ALTER TABLE daily_scores ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_daily_scores_user_date ON daily_scores(user_id, date DESC);
CREATE INDEX idx_cpd_patient_status ON care_plan_directives(patient_id, status);
CREATE INDEX idx_cpd_doctor ON care_plan_directives(doctor_id);
CREATE INDEX idx_ai_interactions_user_session ON ai_interactions(user_id, session_id);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_compliance ON audit_logs(compliance_type, timestamp DESC);
```

### Data Validation Schemas (Zod)
```typescript
// shared/validation.ts
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';

// User validation
export const UserInsertSchema = createInsertSchema(users, {
  uin: z.string().regex(/^KGC-(ADM|DOC|PAT)-\d{3}$/),
  role: z.enum(['patient', 'doctor', 'admin']),
  status: z.enum(['active', 'inactive', 'suspended', 'pending_deletion']),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/) // E.164 format
}).omit({ id: true, createdAt: true, updatedAt: true });

export type UserInsert = z.infer<typeof UserInsertSchema>;
export type UserSelect = typeof users.$inferSelect;

// Daily score validation
export const DailyScoreInsertSchema = createInsertSchema(dailyScores, {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  overallScore: z.number().int().min(1).max(10),
  energyLevel: z.number().int().min(1).max(10),
  moodScore: z.number().int().min(1).max(10),
  painLevel: z.number().int().min(1).max(10).optional(),
  sleepQuality: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional()
}).omit({ id: true, submittedAt: true, modifiedAt: true });

export type DailyScoreInsert = z.infer<typeof DailyScoreInsertSchema>;
export type DailyScoreSelect = typeof dailyScores.$inferSelect;

// Care plan directive validation
export const CPDInsertSchema = createInsertSchema(carePlanDirectives, {
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum([
    'medication_adherence',
    'exercise_routine',
    'dietary_changes',
    'mental_health_practices',
    'lifestyle_modifications',
    'monitoring_requirements',
    'follow_up_appointments'
  ]),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']),
  complianceScore: z.number().int().min(0).max(100).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export type CPDInsert = z.infer<typeof CPDInsertSchema>;
export type CPDSelect = typeof carePlanDirectives.$inferSelect;

// AI interaction validation
export const AIInteractionInsertSchema = createInsertSchema(aiInteractions, {
  userMessage: z.string().min(1).max(2000),
  aiResponse: z.string().min(1).max(5000),
  messageType: z.enum([
    'health_guidance',
    'motivational_support', 
    'care_plan_assistance',
    'general_wellness',
    'emergency_detection',
    'system_interaction'
  ]),
  aiProvider: z.enum(['openai', 'anthropic']),
  model: z.string().min(1).max(50),
  tokensUsed: z.number().int().min(0),
  responseTimeMs: z.number().int().min(0)
}).omit({ id: true, createdAt: true, piiAnonymizedAt: true });

export type AIInteractionInsert = z.infer<typeof AIInteractionInsertSchema>;
export type AIInteractionSelect = typeof aiInteractions.$inferSelect;
```

### Business Logic Constraints
```typescript
// Domain business rules
export const BUSINESS_RULES = {
  // User management rules
  user: {
    maxPatientsPerDoctor: 50,
    maxDoctorsInSystem: 10,
    maxAdminsInSystem: 1,
    uinSequenceStart: 1,
    phoneVerificationRequired: true,
    sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours
  },
  
  // Health scoring rules
  dailyScores: {
    submissionWindow: 24 * 60 * 60 * 1000, // 24 hours
    editWindow: 24 * 60 * 60 * 1000, // Can edit within 24h
    reminderTime: '19:00', // 7PM local time
    streakCalculation: 'consecutive_days',
    minimumRequiredFields: ['overallScore', 'energyLevel', 'moodScore']
  },
  
  // Care plan directive rules
  carePlans: {
    maxDirectivesPerPatient: 20,
    reviewCycle: 30 * 24 * 60 * 60 * 1000, // 30 days
    complianceThreshold: 80, // 80% compliance target
    autoCompleteThreshold: 100 // 100% completion
  },
  
  // AI interaction rules
  aiChat: {
    maxMessageLength: 2000,
    maxDailyMessages: 50,
    emergencyKeywordCheck: true,
    piiAnonymizationDelay: 90 * 24 * 60 * 60 * 1000, // 90 days
    responseTimeout: 30000 // 30 seconds
  },
  
  // Data retention rules
  dataRetention: {
    auditLogs: '7_years',
    healthData: '7_years',
    aiInteractions: '2_years',
    sessions: '30_days',
    deletedUserGracePeriod: '30_days'
  }
} as const;
```