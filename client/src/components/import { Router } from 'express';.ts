import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../auth'; // Assuming auth middleware from your project
import { db } from '../db'; // Assuming Drizzle DB setup
import * as schema from '@shared/schema'; // Assuming shared DB schema
import { eq, and, desc } from 'drizzle-orm';
import { userCreationService } from '../services/userCreationService'; // Assuming this service exists

const doctorRouter = Router();

// Apply authentication middleware to all routes in this file, ensuring only doctors can access them.
doctorRouter.use(authMiddleware(['doctor']));

/**
 * GET /api/doctor/patients
 * Fetches a list of patients assigned to the currently logged-in doctor.
 * This powers the main table in the DoctorDashboard.
 */
doctorRouter.get('/patients', async (req: AuthenticatedRequest, res) => {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(schema.doctors.userId, req.user!.userId),
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor record not found for the logged-in user.' });
    }

    const patients = await db
      .select({
        id: schema.patients.id,
        name: schema.users.name,
        email: schema.users.email,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt,
        // This is a placeholder. The alert logic will be implemented in a separate backend service.
        alertStatus: schema.patients.alertStatus,
      })
      .from(schema.patients)
      .leftJoin(schema.users, eq(schema.patients.userId, schema.users.id))
      .where(eq(schema.patients.doctorId, doctor.id));

    res.json(patients);
  } catch (error) {
    console.error('Error fetching doctor patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/doctor/create-patient
 * Creates a new patient account and assigns them to the logged-in doctor.
 * This is called from the "Create New Patient" dialog in the DoctorDashboard.
 */
doctorRouter.post('/create-patient', async (req: AuthenticatedRequest, res) => {
    try {
        const { name, email, phoneNumber } = req.body;

        if (!name || !email || !phoneNumber) {
            return res.status(400).json({ error: 'Name, email, and phone number are required.' });
        }

        const doctor = await db.query.doctors.findFirst({
            where: eq(schema.doctors.userId, req.user!.userId)
        });

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor record not found.' });
        }

        if (await userCreationService.emailExists(email)) {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }

        const result = await userCreationService.createPatient({
            name,
            email,
            phoneNumber,
            role: 'patient',
            doctorId: doctor.id
        });

        res.status(201).json({ message: 'Patient created successfully', patient: result.patient });

    } catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ error: 'Failed to create patient account.' });
    }
});

/**
 * GET /api/doctor/patients/:patientId
 * Fetches the complete profile for a single patient, including health metrics and CPDs.
 * This is the primary data source for the PatientProfilePage.
 */
doctorRouter.get('/patients/:patientId', async (req: AuthenticatedRequest, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    const doctorUserId = req.user!.userId;

    // Security Check: Verify the doctor has access to this patient.
    const doctor = await db.query.doctors.findFirst({ where: eq(schema.doctors.userId, doctorUserId) });
    if (!doctor) return res.status(404).json({ error: 'Doctor record not found.' });

    const patientUser = await db.query.patients.findFirst({
      where: and(eq(schema.patients.id, patientId), eq(schema.patients.doctorId, doctor.id)),
      with: {
        user: { columns: { name: true, email: true, createdAt: true } },
      },
    });

    if (!patientUser || !patientUser.user) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to this patient.' });
    }

    // Fetch related data
    const healthMetrics = await db.query.healthMetrics.findMany({
      where: eq(schema.healthMetrics.patientId, patientId),
      orderBy: [desc(schema.healthMetrics.date)],
      limit: 30, // Get the last 30 entries for the chart
    });

    const carePlanDirectives = await db.query.carePlanDirectives.findFirst({
      where: eq(schema.carePlanDirectives.patientId, patientId),
    });

    // Assemble the final profile object for the frontend
    const patientProfile = {
      id: patientUser.id,
      name: patientUser.user.name,
      email: patientUser.user.email,
      createdAt: patientUser.user.createdAt,
      healthMetrics: healthMetrics.map(m => ({ ...m, date: m.date.toISOString().split('T')[0] })), // Format date as YYYY-MM-DD
      carePlanDirectives: {
        healthy_eating_plan: carePlanDirectives?.healthyEatingPlan ?? '',
        exercise_wellness_routine: carePlanDirectives?.exerciseWellnessRoutine ?? '',
        prescribed_medication: carePlanDirectives?.prescribedMedication ?? '',
      },
    };

    res.json(patientProfile);
  } catch (error) {
    console.error(`Error fetching patient profile for ID ${req.params.patientId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/doctor/patients/:patientId/cpds
 * Updates the Care Plan Directives for a specific patient.
 * This is called when the doctor saves the CPD form on the PatientProfilePage.
 */
doctorRouter.put('/patients/:patientId/cpds', async (req: AuthenticatedRequest, res) => {
    try {
        const patientId = parseInt(req.params.patientId, 10);
        const doctorUserId = req.user!.userId;
        const { healthy_eating_plan, exercise_wellness_routine, prescribed_medication } = req.body;

        // Security Check: Verify doctor has access to this patient
        const doctor = await db.query.doctors.findFirst({ where: eq(schema.doctors.userId, doctorUserId) });
        if (!doctor) return res.status(404).json({ error: 'Doctor record not found.' });

        const patient = await db.query.patients.findFirst({
            where: and(eq(schema.patients.id, patientId), eq(schema.patients.doctorId, doctor.id))
        });
        if (!patient) return res.status(403).json({ error: 'Access denied to this patient.' });

        // Upsert logic: Update if exists, otherwise insert.
        await db.insert(schema.carePlanDirectives)
            .values({
                patientId: patientId,
                healthyEatingPlan: healthy_eating_plan,
                exerciseWellnessRoutine: exercise_wellness_routine,
                prescribedMedication: prescribed_medication,
            })
            .onConflictDoUpdate({
                target: schema.carePlanDirectives.patientId,
                set: {
                    healthyEatingPlan: healthy_eating_plan,
                    exerciseWellnessRoutine: exercise_wellness_routine,
                    prescribedMedication: prescribed_medication,
                    updatedAt: new Date(),
                }
            });

        res.json({ message: 'Care Plan Directives updated successfully.' });
    } catch (error) {
        console.error(`Error updating CPDs for patient ID ${req.params.patientId}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default doctorRouter;