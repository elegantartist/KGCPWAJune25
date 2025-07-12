import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  role: text('role'),
  passwordHash: text('password_hash'),
  phoneNumber: text('phone_number'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  uin: text('uin'),
  credits: integer('credits').default(0),
  stripeCustomerId: text('stripe_customer_id')
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
});

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  doctorId: integer('doctor_id')
});

export const healthMetrics = pgTable('health_metrics', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id'),
  date: timestamp('date').defaultNow(),
  medicationScore: integer('medication_score'),
  dietScore: integer('diet_score'),
  exerciseScore: integer('exercise_score')
});

export const carePlanDirectives = pgTable('care_plan_directives', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id'),
  category: text('category'),
  active: boolean('active').default(true)
});

export const adminAlerts = pgTable('admin_alerts', {
  id: serial('id').primaryKey()
});