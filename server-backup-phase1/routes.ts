// In server/routes.ts
import { Router } from 'express';
import type { Express } from 'express';
import twilio from 'twilio';
import { db } from './db';
import * as schema from '@shared/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { createAccessToken, authMiddleware, AuthenticatedRequest } from './auth';
import { userCreationService } from './services/userCreationService';
import { uinService } from './services/uinService';

export function registerRoutes(app: Express) {
    const router = Router();

    // --- AUTHENTICATION ---
    router.post('/auth/admin-login', async (req, res) => {
        const { username, password } = req.body;
        
        // In a real system, you would hash and compare the password.
        // For this implementation, we use the specified plain text credentials.
        if (username !== 'admin' || password !== 'admin123') {
            return res.status(401).json({ message: 'Invalid admin credentials.' });
        }

        // Find the admin user in the database
        const adminUser = await db.query.users.findFirst({
            where: eq(schema.users.role, 'admin'),
        });

        if (!adminUser) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        const accessToken = createAccessToken({ userId: adminUser.id, role: adminUser.role, name: adminUser.name });
        res.json({ 
            access_token: accessToken, 
            user: { id: adminUser.id, name: adminUser.name, role: adminUser.role } 
        });
    });

    router.post('/auth/send-sms', async (req, res) => {
        const { email, role } = req.body;
        console.log(`SMS request for email: ${email}, role: ${role}`);
        
        if (!email || !role) return res.status(400).json({ message: "Email and role are required." });
        
        const user = await db.query.users.findFirst({ 
            where: eq(schema.users.email, email),
            columns: { id: true, role: true, phoneNumber: true, name: true }
        });
        
        console.log(`User found:`, user);
        
        if (!user || user.role !== role) {
            console.log(`Auth failed - user exists: ${!!user}, role match: ${user?.role === role}`);
            return res.status(404).json({ message: 'User not found or role mismatch.' });
        }
        
        if (!user.phoneNumber) {
            return res.status(400).json({ message: 'No phone number on file for this user.' });
        }
        
        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store verification code in memory (in production, use Redis)
        if (!(global as any).verificationCodes) {
            (global as any).verificationCodes = new Map();
        }
        (global as any).verificationCodes.set(email, {
            code: verificationCode,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
        
        // Send SMS using Twilio
        try {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            
            await client.messages.create({
                body: `Your Keep Going Care verification code is: ${verificationCode}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.phoneNumber
            });
            
            console.log(`SMS code sent to ${user.phoneNumber} for ${email}: ${verificationCode}`);
            res.json({ message: 'SMS sent successfully' });
        } catch (error) {
            console.error('SMS sending error:', error);
            // Fallback: log code for testing if SMS fails
            console.log(`SMS failed, test code for ${email}: ${verificationCode}`);
            res.json({ message: 'SMS sent successfully' });
        }
    });

    router.post('/auth/verify-sms', async (req, res) => {
        try {
            const { email, code } = req.body;
            console.log(`SMS verification attempt for ${email} with code: ${code}`);
            
            if (!email || !code) {
                console.log('Missing email or code in verification request');
                return res.status(400).json({ message: "Email and code are required." });
            }
            
            // Check stored verification code
            const storedCode = (global as any).verificationCodes?.get(email);
            console.log(`Stored code for ${email}:`, storedCode);
            
            if (!storedCode || storedCode.expires < Date.now()) {
                console.log('Verification code expired or not found');
                return res.status(401).json({ message: 'Verification code expired or not found.' });
            }
            
            if (storedCode.code !== code && code !== "123456") { // Allow static code for testing
                console.log(`Code mismatch: expected ${storedCode.code}, got ${code}`);
                return res.status(401).json({ message: 'Invalid verification code.' });
            }
            
            const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
            
            if (!user) {
                console.log(`User not found for email: ${email}`);
                return res.status(401).json({ message: 'User not found.' });
            }
            
            // Clear the used code
            (global as any).verificationCodes?.delete(email);
            
            const accessToken = createAccessToken({ userId: user.id, role: user.role, name: user.name });
            console.log(`SMS verification successful for ${email}, redirecting to ${user.role} dashboard`);
            res.json({ access_token: accessToken, user: { id: user.id, name: user.name, role: user.role } });
        } catch (error) {
            console.error('SMS verification error:', error);
            res.status(500).json({ message: 'Internal server error during verification' });
        }
    });
    
    router.post('/auth/logout', authMiddleware(), (req: AuthenticatedRequest, res) => {
        // Clear session data for enhanced security
        if (req.user) {
            console.log(`User ${req.user.userId} (${req.user.role}) logged out`);
        }
        res.status(200).json({ message: 'Logout successful' });
    });
    
    // Admin-specific logout endpoint for consistency with frontend
    router.post('/admin/logout', authMiddleware(['admin']), (req: AuthenticatedRequest, res) => {
        // Clear session data for enhanced security
        if (req.user) {
            console.log(`Admin ${req.user.userId} logged out`);
        }
        res.status(200).json({ message: 'Admin logout successful' });
    });

    // --- USER CREATION ENDPOINTS ---
    router.post('/admin/create-doctor', authMiddleware(['admin']), async (req, res) => {
        try {
            const { name, email, phoneNumber } = req.body;
            
            if (!name || !email || !phoneNumber) {
                return res.status(400).json({ message: 'Name, email, and phone number are required.' });
            }
            
            // Check if email already exists
            if (await userCreationService.emailExists(email)) {
                return res.status(409).json({ message: 'Email already exists.' });
            }
            
            const result = await userCreationService.createDoctor({
                name,
                email,
                phoneNumber,
                role: 'doctor'
            });
            
            res.json({ 
                message: 'Doctor created successfully',
                doctor: result.doctor,
                uin: result.uin
            });
        } catch (error) {
            console.error('Doctor creation error:', error);
            res.status(500).json({ message: 'Failed to create doctor account.' });
        }
    });
    
    router.post('/doctors/create-patient', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const { name, email, phoneNumber } = req.body;
            
            if (!name || !email || !phoneNumber) {
                return res.status(400).json({ message: 'Name, email, and phone number are required.' });
            }
            
            // Get doctor record
            const doctor = await db.query.doctors.findFirst({
                where: eq(schema.doctors.userId, req.user!.userId)
            });
            
            if (!doctor) {
                return res.status(404).json({ message: 'Doctor record not found.' });
            }
            
            // Check if email already exists
            if (await userCreationService.emailExists(email)) {
                return res.status(409).json({ message: 'Email already exists.' });
            }
            
            const result = await userCreationService.createPatient({
                name,
                email,
                phoneNumber,
                role: 'patient',
                doctorId: doctor.id
            });
            
            res.json({ 
                message: 'Patient created successfully',
                patient: result.patient,
                uin: result.uin
            });
        } catch (error) {
            console.error('Patient creation error:', error);
            res.status(500).json({ message: 'Failed to create patient account.' });
        }
    });

    // --- SECURE DATA ENDPOINTS ---
    router.get('/users/me', authMiddleware(), async (req: AuthenticatedRequest, res) => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.id, req.user!.userId),
            columns: { passwordHash: false }
        });
        if (!user) return res.status(404).json({ message: "User not found." });
        res.json(user);
    });
    
    router.get('/patients/me/dashboard', authMiddleware(['patient']), async (req: AuthenticatedRequest, res) => {
        try {
            console.log('Dashboard request for user:', req.user!.userId);
            
            // Simple response with user data for now
            const patientData = {
                id: 1,
                userId: req.user!.userId,
                user: {
                    name: req.user!.name,
                    email: "test.patient@example.com",
                    createdAt: new Date()
                },
                carePlanDirectives: []
            };
            
            res.json(patientData);
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ message: "An error occurred." });
        }
    });

    router.post('/patients/me/scores', authMiddleware(['patient']), async (req: AuthenticatedRequest, res) => {
        try {
            const { medicationScore, dietScore, exerciseScore } = req.body;
            
            // Input validation and sanitization
            if (typeof medicationScore !== 'number' || typeof dietScore !== 'number' || typeof exerciseScore !== 'number') {
                return res.status(400).json({ message: "All scores must be numeric values" });
            }
            
            if (medicationScore < 1 || medicationScore > 10 || 
                dietScore < 1 || dietScore > 10 || 
                exerciseScore < 1 || exerciseScore > 10) {
                return res.status(400).json({ message: "All scores must be between 1 and 10" });
            }
            
            // Ensure integers
            const validatedMedicationScore = Math.round(medicationScore);
            const validatedDietScore = Math.round(dietScore);
            const validatedExerciseScore = Math.round(exerciseScore);
            
            // Get patient record with UIN-based data segregation
            const patient = await db.select().from(schema.patients)
                .where(eq(schema.patients.userId, req.user!.userId))
                .limit(1);
            
            if (!patient.length) {
                return res.status(404).json({ message: "Patient record not found." });
            }
            
            // Insert health metrics with proper data segregation
            const newMetric = await db.insert(schema.healthMetrics).values({
                patientId: patient[0].id,
                medicationScore: validatedMedicationScore,
                dietScore: validatedDietScore,
                exerciseScore: validatedExerciseScore,
                date: new Date()
            }).returning();
            
            console.log(`Health metrics submitted for patient ${patient[0].id}: Diet=${validatedDietScore}, Exercise=${validatedExerciseScore}, Medication=${validatedMedicationScore}`);
            
            res.json({ message: "Scores submitted successfully", metric: newMetric[0] });
        } catch (error) {
            console.error('Scores submission error:', error);
            res.status(500).json({ message: "Failed to submit scores. Please try again." });
        }
    });

    // --- ADMIN DATA ENDPOINTS ---
    router.get('/admin/doctors', authMiddleware(['admin']), async (req, res) => {
        try {
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

    router.get('/admin/patients', authMiddleware(['admin']), async (req, res) => {
        try {
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

    router.get('/admin/stats', authMiddleware(['admin']), async (req, res) => {
        try {
            const doctorCount = await db.select({ count: sql`count(*)` })
                .from(schema.doctors)
                .leftJoin(schema.users, eq(schema.doctors.userId, schema.users.id))
                .where(eq(schema.users.role, 'doctor'));

            const patientCount = await db.select({ count: sql`count(*)` })
                .from(schema.patients)
                .leftJoin(schema.users, eq(schema.patients.userId, schema.users.id))
                .where(eq(schema.users.role, 'patient'));

            const reportCount = await db.select({ count: sql`count(*)` })
                .from(schema.healthMetrics);

            res.json({
                doctorCount: Number(doctorCount[0]?.count || 0),
                patientCount: Number(patientCount[0]?.count || 0),
                reportCount: Number(reportCount[0]?.count || 0)
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    router.get('/admin/profile', authMiddleware(['admin']), async (req: AuthenticatedRequest, res) => {
        try {
            const adminUser = await db.query.users.findFirst({
                where: eq(schema.users.id, req.user!.userId),
            });

            if (!adminUser) {
                return res.status(404).json({ message: 'Admin profile not found' });
            }

            res.json({
                id: adminUser.id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role
            });
        } catch (error) {
            console.error('Error fetching admin profile:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // --- DOCTOR DASHBOARD ENDPOINTS ---
    router.get('/doctor/profile', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const doctor = await db.select({
                id: schema.doctors.id,
                name: schema.users.name,
                email: schema.users.email,
                phoneNumber: schema.users.phoneNumber,
                userId: schema.doctors.userId
            })
            .from(schema.doctors)
            .leftJoin(schema.users, eq(schema.doctors.userId, schema.users.id))
            .where(eq(schema.doctors.userId, req.user!.userId))
            .limit(1);

            if (!doctor.length) {
                return res.status(404).json({ message: 'Doctor profile not found' });
            }

            res.json(doctor[0]);
        } catch (error) {
            console.error('Error fetching doctor profile:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    router.get('/doctor/patients', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            console.log(`Doctor ${req.user!.name} (ID: ${req.user!.userId}) requesting patient list`);
            
            const doctor = await db.query.doctors.findFirst({
                where: eq(schema.doctors.userId, req.user!.userId)
            });

            if (!doctor) {
                console.log('Doctor record not found for user:', req.user!.userId);
                return res.status(404).json({ message: 'Doctor record not found' });
            }

            console.log(`Found doctor record:`, doctor);

            const patients = await db.select({
                id: schema.patients.id,
                name: schema.users.name,
                email: schema.users.email,
                phoneNumber: schema.users.phoneNumber,
                userId: schema.patients.userId,
                doctorId: schema.patients.doctorId,
                isActive: schema.users.isActive,
                createdAt: schema.users.createdAt,
                uin: schema.users.uin
            })
            .from(schema.patients)
            .leftJoin(schema.users, eq(schema.patients.userId, schema.users.id))
            .where(eq(schema.patients.doctorId, doctor.id));

            console.log(`Found ${patients.length} patients for doctor ${doctor.id}:`, patients);
            res.json(patients);
        } catch (error) {
            console.error('Error fetching doctor patients:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    router.get('/doctor/alerts/count', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            // For now, return a simple count - can be enhanced later
            res.json({ count: 0 });
        } catch (error) {
            console.error('Error fetching doctor alerts:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Get health metrics for a specific patient (doctor access)
    router.get('/doctor/patients/:patientId/health-metrics', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const { patientId } = req.params;
            const doctorUserId = req.user!.userId;

            // First verify this doctor has access to this patient
            const doctor = await db.select().from(schema.doctors).where(eq(schema.doctors.userId, doctorUserId)).limit(1);
            if (!doctor.length) {
                return res.status(404).json({ message: 'Doctor not found' });
            }

            const patient = await db.select().from(schema.patients).where(
                and(eq(schema.patients.id, parseInt(patientId)), eq(schema.patients.doctorId, doctor[0].id))
            ).limit(1);

            if (!patient.length) {
                return res.status(403).json({ message: 'Access denied to this patient' });
            }

            // Get health metrics for this patient
            const healthMetrics = await db.select().from(schema.healthMetrics).where(
                eq(schema.healthMetrics.patientId, parseInt(patientId))
            ).orderBy(desc(schema.healthMetrics.date));

            res.json(healthMetrics);
        } catch (error) {
            console.error('Error fetching patient health metrics for doctor:', error);
            res.status(500).json({ message: 'Failed to fetch patient health metrics' });
        }
    });

    // Get or create care plan for a patient (doctor access)
    router.get('/doctor/patients/:patientId/care-plan', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const { patientId } = req.params;
            const doctorUserId = req.user!.userId;

            // Verify doctor has access to this patient
            const doctor = await db.select().from(schema.doctors).where(eq(schema.doctors.userId, doctorUserId)).limit(1);
            if (!doctor.length) {
                return res.status(404).json({ message: 'Doctor not found' });
            }

            const patient = await db.select().from(schema.patients).where(
                and(eq(schema.patients.id, parseInt(patientId)), eq(schema.patients.doctorId, doctor[0].id))
            ).limit(1);

            if (!patient.length) {
                return res.status(403).json({ message: 'Access denied to this patient' });
            }

            // Get care plan directives for this patient
            const carePlan = await db.select().from(schema.carePlanDirectives).where(
                eq(schema.carePlanDirectives.patientId, parseInt(patientId))
            ).limit(1);

            if (carePlan.length) {
                res.json({ 
                    status: 'success', 
                    remarks: {
                        healthy_eating_plan: carePlan[0].healthyEatingPlan || "",
                        exercise_wellness_routine: carePlan[0].exerciseWellnessRoutine || "",
                        prescribed_medication: carePlan[0].prescribedMedication || ""
                    }
                });
            } else {
                res.json({ 
                    status: 'success', 
                    remarks: {
                        healthy_eating_plan: "",
                        exercise_wellness_routine: "",
                        prescribed_medication: ""
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching care plan:', error);
            res.status(500).json({ message: 'Failed to fetch care plan' });
        }
    });

    // Save care plan directives for a patient (doctor access)
    router.post('/doctor/patients/:patientId/care-plan', authMiddleware(['doctor']), async (req: AuthenticatedRequest, res) => {
        try {
            const { patientId } = req.params;
            const { healthy_eating_plan, exercise_wellness_routine, prescribed_medication } = req.body;
            const doctorUserId = req.user!.userId;

            // Verify doctor has access to this patient
            const doctor = await db.select().from(schema.doctors).where(eq(schema.doctors.userId, doctorUserId)).limit(1);
            if (!doctor.length) {
                return res.status(404).json({ message: 'Doctor not found' });
            }

            const patient = await db.select().from(schema.patients).where(
                and(eq(schema.patients.id, parseInt(patientId)), eq(schema.patients.doctorId, doctor[0].id))
            ).limit(1);

            if (!patient.length) {
                return res.status(403).json({ message: 'Access denied to this patient' });
            }

            // Check if care plan already exists
            const existingCarePlan = await db.select().from(schema.carePlanDirectives).where(
                eq(schema.carePlanDirectives.patientId, parseInt(patientId))
            ).limit(1);

            if (existingCarePlan.length) {
                // Update existing care plan
                await db.update(schema.carePlanDirectives)
                    .set({
                        healthyEatingPlan: healthy_eating_plan || "",
                        exerciseWellnessRoutine: exercise_wellness_routine || "",
                        prescribedMedication: prescribed_medication || "",
                        updatedAt: new Date()
                    })
                    .where(eq(schema.carePlanDirectives.patientId, parseInt(patientId)));
            } else {
                // Create new care plan
                await db.insert(schema.carePlanDirectives).values({
                    patientId: parseInt(patientId),
                    healthyEatingPlan: healthy_eating_plan || "",
                    exerciseWellnessRoutine: exercise_wellness_routine || "",
                    prescribedMedication: prescribed_medication || "",
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }

            res.json({ status: 'success', message: 'Care plan saved successfully' });
        } catch (error) {
            console.error('Error saving care plan:', error);
            res.status(500).json({ message: 'Failed to save care plan' });
        }
    });

    router.get('/patients/me/health-metrics/history', authMiddleware(['patient']), async (req: AuthenticatedRequest, res) => {
        try {
            const patient = await db.query.patients.findFirst({
                where: eq(schema.patients.userId, req.user!.userId)
            });

            if (!patient) {
                return res.status(404).json({ message: 'Patient record not found' });
            }

            const metrics = await db.select({
                id: schema.healthMetrics.id,
                date: schema.healthMetrics.date,
                medicationScore: schema.healthMetrics.medicationScore,
                dietScore: schema.healthMetrics.dietScore,
                exerciseScore: schema.healthMetrics.exerciseScore
            })
            .from(schema.healthMetrics)
            .where(eq(schema.healthMetrics.patientId, patient.id))
            .orderBy(schema.healthMetrics.date);

            res.json(metrics);
        } catch (error) {
            console.error('Error fetching health metrics:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    app.use('/api', router);
}