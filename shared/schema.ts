// In shared/schema.ts
import { pgTable, serial, text, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: text('role', { enum: ['admin', 'doctor', 'patient'] }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  passwordHash: text('password_hash'),
  uin: varchar('uin', { length: 20 }).unique(), // Unique Identification Number
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('pending_payment').notNull(),
  credits: integer('credits').default(0).notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
});

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),
});

export const carePlanDirectives = pgTable('care_plan_directives', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  directive: text('directive').notNull(),
  category: text('category').notNull(),
  active: boolean('active').default(true),
});

export const healthMetrics = pgTable('health_metrics', {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  date: timestamp("date").defaultNow().notNull(),
  medicationScore: integer("medication_score").notNull(),
  dietScore: integer("diet_score").notNull(),
  exerciseScore: integer("exercise_score").notNull(),
});

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  dataType: text('data_type'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const progressMilestones = pgTable('progress_milestones', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // e.g., 'Engagement', 'Health'
  progress: integer('progress').default(0).notNull(), // e.g., 0-100
  isCompleted: boolean('is_completed').default(false).notNull(),
  iconType: varchar('icon_type', { length: 50 }).default('Trophy').notNull(), // 'Trophy', 'Star', 'Award'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminAlerts = pgTable('admin_alerts', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  message: text('message'),
  isResolved: boolean('is_resolved').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});