import { pgTable, text, serial, integer, timestamp, real, boolean, json, varchar, uniqueIndex, foreignKey, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles for access control
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'admin', 'doctor', 'patient'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Main users table - extended for hierarchical user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uin: varchar("uin", { length: 50 }).unique(), // Unique Identity Number (scalable format: KGC-ADM-001, KGC-DOC-001, KGC-PAT-001)
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  roleId: integer("role_id").notNull(),
  phoneNumber: text("phone_number").notNull(), // Required for Twilio SMS auth
  joinedDate: timestamp("joined_date").defaultNow().notNull(),
  username: text("username").unique(),
  password: text("password"), // Optional for SMS-based auth
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  // Hierarchical relationship fields (legacy - kept for backwards compatibility)
  doctorLetter: varchar("doctor_letter", { length: 1 }), // Legacy field, now optional
  patientNumber: integer("patient_number"), // Legacy field, now optional  
  createdByUserId: integer("created_by_user_id"), // Who created this user
  // New scalable fields
  uinSequence: integer("uin_sequence"), // Sequential number for each role type
  assignedDoctorId: integer("assigned_doctor_id"), // For patients: which doctor they're assigned to
}, (table) => {
  return {
    roleReference: foreignKey({
      columns: [table.roleId],
      foreignColumns: [userRoles.id],
    }),
    createdByReference: foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [table.id],
    }),
    assignedDoctorReference: foreignKey({
      columns: [table.assignedDoctorId],
      foreignColumns: [table.id],
    }),
  };
});

export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").defaultNow().notNull(),
  medicationScore: real("medication_score").notNull(),
  dietScore: real("diet_score").notNull(),
  exerciseScore: real("exercise_score").notNull(),
});

// New table to store motivational images permanently for each user
export const motivationalImages = pgTable("motivational_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageData: text("image_data").notNull(), // Store base64 image data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Care Plan Directives (CPDs) received from the API
export const carePlanDirectives = pgTable("care_plan_directives", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  directive: text("directive").notNull(),
  category: text("category").notNull(), // 'diet', 'exercise', 'medication'
  targetValue: real("target_value"), // Numerical target if applicable
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Feature usage tracking for MCP system
export const featureUsage = pgTable("feature_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  featureName: text("feature_name").notNull(), // Name of the feature used
  usageCount: integer("usage_count").default(0).notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced memory system for MCP (LangMem implementation)
export const chatMemory = pgTable("chat_memory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // Memory system classification (semantic, procedural, episodic)
  memorySystem: text("memory_system").notNull().default('semantic'),
  // Original type field preserved for backward compatibility
  type: text("type").notNull(), // 'short_term', 'medium_term', 'long_term'
  content: text("content").notNull(), // The memory content
  context: json("context"), // Additional context like related scores, features, etc.
  // New fields for enhanced memory management
  importance: real("importance").default(0.5), // Priority score for memory retrieval (0-1)
  embeddings: text("embeddings"), // Vector embeddings for similarity search (JSON string)
  lastAccessed: timestamp("last_accessed"), // When this memory was last retrieved/used
  accessCount: integer("access_count").default(0), // How many times this memory was accessed
  expiresAt: timestamp("expires_at"), // When to forget (null for long-term)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recommendation tracking for MCP
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  directiveId: integer("directive_id").references(() => carePlanDirectives.id),
  recommendedFeature: text("recommended_feature").notNull(),
  alternativeFeatures: json("alternative_features").default('[]'), // JSON array of additional recommended features
  reasoningText: text("reasoning_text"), // CBT/MI explanation for recommendations
  wasFollowed: boolean("was_followed").default(false),
  scoreBeforeRecommendation: real("score_before_recommendation"),
  scoreAfterRecommendation: real("score_after_recommendation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User content preferences - tracks what topics/themes the user shows interest in
export const userContentPreferences = pgTable("user_content_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(), // 'diet_recipe', 'exercise_video', etc.
  keyword: text("keyword").notNull(), // Topic or theme the user has shown interest in
  weight: integer("weight").default(1).notNull(), // Higher weight means stronger preference
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Saved favorites from Tavily search results
export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(), // 'diet_recipe', 'exercise_video', etc.
  contentUrl: text("content_url").notNull(),
  contentTitle: text("content_title").notNull(),
  contentDescription: text("content_description"),
  imageUrl: text("image_url"),
  metadata: json("metadata").default('{}'), // Additional details about the content
  validationScore: real("validation_score").default(0), // LLM validation rating 0-1
  isValid: boolean("is_valid").default(true), // Whether content is valid per CPD goals
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Track all user interactions with content (views, likes, dislikes)
export const contentInteractions = pgTable("content_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(),
  contentUrl: text("content_url").notNull(),
  interactionType: text("interaction_type").notNull(), // 'view', 'favorite', 'dislike'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Dashboard Relationships Table - Core hierarchy management for KGC
export const dashboardRelationships = pgTable("dashboard_relationships", {
  id: serial("id").primaryKey(),
  parentUserId: integer("parent_user_id").references(() => users.id), // Admin creates doctors, doctors create patients
  childUserId: integer("child_user_id").notNull().references(() => users.id),
  relationshipType: text("relationship_type").notNull(), // 'admin_to_doctor', 'doctor_to_patient'
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  lastReviewed: timestamp("last_reviewed"),
}, (table) => {
  return {
    parentChildUnique: uniqueIndex("parent_child_unique_idx").on(
      table.parentUserId, 
      table.childUserId
    )
  };
});

// Legacy table maintained for backward compatibility
export const doctorPatients = pgTable("doctor_patients", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  lastReviewed: timestamp("last_reviewed"),
}, (table) => {
  return {
    doctorPatientUnique: uniqueIndex("doctor_patient_unique_idx").on(
      table.doctorId, 
      table.patientId
    )
  };
});

export const insertUserRoleSchema = createInsertSchema(userRoles).pick({
  name: true,
  description: true,
});

export const insertUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  roleId: z.number().int().positive("Valid role ID is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  uin: z.string().min(1, "UIN is required"),
  isActive: z.boolean().default(true),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
});

// Update schema for users (for updating existing users)
export const updateUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  phoneNumber: true,
}).partial();

export const insertHealthMetricSchema = createInsertSchema(healthMetrics).pick({
  userId: true,
  medicationScore: true,
  dietScore: true,
  exerciseScore: true,
});

// Add insert schema for motivational images
export const insertMotivationalImageSchema = createInsertSchema(motivationalImages).pick({
  userId: true,
  imageData: true,
});

// Insert schemas for MCP system tables
export const insertCarePlanDirectiveSchema = createInsertSchema(carePlanDirectives).pick({
  userId: true,
  directive: true,
  category: true,
  targetValue: true,
  active: true,
});

export const insertFeatureUsageSchema = createInsertSchema(featureUsage).pick({
  userId: true,
  featureName: true,
  usageCount: true,
});

export const insertChatMemorySchema = createInsertSchema(chatMemory).pick({
  userId: true,
  memorySystem: true,
  type: true,
  content: true,
  context: true,
  importance: true,
  embeddings: true,
  expiresAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).pick({
  userId: true,
  directiveId: true,
  recommendedFeature: true,
  alternativeFeatures: true,
  reasoningText: true,
  wasFollowed: true,
  scoreBeforeRecommendation: true,
  scoreAfterRecommendation: true,
});

// Insert schemas for content tracking
export const insertUserContentPreferenceSchema = createInsertSchema(userContentPreferences).pick({
  userId: true,
  contentType: true,
  keyword: true,
  weight: true,
});

export const insertUserFavoriteSchema = createInsertSchema(userFavorites).pick({
  userId: true,
  contentType: true,
  contentUrl: true,
  contentTitle: true,
  contentDescription: true,
  imageUrl: true,
  metadata: true,
  validationScore: true,
  isValid: true,
});

// Emergency alerts table for critical patient situations
export const emergencyAlerts = pgTable("emergency_alerts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  emergencyType: text("emergency_type").notNull(), // 'self_harm', 'death_risk', 'serious_injury', 'medical_emergency'
  confidence: real("confidence").notNull(), // 0.0 to 1.0
  patientMessage: text("patient_message").notNull(),
  alertSent: boolean("alert_sent").default(false),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentInteractionSchema = createInsertSchema(contentInteractions).pick({
  userId: true,
  contentType: true,
  contentUrl: true,
  interactionType: true,
});

//  Patient Alert System - for doctor notifications about patient non-engagement  
export const patientAlerts = pgTable("patient_alerts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  alertType: text("alert_type").notNull(), // 'daily_scores_missing', 'extended_inactivity', 'emergency'
  alertMessage: text("alert_message").notNull(),
  daysMissed: integer("days_missed").default(0),
  isRead: boolean("is_read").default(false).notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Patient Reminder System - for tracking 7PM reminders
export const patientReminders = pgTable("patient_reminders", {
  id: serial("id").primaryKey(), 
  patientId: integer("patient_id").notNull().references(() => users.id),
  reminderType: text("reminder_type").notNull(), // 'daily_scores', 'feature_usage', 'cpd_compliance'
  reminderDate: date("reminder_date").notNull(),
  reminderTime: text("reminder_time").default("19:00").notNull(), // 7:00 PM in 24-hour format
  wasSent: boolean("was_sent").default(false).notNull(),
  wasActedUpon: boolean("was_acted_upon").default(false).notNull(),
  sentAt: timestamp("sent_at"),
  actionedAt: timestamp("actioned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for Alert System
export const insertPatientAlertSchema = createInsertSchema(patientAlerts).pick({
  patientId: true,
  doctorId: true,
  alertType: true,
  alertMessage: true,
  daysMissed: true,
});

export const insertPatientReminderSchema = createInsertSchema(patientReminders).pick({
  patientId: true,
  reminderType: true,
  reminderDate: true,
  reminderTime: true,
});

// Basic types
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;
export type HealthMetric = typeof healthMetrics.$inferSelect;
export type InsertMotivationalImage = z.infer<typeof insertMotivationalImageSchema>;
export type MotivationalImage = typeof motivationalImages.$inferSelect;

// MCP system types
export type InsertCarePlanDirective = z.infer<typeof insertCarePlanDirectiveSchema>;
export type CarePlanDirective = typeof carePlanDirectives.$inferSelect;
export type InsertFeatureUsage = z.infer<typeof insertFeatureUsageSchema>;
export type FeatureUsage = typeof featureUsage.$inferSelect;
export type InsertChatMemory = z.infer<typeof insertChatMemorySchema>;
export type ChatMemory = typeof chatMemory.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// Content tracking types
export type InsertUserContentPreference = z.infer<typeof insertUserContentPreferenceSchema>;
export type UserContentPreference = typeof userContentPreferences.$inferSelect;
export type InsertUserFavorite = z.infer<typeof insertUserFavoriteSchema>;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertContentInteraction = z.infer<typeof insertContentInteractionSchema>;
export type ContentInteraction = typeof contentInteractions.$inferSelect;

// Alert system types
export type InsertPatientAlert = z.infer<typeof insertPatientAlertSchema>;
export type PatientAlert = typeof patientAlerts.$inferSelect;
export type InsertPatientReminder = z.infer<typeof insertPatientReminderSchema>;
export type PatientReminder = typeof patientReminders.$inferSelect;

// Patient daily self-scores table
export const patientScores = pgTable("patient_scores", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  scoreDate: date("score_date").notNull().defaultNow(),
  exerciseSelfScore: integer("exercise_self_score"), // 1-10 scale
  mealPlanSelfScore: integer("meal_plan_self_score"), // 1-10 scale
  medicationSelfScore: integer("medication_self_score"), // 1-10 scale
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  // Ensure a patient can only have one score entry per day
  return {
    patientScoreDateUnique: uniqueIndex("patient_score_date_unique_idx").on(
      table.patientId, 
      table.scoreDate
    )
  };
});

// Patient achievement badges table
export const patientBadges = pgTable("patient_badges", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  badgeType: text("badge_type").notNull(), // 'exercise', 'meal', 'medication'
  badgeLevel: text("badge_level").notNull(), // 'bronze', 'silver', 'gold', 'platinum'
  earnedDate: timestamp("earned_date").defaultNow().notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
}, (table) => {
  // Ensure a patient can only earn each badge level once per type
  return {
    patientBadgeUnique: uniqueIndex("patient_badge_unique_idx").on(
      table.patientId, 
      table.badgeType,
      table.badgeLevel
    )
  };
});

// Patient event tracking for supervisor agent
export const patientEvents = pgTable("patient_events", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(), // 'badge_earned', 'new_cpd', 'score_improved', etc.
  eventData: json("event_data").notNull(), // Details specific to event type
  eventDate: timestamp("event_date").defaultNow().notNull(),
  processedByAgent: boolean("processed_by_agent").default(false).notNull(),
});

// Doctor alerts for patient compliance tracking
export const doctorAlerts = pgTable("doctor_alerts", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  alertType: text("alert_type").notNull(), // 'missing_scores', 'low_scores', etc.
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
  deleted: boolean("deleted").default(false).notNull(),
});

// Insert schemas for the new tables
export const insertPatientScoreSchema = createInsertSchema(patientScores).pick({
  patientId: true,
  scoreDate: true,
  exerciseSelfScore: true,
  mealPlanSelfScore: true,
  medicationSelfScore: true,
  notes: true,
});

export const insertPatientBadgeSchema = createInsertSchema(patientBadges).pick({
  patientId: true,
  badgeType: true,
  badgeLevel: true,
  earnedDate: true,
  notificationSent: true,
});

export const insertPatientEventSchema = createInsertSchema(patientEvents).pick({
  patientId: true,
  eventType: true,
  eventData: true,
  eventDate: true,
});

export const insertDoctorAlertSchema = createInsertSchema(doctorAlerts).pick({
  doctorId: true,
  patientId: true,
  alertType: true,
  message: true,
  read: true,
  deleted: true,
});

// Types for the new tables
export type InsertPatientScore = z.infer<typeof insertPatientScoreSchema>;
export type PatientScore = typeof patientScores.$inferSelect;
export type InsertPatientBadge = z.infer<typeof insertPatientBadgeSchema>;
export type PatientBadge = typeof patientBadges.$inferSelect;
export type InsertPatientEvent = z.infer<typeof insertPatientEventSchema>;
export type PatientEvent = typeof patientEvents.$inferSelect;
export type InsertDoctorAlert = z.infer<typeof insertDoctorAlertSchema>;
export type DoctorAlert = typeof doctorAlerts.$inferSelect;

// Progress Milestones table
export const progressMilestones = pgTable("progress_milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "Diet", "Exercise", "Medication", "Wellness", "Engagement"
  progress: real("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  targetDate: timestamp("target_date"),
  completedDate: timestamp("completed_date"),
  iconType: text("icon_type").notNull(), // "Trophy", "Medal", "Star", "Award", "Calendar", "Target"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Fields for offline support
  lastSyncedAt: timestamp("last_synced_at"),
  localUuid: text("local_uuid"), // Used to match local milestones with server ones
});

// Insert schema for progress milestones
export const insertProgressMilestoneSchema = createInsertSchema(progressMilestones).pick({
  userId: true,
  title: true,
  description: true,
  category: true,
  progress: true,
  completed: true,
  targetDate: true,
  completedDate: true,
  iconType: true,
  localUuid: true
});

export type InsertProgressMilestone = z.infer<typeof insertProgressMilestoneSchema>;
export type ProgressMilestone = typeof progressMilestones.$inferSelect;

// Doctor-Patient relationship schema is already defined above

// Patient Progress Reports (PPR)
export const patientProgressReports = pgTable("patient_progress_reports", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  createdById: integer("created_by_id").notNull().references(() => users.id), // Doctor who generated or system
  reportDate: timestamp("report_date").defaultNow().notNull(),
  reportPeriodStartDate: timestamp("report_period_start_date").notNull(),
  reportPeriodEndDate: timestamp("report_period_end_date").notNull(),
  avgMedicationScore: real("avg_medication_score"),
  avgDietScore: real("avg_diet_score"),
  avgExerciseScore: real("avg_exercise_score"),
  keepGoingButtonUsageCount: integer("keep_going_button_usage_count").default(0), // Count of Keep Going button usage
  chatSentimentScore: real("chat_sentiment_score"), // -1 to 1 scale
  chatSentimentAnalysis: text("chat_sentiment_analysis"),
  featureUsageSummary: json("feature_usage_summary"), // Structured summary of feature usage
  recommendationSuccess: json("recommendation_success"), // How well recommendations worked
  systemRecommendations: text("system_recommendations").array(), // KGC suggests CPD changes
  newCpdSuggestions: json("new_cpd_suggestions"), // New CPD suggestions based on latest data
  doctorNotes: text("doctor_notes"),
  shared: boolean("shared").default(false).notNull(), // If shared with patient
  
  // Enhanced PPR fields
  scorePatterns: json("score_patterns"), // Analysis of patterns in self-scores
  adherenceRate: real("adherence_rate"), // Overall CPD adherence percentage
  consistencyMetrics: json("consistency_metrics"), // Metrics about patient consistency
  behaviorInsights: json("behavior_insights"), // AI-generated insights about behavior patterns
  improvementTrajectory: json("improvement_trajectory"), // Projection of improvement based on trends
  engagementScore: real("engagement_score"), // Overall engagement score from 0-100
  healthTrends: json("health_trends"), // Array of trend data for visualizations
  progressBadges: json("progress_badges"), // Patient progress milestone badges data
});

// Patient Invitations
export const patientInvitations = pgTable("patient_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  uin: varchar("uin", { length: 15 }).notNull().unique(),
  token: text("token").notNull().unique(),
  sentDate: timestamp("sent_date").defaultNow().notNull(),
  expiresDate: timestamp("expires_date").notNull(),
  acceptedDate: timestamp("accepted_date"),
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'expired'
});

// Emergency Contact Events
export const emergencyEvents = pgTable("emergency_events", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  eventTime: timestamp("event_time").defaultNow().notNull(),
  eventType: text("event_type").notNull(), // 'doctor_notification', 'emergency_services'
  triggerReason: text("trigger_reason").notNull(),
  patientLocation: json("patient_location"), // GPS coordinates if available
  resolved: boolean("resolved").default(false).notNull(),
  resolvedTime: timestamp("resolved_time"),
  notes: text("notes"),
});

// Audit Log for Regulatory Compliance (HIPAA, TGA SaMD, Australian Privacy Principles)
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  eventType: text("event_type").notNull(), // 'LOGIN', 'LOGOUT', 'DATA_ACCESS', etc.
  severity: text("severity").notNull(), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  userId: integer("user_id").references(() => users.id),
  targetUserId: integer("target_user_id").references(() => users.id),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  details: text("details"), // JSON string with event details
  complianceStandards: text("compliance_standards"), // CSV of applicable standards
  environment: text("environment").notNull(), // 'development', 'replit', 'aws', 'production'
});

// Admin activity log
export const adminActivityLog = pgTable("admin_activity_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  activityTime: timestamp("activity_time").defaultNow().notNull(),
  activityType: text("activity_type").notNull(), // 'create_doctor', 'delete_user', etc.
  entityType: text("entity_type").notNull(), // 'user', 'report', etc.
  entityId: integer("entity_id"), // ID of the affected entity
  details: json("details"), // Additional activity details
});

// Saved recipes table for diet inspiration feature
export const savedRecipes = pgTable("saved_recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  thumbnail_url: text("thumbnail_url"),
  source_name: text("source_name"),
  cuisine_type: text("cuisine_type"),
  meal_type: text("meal_type"),
  nutritional_value: text("nutritional_value"),
  health_score: integer("health_score"),
  health_benefits: text("health_benefits").array(),
  calories_estimate: text("calories_estimate"),
  difficulty_level: text("difficulty_level"),
  tips: text("tips").array(),
  created_at: timestamp("created_at").defaultNow(),
});

// User favorite videos for Inspiration Machine D
export const userFavoriteVideos = pgTable("user_favorite_videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  thumbnail_url: text("thumbnail_url"),
  source_name: text("source_name"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Food Database Tables
// Food items table with nutritional information
export const foodItems = pgTable("food_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  fiber: real("fiber"),
  sugar: real("sugar"),
  sodium: real("sodium"),
  glycemicIndex: integer("glycemic_index"),
  servingSize: text("serving_size").notNull(),
  servingSizeGrams: integer("serving_size_grams").notNull(),
  source: text("source").notNull(),
  additionalInfo: json("additional_info"),
  cpdRelevantTags: text("cpd_relevant_tags").array(), // Tags like 'low-carb', 'low-sodium' to connect with CPDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User food preferences and history
export const userFoodPreferences = pgTable("user_food_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  foodItemId: integer("food_item_id").notNull().references(() => foodItems.id),
  isFavourite: boolean("is_favourite").default(false),
  isRestricted: boolean("is_restricted").default(false), // Based on CPDs or user preference
  viewCount: integer("view_count").default(0),
  lastViewed: timestamp("last_viewed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for doctor-patient related tables
export const insertDoctorPatientSchema = createInsertSchema(doctorPatients).pick({
  doctorId: true,
  patientId: true,
  notes: true,
  active: true,
});

export const insertPatientProgressReportSchema = createInsertSchema(patientProgressReports).pick({
  patientId: true,
  createdById: true,
  reportPeriodStartDate: true,
  reportPeriodEndDate: true,
  avgMedicationScore: true,
  avgDietScore: true,
  avgExerciseScore: true,
  keepGoingButtonUsageCount: true,
  chatSentimentScore: true,
  chatSentimentAnalysis: true,
  featureUsageSummary: true,
  recommendationSuccess: true,
  systemRecommendations: true,
  newCpdSuggestions: true,
  doctorNotes: true,
  shared: true,
  // Enhanced PPR fields
  scorePatterns: true,
  adherenceRate: true,
  consistencyMetrics: true,
  behaviorInsights: true,
  improvementTrajectory: true,
  engagementScore: true,
  healthTrends: true,
  progressBadges: true,
});

export const insertPatientInvitationSchema = createInsertSchema(patientInvitations).pick({
  email: true,
  doctorId: true,
  uin: true,
  token: true,
  expiresDate: true,
  status: true,
});

export const insertEmergencyEventSchema = createInsertSchema(emergencyEvents).pick({
  patientId: true,
  doctorId: true,
  eventType: true,
  triggerReason: true,
  patientLocation: true,
  resolved: true,
  resolvedTime: true,
  notes: true,
});

export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLog).pick({
  adminId: true,
  activityType: true,
  entityType: true,
  entityId: true,
  details: true,
});

// Create the insert schema for saved recipes
export const insertSavedRecipeSchema = createInsertSchema(savedRecipes).pick({
  userId: true,
  title: true,
  description: true,
  url: true,
  thumbnail_url: true,
  source_name: true,
  cuisine_type: true,
  meal_type: true,
  nutritional_value: true,
  health_score: true,
  health_benefits: true,
  calories_estimate: true,
  difficulty_level: true,
  tips: true,
});

// Define types for doctor-patient related tables
export type InsertDoctorPatient = z.infer<typeof insertDoctorPatientSchema>;
export type DoctorPatient = typeof doctorPatients.$inferSelect;

export type InsertPatientProgressReport = z.infer<typeof insertPatientProgressReportSchema>;
export type PatientProgressReport = typeof patientProgressReports.$inferSelect;

export type InsertPatientInvitation = z.infer<typeof insertPatientInvitationSchema>;
export type PatientInvitation = typeof patientInvitations.$inferSelect;

export type InsertEmergencyEvent = z.infer<typeof insertEmergencyEventSchema>;
export type EmergencyEvent = typeof emergencyEvents.$inferSelect;

export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type AdminActivityLog = typeof adminActivityLog.$inferSelect;

// Define types for saved recipes
export type InsertSavedRecipe = z.infer<typeof insertSavedRecipeSchema>;
export type SavedRecipe = typeof savedRecipes.$inferSelect;

// Create insert schema for favorite videos
export const insertUserFavoriteVideoSchema = createInsertSchema(userFavoriteVideos).pick({
  userId: true,
  title: true,
  description: true,
  url: true,
  thumbnail_url: true,
  source_name: true,
  tags: true
});

// Define types for favorite videos
export type InsertUserFavoriteVideo = z.infer<typeof insertUserFavoriteVideoSchema>;
export type UserFavoriteVideo = typeof userFavoriteVideos.$inferSelect;

// Add Food Database insert schemas
export const insertFoodItemSchema = createInsertSchema(foodItems).pick({
  name: true,
  category: true,
  calories: true,
  protein: true,
  carbs: true,
  fat: true,
  fiber: true,
  sugar: true,
  sodium: true,
  glycemicIndex: true,
  servingSize: true,
  servingSizeGrams: true,
  source: true,
  additionalInfo: true,
  cpdRelevantTags: true,
});

export const insertUserFoodPreferenceSchema = createInsertSchema(userFoodPreferences).pick({
  userId: true,
  foodItemId: true,
  isFavourite: true,
  isRestricted: true,
  viewCount: true,
  lastViewed: true,
});

// Define Food Database types
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItems.$inferSelect;

export type InsertUserFoodPreference = z.infer<typeof insertUserFoodPreferenceSchema>;
export type UserFoodPreference = typeof userFoodPreferences.$inferSelect;
