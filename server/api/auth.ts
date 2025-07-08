import { Router } from 'express';
import { db } from '../db';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin']), // Currently only supporting admin login
});

/**
 * POST /api/auth/login
 * Handles user login.
 */
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // 1. Find the user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // 2. Check if the user account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been deactivated.' });
    }

    // 3. Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 4. Generate JWT
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("CRITICAL: JWT_SECRET is not defined.");
      return res.status(500).json({ error: 'Internal server configuration error.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 5. Return token and user info (excluding password hash)
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.json({ token, user: userResponse });

  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid email or password format.' });
    console.error("Login error:", error);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default authRouter;