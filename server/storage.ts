import { 
  users, type User, type InsertUser,
  doctors, type Doctor, type InsertDoctor,
  patients, type Patient, type InsertPatient,
  healthMetrics, type HealthMetric, type InsertHealthMetric,
  carePlanDirectives, type CarePlanDirective, type InsertCarePlanDirective
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Doctor operations
  getDoctor(id: number): Promise<Doctor | undefined>;
  getDoctorByUserId(userId: number): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  
  // Patient operations
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: number): Promise<Patient | undefined>;
  getPatientsForDoctor(doctorId: number): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  
  // Health metrics operations
  getHealthMetricsForPatient(patientId: number): Promise<HealthMetric[]>;
  createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric>;
  
  // Care Plan Directive operations
  getCarePlanDirectivesForPatient(patientId: number): Promise<CarePlanDirective[]>;
  createCarePlanDirective(directive: InsertCarePlanDirective): Promise<CarePlanDirective>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getDoctor(id: number): Promise<Doctor | undefined> {
    const result = await db.select().from(doctors).where(eq(doctors.id, id));
    return result[0];
  }

  async getDoctorByUserId(userId: number): Promise<Doctor | undefined> {
    const result = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return result[0];
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const result = await db.insert(doctors).values(doctor).returning();
    return result[0];
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id));
    return result[0];
  }

  async getPatientByUserId(userId: number): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.userId, userId));
    return result[0];
  }

  async getPatientsForDoctor(doctorId: number): Promise<Patient[]> {
    return await db.select().from(patients).where(eq(patients.doctorId, doctorId));
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const result = await db.insert(patients).values(patient).returning();
    return result[0];
  }

  async getHealthMetricsForPatient(patientId: number): Promise<HealthMetric[]> {
    return await db.select().from(healthMetrics)
      .where(eq(healthMetrics.patientId, patientId))
      .orderBy(desc(healthMetrics.date));
  }

  async createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric> {
    const result = await db.insert(healthMetrics).values(metric).returning();
    return result[0];
  }

  async getCarePlanDirectivesForPatient(patientId: number): Promise<CarePlanDirective[]> {
    return await db.select().from(carePlanDirectives)
      .where(eq(carePlanDirectives.patientId, patientId));
  }

  async createCarePlanDirective(directive: InsertCarePlanDirective): Promise<CarePlanDirective> {
    const result = await db.insert(carePlanDirectives).values(directive).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();