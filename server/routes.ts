import { Router } from 'express';
import type { Express } from 'express';
import { db } from './db';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { createAccessToken, authMiddleware, AuthenticatedRequest } from './auth';

// A lightweight data access layer for clarity
const storage = {
  getUserByEmail: async (email: string) => db.query.users.findFirst({ where: eq(schema.users.email, email) }),
  getDoctorByUserId: async (userId: number) => db.query.doctors.findFirst({ where: eq(schema.doctors.userId, userId) }),
  createPatientAndLinkToDoctor: async (patientData: { name: string, email: string, phoneNumber: string }, doctorUserId: number) => {
    const doctor = await storage.getDoctorByUserId(doctorUserId);
    if (!doctor) throw new Error("Doctor profile not found for the logged-in user.");

    return db.transaction(async (tx) => {
      const [newUser] = await tx.insert(schema.users).values({
        name: patientData.name,
        email: patientData.email,
        phoneNumber: patientData.phoneNumber,
        role: 'patient',
        isActive: true,
      }).returning();

      const [newPatient] = await tx.insert(schema.patients).values({
        userId: newUser.id,
        doctorId: doctor.id,
      }).returning();
      return { ...newPatient, ...newUser };
    });
  },
  getPatientsForDoctor: async (doctorUserId: number) => {
    const doctor = await storage.getDoctorByUserId(doctorUserId);
    if (!doctor) return [];

    return await db.select({
      id: schema.patients.id,
      userId: schema.patients.userId,
      doctorId: schema.patients.doctorId,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        phoneNumber: schema.users.phoneNumber,
        isActive: schema.users.isActive
      }
    })
    .from(schema.patients)
    .innerJoin(schema.users, eq(schema.patients.userId, schema.users.id))
    .where(eq(schema.patients.doctorId, doctor.id));
  }
};

export function registerRoutes(app: Express) {
    const router = Router();

    // --- AUTHENTICATION FLOW ---
    router.post('/auth/verify-sms', async (req, res) => {
        const { email, smsCode } = req.body;
        // Your real SMS code verification logic must go here.
        // This is a placeholder for the logic that confirms the code is correct.
        const isCodeValid = true; 
        const user = await storage.getUserByEmail(email);

        if (!user || !isCodeValid) {
            return res.status(401).json({ message: 'Invalid verification code or email' });
        }
        
        const accessToken = createAccessToken({ userId: user.id, role: user.role });
        res.json({ access_token: accessToken, user: { id: user.id, name: user.name, role: user.role } });
    });

    // --- SECURE, UNIFIED ENDPOINT FOR USER CONTEXT ---
    router.get('/users/me', authMiddleware(), async (req: AuthenticatedRequest, res) => {
        const currentUser = req.user!;
        const userData = await db.query.users.findFirst({
            where: eq(schema.users.id, currentUser.userId),
            columns: { passwordHash: false } // Exclude sensitive fields
        });

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(userData);
    });

    // --- SECURE DOCTOR ENDPOINTS ---
    router.get('/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        const doctorUserId = req.user!.userId;
        const patients = await storage.getPatientsForDoctor(doctorUserId);
        res.json(patients);
    });

    router.post('/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const newPatient = await storage.createPatientAndLinkToDoctor(req.body, req.user!.userId);
            res.status(201).json(newPatient);
        } catch (error: any) {
            res.status(400).json({ message: error.message || "Failed to create patient." });
        }
    });

    // --- SECURE PATIENT ENDPOINTS ---
    router.get('/patients/me/data', authMiddleware(['patient']), async (req: AuthenticatedRequest, res) => {
        const patientUserId = req.user!.userId;
        const patientData = await db.select({
          id: schema.patients.id,
          userId: schema.patients.userId,
          doctorId: schema.patients.doctorId,
          user: {
            name: schema.users.name,
            email: schema.users.email
          }
        })
        .from(schema.patients)
        .innerJoin(schema.users, eq(schema.patients.userId, schema.users.id))
        .where(eq(schema.patients.userId, patientUserId))
        .limit(1);

        if (!patientData.length) {
            return res.status(404).json({ message: "Patient data not found." });
        }
        res.json(patientData[0]);
    });

    app.use('/api', router);
}