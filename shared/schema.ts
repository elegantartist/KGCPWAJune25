import { pgTable, serial, text, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Central table for ALL user login and role information.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  passwordHash: text('password_hash'), // For admin username/password login
  role: text('role', { enum: ['admin', 'doctor', 'patient'] }).notNull(),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table for doctor-specific data, linked to a user account.
export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Add any other doctor-specific fields here, e.g., qualifications, practice name.
});

// Table for patient-specific data, linked to a user account AND a doctor.
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // THIS IS THE CRITICAL OWNERSHIP LINK.
  doctorId: integer('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  // Add any other patient-specific fields here.
});

// Care Plan Directives linked to a patient.
export const carePlanDirectives = pgTable('care_plan_directives', {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    dietDirective: text('diet_directive'),
    exerciseDirective: text('exercise_directive'),
    medicationDirective: text('medication_directive'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Health metrics linked to a patient.
export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  date: timestamp("date").defaultNow().notNull(),
  medicationScore: integer("medication_score").notNull(),
  dietScore: integer("diet_score").notNull(),
  exerciseScore: integer("exercise_score").notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertDoctorSchema = createInsertSchema(doctors);
export const insertPatientSchema = createInsertSchema(patients);
export const insertCarePlanDirectiveSchema = createInsertSchema(carePlanDirectives);
export const insertHealthMetricSchema = createInsertSchema(healthMetrics);

// TypeScript types for type safety
export type User = typeof users.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type CarePlanDirective = typeof carePlanDirectives.$inferSelect;
export type HealthMetric = typeof healthMetrics.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertCarePlanDirective = z.infer<typeof insertCarePlanDirectiveSchema>;
export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;