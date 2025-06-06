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
        isActive: true, // Patient is active upon creation by a doctor
      }).returning();

      const [newPatient] = await tx.insert(schema.patients).values({
        userId: newUser.id,
        doctorId: doctor.id,
      }).returning();
      
      return { ...newPatient, user: newUser };
    });
  },
  getPatientsForDoctor: async (doctorUserId: number) => {
    const doctor = await storage.getDoctorByUserId(doctorUserId);
    if (!doctor) return [];
    
    // This query joins patients with users to get their details
    const patients = await db.select({
        id: schema.patients.id,
        userId: schema.patients.userId,
        name: schema.users.name,
        email: schema.users.email
    })
    .from(schema.patients)
    .innerJoin(schema.users, eq(schema.patients.userId, schema.users.id))
    .where(eq(schema.patients.doctorId, doctor.id));

    return patients;
  }
};

export function registerRoutes(app: Express) {
    const router = Router();

    // --- AUTHENTICATION FLOW (SMS & Token Issuance) ---
    router.post('/auth/verify-sms', async (req, res) => {
        const { email, smsCode } = req.body;
        // This is where your real SMS code verification logic must go.
        // We will assume the code is valid if the user exists.
        const user = await storage.getUserByEmail(email);

        if (!user || !smsCode) { // Replace !smsCode with actual verification result
            return res.status(401).json({ message: 'Invalid verification code or email' });
        }
        
        const accessToken = createAccessToken({ userId: user.id, role: user.role });
        return res.json({ access_token: accessToken, user: { id: user.id, name: user.name, role: user.role } });
    });

    // --- SECURE API ENDPOINTS ---
    
    // GET CURRENT USER: Securely get the logged-in user's details
    router.get('/users/me', authMiddleware(), async (req: AuthenticatedRequest, res) => {
        const currentUser = req.user!;
        const userData = await db.query.users.findFirst({
            where: eq(schema.users.id, currentUser.userId),
            columns: { passwordHash: false } // Exclude sensitive data
        });

        if (!userData) return res.status(404).json({ message: "User not found" });
        res.json(userData);
    });

    // GET DOCTOR'S PATIENTS: Securely get ONLY the logged-in doctor's patients
    router.get('/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        const doctorUserId = req.user!.userId;
        const patients = await storage.getPatientsForDoctor(doctorUserId);
        res.json(patients);
    });

    // CREATE PATIENT: Securely create a new patient under the logged-in doctor's ownership
    router.post('/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const newPatient = await storage.createPatientAndLinkToDoctor(req.body, req.user!.userId);
            res.status(201).json(newPatient);
        } catch (error: any) {
            res.status(400).json({ message: error.message || "Failed to create patient" });
        }
    });
    
    // GET PATIENT DATA: Securely get the logged-in patient's own data
    router.get('/patients/me/data', authMiddleware(['patient']), async (req: AuthenticatedRequest, res) => {
        const patientUserId = req.user!.userId;
        // This query finds the patient profile and joins all related data
        const patientData = await db.query.patients.findFirst({
            where: eq(schema.patients.userId, patientUserId),
            with: { 
                user: { columns: { name: true, email: true } },
                carePlanDirectives: true,
                healthMetrics: { orderBy: (m, { desc }) => [desc(m.date)], limit: 30 }
            }
        });

        if (!patientData) return res.status(404).json({ message: "Patient data not found." });
        res.json(patientData);
    });

    app.use('/api', router);
}