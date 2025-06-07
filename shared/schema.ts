// In shared/schema.ts
import { pgTable, serial, text, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: text('role', { enum: ['admin', 'doctor', 'patient'] }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  passwordHash: text('password_hash'),
  isActive: boolean('is_active').default(true),
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