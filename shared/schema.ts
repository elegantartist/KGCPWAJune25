import { pgTable, serial, text, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// This central table holds login information for ALL users, simplifying authentication.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  // Password hash is for admin only. Doctors/Patients use passwordless SMS.
  passwordHash: text('password_hash'), 
  role: text('role', { enum: ['admin', 'doctor', 'patient'] }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  isActive: boolean('is_active').default(false), // Accounts are inactive until verified
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// This table holds data specific to doctors.
export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  // This links the doctor profile to a user login.
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fullName: varchar('full_name', { length: 255 }),
  // Add any other doctor-specific fields here
});

// This table holds data specific to patients and creates the ownership link.
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  // This links the patient profile to a user login.
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // THIS IS THE CRITICAL OWNERSHIP LINK.
  doctorId: integer('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  fullName: varchar('full_name', { length: 255 }),
  // Add any other patient-specific fields here
});

// This table holds the Care Plan Directives (CPDs) for each patient.
export const carePlanDirectives = pgTable('care_plan_directives', {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    dietDirective: text('diet_directive'),
    exerciseDirective: text('exercise_directive'),
    medicationDirective: text('medication_directive'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Link health metrics to patients table instead of users directly
export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  date: timestamp("date").defaultNow().notNull(),
  medicationScore: integer("medication_score").notNull(),
  dietScore: integer("diet_score").notNull(),
  exerciseScore: integer("exercise_score").notNull(),
});

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertDoctorSchema = createInsertSchema(doctors);
export const insertPatientSchema = createInsertSchema(patients);
export const insertCarePlanDirectiveSchema = createInsertSchema(carePlanDirectives);
export const insertHealthMetricSchema = createInsertSchema(healthMetrics);

// Select types
export type User = typeof users.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type CarePlanDirective = typeof carePlanDirectives.$inferSelect;
export type HealthMetric = typeof healthMetrics.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertCarePlanDirective = z.infer<typeof insertCarePlanDirectiveSchema>;
export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;