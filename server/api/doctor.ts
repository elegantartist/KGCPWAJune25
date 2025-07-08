import { Router, NextFunction } from 'express';
import { db } from '../db';
import * as schema from '@shared/schema';
import { getPatientProgressReportById } from '../services/pprService';
import { eq, and, gt } from 'drizzle-orm';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { userCreationService } from '../services/userCreationService';
import { logger } from '../lib/logger';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const doctorRouter = Router();

/**
 * GET /api/doctor/patients
 * Fetches all patients assigned to the currently logged-in doctor.
 */
doctorRouter.get('/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res, next: NextFunction) => {
  try {
    logger.info("Fetching patients for doctor", { doctorId: req.user!.id });
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
    next(error);
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

doctorRouter.post('/create-patient', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res, next: NextFunction) => {
    try {
        logger.info("Doctor creating new patient", { doctorId: req.user!.id, patientEmail: req.body.email });
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
        next(error);
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
doctorRouter.post('/setup/validate-token', async (req, res, next: NextFunction) => {
    try {
        logger.info("Validating doctor setup token");
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
        next(error);
    }
});

/**
 * POST /api/doctor/setup/send-verification
 * Generates and sends a 6-digit verification code to the doctor's phone.
 */
doctorRouter.post('/setup/send-verification', async (req, res, next: NextFunction) => {
    try {
        logger.info("Sending phone verification code for doctor setup");
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
        logger.info(`SMS for ${user.phoneNumber}: Your KGC verification code is ${verificationCode}`);

        res.json({ success: true, message: 'Verification code sent.' });
    } catch (error) {
        next(error);
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
doctorRouter.post('/setup/verify-phone', async (req, res, next: NextFunction) => {
    try {
        logger.info("Verifying phone code for doctor setup");
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
        next(error);
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
doctorRouter.post('/setup/complete', async (req, res, next: NextFunction) => {
    try {
        logger.info("Completing doctor account setup");
        const { token, password } = completeSetupSchema.parse(req.body);
        const user = await db.query.users.findFirst({ where: and(eq(schema.users.setupToken, token), eq(schema.users.isPhoneVerified, true)) });
        if (!user) {
            return res.status(400).json({ error: 'Invalid token or phone not verified. Please complete all steps.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await db.update(schema.users).set({ passwordHash, isActive: true, setupToken: null, setupTokenExpiresAt: null }).where(eq(schema.users.id, user.id));

        res.json({ success: true, message: 'Account setup complete. You can now log in.' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/doctor/reports/:reportId
 * Fetches a single Patient Progress Report by its ID.
 */
doctorRouter.get('/reports/:reportId', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res, next: NextFunction) => {
    try {
        const reportId = parseInt(req.params.reportId, 10);
        const doctorId = req.user!.id;

        const report = await getPatientProgressReportById(reportId);

        // Security Check: Ensure the doctor requesting the report is the one who created it
        // or is otherwise authorized to view it.
        if (report.createdById !== doctorId) {
            // A more robust check might involve checking if the doctor is currently assigned to the patient.
            // For now, we check if the creator matches.
            logger.warn('Doctor attempted to access a report they did not create', { doctorId, reportId, creatorId: report.createdById });
            return res.status(403).json({ error: 'You are not authorized to view this report.' });
        }

        res.json(report);
    } catch (error) {
        next(error);
    }
});

export default doctorRouter;