import { Router, Request, Response } from 'express';
import { db } from './db.js';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { createAccessToken, authMiddleware, AuthenticatedRequest } from './auth.js';
import type { Express } from 'express';

// Database interaction storage layer
const storage = {
    getUserByEmail: async (email: string) => {
        return await db.query.users.findFirst({ 
            where: eq(schema.users.email, email) 
        });
    },
    
    getDoctorByUserId: async (userId: number) => {
        return await db.query.doctors.findFirst({ 
            where: eq(schema.doctors.userId, userId) 
        });
    },
    
    createPatientAndLinkToDoctor: async (patientData: { name: string, email: string, phoneNumber: string }, doctorUserId: number) => {
        const doctor = await storage.getDoctorByUserId(doctorUserId);
        if (!doctor) throw new Error("Doctor not found");

        return await db.transaction(async (tx) => {
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
            
            return newPatient;
        });
    },
    
    getPatientsForDoctor: async (doctorUserId: number) => {
        const doctor = await storage.getDoctorByUserId(doctorUserId);
        if (!doctor) return [];
        
        return await db.select({
            id: schema.patients.id,
            userId: schema.patients.userId,
            doctorId: schema.patients.doctorId,
            name: schema.users.name,
            email: schema.users.email,
            phoneNumber: schema.users.phoneNumber,
            isActive: schema.users.isActive,
            createdAt: schema.users.createdAt
        })
        .from(schema.patients)
        .innerJoin(schema.users, eq(schema.patients.userId, schema.users.id))
        .where(eq(schema.patients.doctorId, doctor.id));
    }
};

// Main function to register all routes
export function registerRoutes(app: Express) {
    const router = Router();

    // --- AUTHENTICATION FLOW ---
    router.post('/api/auth/verify-sms', async (req, res) => {
        const { email, smsCode } = req.body;
        
        const user = await storage.getUserByEmail(email);

        if (!user || !smsCode) {
            return res.status(401).json({ message: 'Invalid verification code or email' });
        }
        
        const accessToken = createAccessToken({ userId: user.id, role: user.role });
        return res.json({ 
            access_token: accessToken, 
            user: { 
                id: user.id, 
                name: user.name, 
                role: user.role 
            } 
        });
    });

    // --- SECURE ENDPOINTS ---
    
    // Token validation endpoint
    router.get('/api/user/current-context', authMiddleware(), (req: AuthenticatedRequest, res) => {
        res.json({ user: req.user });
    });

    // Doctor getting ONLY their own patients
    router.get('/api/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        const doctorUserId = req.user!.userId;
        const patients = await storage.getPatientsForDoctor(doctorUserId);
        res.json(patients);
    });

    // Doctor creating a new patient under their ownership
    router.post('/api/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        const doctorUserId = req.user!.userId;
        const patientData = req.body;

        try {
            const newPatient = await storage.createPatientAndLinkToDoctor(patientData, doctorUserId);
            res.status(201).json(newPatient);
        } catch (error: any) {
            console.error("Error creating patient:", error);
            res.status(400).json({ message: error.message || "Failed to create patient" });
        }
    });
    
    // Patient getting their own secure data
    router.get('/api/patients/me/data', authMiddleware(['patient']), async (req: AuthenticatedRequest, res) => {
        const patientUserId = req.user!.userId;
        
        const patientData = await db.select({
            id: schema.patients.id,
            userId: schema.patients.userId,
            doctorId: schema.patients.doctorId,
            name: schema.users.name,
            email: schema.users.email,
            phoneNumber: schema.users.phoneNumber,
            isActive: schema.users.isActive,
            createdAt: schema.users.createdAt
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

    app.use(router);
    return Promise.resolve();
}