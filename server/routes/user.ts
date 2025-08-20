/**
 * User context routes for automatic authentication system
 */

import { Router } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Get current user context - automatically determines user based on referrer
 */
router.get('/', async (req, res) => {
  try {
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    
    // Determine user type based on referrer path or default to patient
    let userId = 2; // Default to Reuben Collins (Patient)
    let userRole = 'patient';
    
    if (referer.includes('/doctor-dashboard') || referer.includes('doctor')) {
      userId = 1; // Dr. Marijke Collins
      userRole = 'doctor';
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      uin: user.uin,
      role: userRole,
      phone_number: user.phone_number
    });
    
  } catch (error) {
    console.error('User context error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user context'
    });
  }
});

/**
 * Get current user context for dashboards  
 */
router.get('/current-context', async (req, res) => {
  try {
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    
    // Determine user type based on referrer path
    if (referer.includes('/doctor-dashboard') || referer.includes('doctor')) {
      res.json({
        userRole: 'doctor',
        doctorId: 1,
        userId: 1
      });
    } else {
      res.json({
        userRole: 'patient',
        patientId: 2,
        userId: 2
      });
    }
    
  } catch (error) {
    console.error('User current context error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current context'
    });
  }
});

/**
 * Get user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      uin: user.uin,
      phone_number: user.phone_number
    });
    
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

export { router as userRoutes };