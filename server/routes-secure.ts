import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from 'express';
import { storage } from "./storage";
import { createAccessToken, authMiddleware, type AuthenticatedRequest } from "./auth";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import bcrypt from "bcrypt";

export function registerSecureRoutes(app: Express): Server {
    const router = Router();

    // --- AUTHENTICATION FLOW ---

    // Step 1: Admin login with username/password
    router.post('/api/admin/login', async (req, res) => {
        const { email, password } = req.body;
        
        try {
            const user = await storage.getUserByEmail(email);
            if (!user || user.role !== 'admin' || !user.passwordHash) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const accessToken = createAccessToken({ userId: user.id, role: user.role });
            return res.json({ access_token: accessToken, user: { id: user.id, role: user.role, email: user.email } });
        } catch (error) {
            console.error('Admin login error:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Step 2: SMS verification for doctors/patients (existing SMS logic would go here)
    router.post('/api/auth/verify-sms', async (req, res) => {
        const { email, smsCode } = req.body;
        
        // TODO: Add your SMS verification logic here
        const isCodeValid = true; // Placeholder - implement actual SMS verification

        if (isCodeValid) {
            const user = await storage.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            const accessToken = createAccessToken({ userId: user.id, role: user.role });
            return res.json({ access_token: accessToken, user: { id: user.id, role: user.role, email: user.email } });
        } else {
            return res.status(401).json({ message: 'Invalid verification code' });
        }
    });

    // --- SECURE ENDPOINTS ---

    // Current user context endpoint
    router.get('/api/user/current-context', authMiddleware(), (req: AuthenticatedRequest, res) => {
        // The authMiddleware already validated the token and attached the user to req.user
        res.json({ user: req.user });
    });

    // Secure endpoint for a doctor to get ONLY their own patients
    router.get('/api/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const doctorUserId = req.user!.userId;
            
            // Get the doctor profile first
            const doctor = await storage.getDoctorByUserId(doctorUserId);
            if (!doctor) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            // Get patients belonging to this doctor
            const patients = await storage.getPatientsForDoctor(doctor.id);
            res.json(patients);
        } catch (error) {
            console.error('Error fetching doctor patients:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Secure endpoint for a doctor to add a new patient under their ownership
    router.post('/api/doctors/me/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const doctorUserId = req.user!.userId;
            const { fullName, email, phoneNumber } = req.body;

            // Get the doctor profile
            const doctor = await storage.getDoctorByUserId(doctorUserId);
            if (!doctor) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            // Create user account for patient
            const newUser = await storage.createUser({
                email,
                name: fullName,
                phoneNumber,
                role: 'patient',
                isActive: true
            });

            // Create patient profile linked to this doctor
            const newPatient = await storage.createPatient({
                userId: newUser.id,
                doctorId: doctor.id,
                fullName
            });

            res.status(201).json(newPatient);
        } catch (error) {
            console.error('Error creating patient:', error);
            res.status(500).json({ message: 'Failed to create patient' });
        }
    });

    // Secure endpoint for a patient to get their own data
    router.get('/api/patients/me/data', authMiddleware(['patient']), async (req: AuthenticatedRequest, res) => {
        try {
            const patientUserId = req.user!.userId;
            
            // Get the patient profile
            const patient = await storage.getPatientByUserId(patientUserId);
            if (!patient) {
                return res.status(404).json({ message: "Patient profile not found" });
            }

            // Get patient's health metrics and care plan directives
            const healthMetrics = await storage.getHealthMetricsForPatient(patient.id);
            const carePlanDirectives = await storage.getCarePlanDirectivesForPatient(patient.id);

            res.json({
                patient,
                healthMetrics,
                carePlanDirectives
            });
        } catch (error) {
            console.error('Error fetching patient data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Secure endpoint for admin to get all doctors
    router.get('/api/admin/doctors', authMiddleware(['admin']), async (req: AuthenticatedRequest, res) => {
        try {
            // Get all doctors with their user information
            const doctors = await db.select({
                id: schema.doctors.id,
                name: schema.users.name,
                userId: schema.doctors.userId,
                email: schema.users.email,
                phoneNumber: schema.users.phoneNumber,
                isActive: schema.users.isActive,
                createdAt: schema.users.createdAt
            })
            .from(schema.doctors)
            .leftJoin(schema.users, eq(schema.doctors.userId, schema.users.id))
            .where(eq(schema.users.role, 'doctor'));

            res.json(doctors);
        } catch (error) {
            console.error('Error fetching doctors:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Secure endpoint for admin to get all patients
    router.get('/api/admin/patients', authMiddleware(['admin']), async (req: AuthenticatedRequest, res) => {
        try {
            // Get all patients with their user information
            const patients = await db.select({
                id: schema.patients.id,
                name: schema.users.name,
                userId: schema.patients.userId,
                doctorId: schema.patients.doctorId,
                email: schema.users.email,
                phoneNumber: schema.users.phoneNumber,
                isActive: schema.users.isActive,
                createdAt: schema.users.createdAt
            })
            .from(schema.patients)
            .leftJoin(schema.users, eq(schema.patients.userId, schema.users.id))
            .where(eq(schema.users.role, 'patient'));

            res.json(patients);
        } catch (error) {
            console.error('Error fetching patients:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    app.use(router);
    
    const server = createServer(app);
    return server;
}

// Helper function to create patient and link to doctor (for complex operations)
export async function createPatientAndLinkToDoctor(patientData: any, doctorUserId: number) {
    try {
        // Get the doctor profile
        const doctor = await storage.getDoctorByUserId(doctorUserId);
        if (!doctor) {
            throw new Error("Doctor not found");
        }

        // Create user account for patient
        const newUser = await storage.createUser({
            email: patientData.email,
            name: patientData.fullName,
            phoneNumber: patientData.phoneNumber,
            role: 'patient',
            isActive: true
        });

        // Create patient profile linked to this doctor
        const newPatient = await storage.createPatient({
            userId: newUser.id,
            doctorId: doctor.id,
            fullName: patientData.fullName
        });

        return newPatient;
    } catch (error) {
        console.error('Error in createPatientAndLinkToDoctor:', error);
        return null;
    }
}