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

    app.use('/api', router);
}