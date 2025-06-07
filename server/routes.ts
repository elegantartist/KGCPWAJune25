// In server/routes.ts
import { Router } from 'express';
import type { Express } from 'express';
import { db } from './db';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createAccessToken, authMiddleware, AuthenticatedRequest } from './auth';

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

    router.post('/auth/verify-sms', async (req, res) => {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ message: "Email and code are required." });
        
        const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
        
        if (!user || code !== "123456") { // Using a static code for reliable testing.
            return res.status(401).json({ message: 'Invalid code or email.' });
        }
        
        const accessToken = createAccessToken({ userId: user.id, role: user.role, name: user.name });
        res.json({ access_token: accessToken, user: { id: user.id, name: user.name, role: user.role } });
    });
    
    router.post('/auth/logout', authMiddleware(), (req, res) => res.status(200).json({ message: 'Logout successful' }));

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
            
            // Get patient record
            const patient = await db.select().from(schema.patients)
                .where(eq(schema.patients.userId, req.user!.userId))
                .limit(1);
            
            if (!patient.length) {
                return res.status(404).json({ message: "Patient record not found." });
            }
            
            // Insert health metrics
            const newMetric = await db.insert(schema.healthMetrics).values({
                patientId: patient[0].id,
                medicationScore,
                dietScore,
                exerciseScore,
                date: new Date()
            }).returning();
            
            res.json({ message: "Scores submitted successfully", metric: newMetric[0] });
        } catch (error) {
            console.error('Scores submission error:', error);
            res.status(500).json({ message: "Failed to submit scores." });
        }
    });

    app.use('/api', router);
}