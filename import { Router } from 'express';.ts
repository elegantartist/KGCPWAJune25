import { Router } from 'express';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { userCreationService } from '../services/userCreationService';
import { z } from 'zod';

const doctorRouter = Router();

// All routes in this file are protected and require 'doctor' role.
doctorRouter.use(authMiddleware(['doctor']));

/**
 * GET /api/doctor/patients
 * Fetches all patients assigned to the currently logged-in doctor.
 */
doctorRouter.get('/patients', async (req: AuthenticatedRequest, res) => {
  try {
    const doctorId = req.user!.id; // Assuming the user ID corresponds to the doctor's user ID

    // This is a simplified query. You'll need to join with the users table
    // to get all the details required by the frontend.
    const patients = await db.query.patients.findMany({
      where: eq(schema.patients.doctorId, doctorId),
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
        // TODO: Implement alertStatus logic
        alertStatus: 'ok',
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

doctorRouter.post('/create-patient', async (req: AuthenticatedRequest, res) => {
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

// TODO: Implement the /api/doctor/setup/* routes for doctor account activation.

export default doctorRouter;