import { Router } from 'express';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { userCreationService } from '../services/userCreationService';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const doctorRouter = Router();

/**
 * GET /api/doctor/patients
 * Fetches all patients assigned to the currently logged-in doctor.
 */
doctorRouter.get('/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
  try {
    const doctorId = req.user!.id; // Assuming the user ID corresponds to the doctor's user ID

    // This is a simplified query. You'll need to join with the users table
    // to get all the details required by the frontend.
    const patients = await db.query.patients.findMany({
      where: eq(schema.patients.doctorId, doctorId),
      columns: {
        alertStatus: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true,
          }
        }
      }
    });

    // You may need to format this data to match the `Patient` interface on the frontend
    // including the `alertStatus`.
    const formattedPatients = patients.map(p => ({
      ...p.user,
      alertStatus: p.alertStatus,
    }));

    res.json(formattedPatients);
  } catch (error) {
    console.error("Error fetching doctor's patients:", error);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

/**
 * POST /api/doctor/create-patient
 * Creates a new patient account and assigns them to the logged-in doctor.
 */
const createPatientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().min(1),
});

doctorRouter.post('/create-patient', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
    try {
        const { name, email, phoneNumber } = createPatientSchema.parse(req.body);
        const doctorId = req.user!.id;

        if (await userCreationService.emailExists(email)) {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }

        // You may need to adjust createPatient to accept a doctorId from an authenticated doctor
        const result = await userCreationService.createPatient({
            name, email, phoneNumber, role: 'patient', doctorId
        });

        res.status(201).json({ message: 'Patient created successfully', patient: result.patient });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request format.', details: error.errors });
        }
        console.error("Error creating patient from doctor dashboard:", error);
        res.status(500).json({ error: 'Failed to create patient account.' });
    }
});

// --- Doctor Setup and Activation Routes ---

const tokenSchema = z.object({ token: z.string().min(10) });

/**
 * POST /api/doctor/setup/validate-token
 * Validates that a setup token from an email link is valid and not expired.
 */
// NOTE: The setup routes are intentionally public. They do not use the authMiddleware
// because the doctor is not logged in yet. They are secured by the unique,
// time-sensitive token sent to the doctor's email.
doctorRouter.post('/setup/validate-token', async (req, res) => {
    try {
        const { token } = tokenSchema.parse(req.body);
        const user = await db.query.users.findFirst({
            where: and(
                eq(schema.users.setupToken, token),
                gt(schema.users.setupTokenExpiresAt, new Date())
            )
        });

        if (!user) {
            return res.status(404).json({ error: 'Invalid or expired setup token.' });
        }

        res.json({ success: true, message: 'Token is valid.' });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request format.' });
        console.error("Error validating setup token:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /api/doctor/setup/send-verification
 * Generates and sends a 6-digit verification code to the doctor's phone.
 */
doctorRouter.post('/setup/send-verification', async (req, res) => {
    try {
        const { token } = tokenSchema.parse(req.body);
        const user = await db.query.users.findFirst({ where: eq(schema.users.setupToken, token) });
        if (!user || !user.phoneNumber) {
            return res.status(404).json({ error: 'User not found or no phone number on record.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.update(schema.users)
            .set({ phoneVerificationCode: verificationCode, phoneVerificationCodeExpiresAt: expiresAt })
            .where(eq(schema.users.id, user.id));

        // TODO: Integrate with a real SMS service (e.g., Twilio, SendGrid)
        console.log(`SMS for ${user.phoneNumber}: Your KGC verification code is ${verificationCode}`);

        res.json({ success: true, message: 'Verification code sent.' });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request format.' });
        console.error("Error sending verification code:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

const verifyPhoneSchema = z.object({
    token: z.string().min(10),
    code: z.string().length(6),
});

/**
 * POST /api/doctor/setup/verify-phone
 * Verifies the 6-digit code sent to the doctor's phone.
 */
doctorRouter.post('/setup/verify-phone', async (req, res) => {
    try {
        const { token, code } = verifyPhoneSchema.parse(req.body);
        const user = await db.query.users.findFirst({
            where: and(
                eq(schema.users.setupToken, token),
                eq(schema.users.phoneVerificationCode, code),
                gt(schema.users.phoneVerificationCodeExpiresAt, new Date())
            )
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification code.' });
        }

        await db.update(schema.users).set({ isPhoneVerified: true }).where(eq(schema.users.id, user.id));

        res.json({ success: true, message: 'Phone number verified successfully.' });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request format.' });
        console.error("Error verifying phone code:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

const completeSetupSchema = z.object({
    token: z.string().min(10),
    password: z.string().min(8, "Password must be at least 8 characters long."),
});

/**
 * POST /api/doctor/setup/complete
 * Finalizes the doctor's account by setting a password and activating the account.
 */
doctorRouter.post('/setup/complete', async (req, res) => {
    try {
        const { token, password } = completeSetupSchema.parse(req.body);
        const user = await db.query.users.findFirst({ where: and(eq(schema.users.setupToken, token), eq(schema.users.isPhoneVerified, true)) });
        if (!user) {
            return res.status(400).json({ error: 'Invalid token or phone not verified. Please complete all steps.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await db.update(schema.users).set({ passwordHash, isActive: true, setupToken: null, setupTokenExpiresAt: null }).where(eq(schema.users.id, user.id));

        res.json({ success: true, message: 'Account setup complete. You can now log in.' });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request format.', details: error.errors });
        console.error("Error completing doctor setup:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

export default doctorRouter;