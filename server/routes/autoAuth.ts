/**
 * Automatic Authentication Routes
 * 
 * Provides automatic user assignment without requiring login credentials
 * for the specific doctor/patient pair: Dr. Marijke Collins & Reuben Collins
 */

import { Router } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Get automatic patient user (Reuben Collins - ID: 2)
 */
router.get('/patient', async (req, res) => {
  try {
    const [patient] = await db.select().from(users).where(eq(users.id, 2));
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        uin: patient.uin,
        role: 'patient',
        dashboardType: 'patient'
      }
    });
    
  } catch (error) {
    console.error('Auto auth patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get patient data'
    });
  }
});

/**
 * Get automatic doctor user (Dr. Marijke Collins - ID: 1)
 */
router.get('/doctor', async (req, res) => {
  try {
    const [doctor] = await db.select().from(users).where(eq(users.id, 1));
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        uin: doctor.uin,
        role: 'doctor',
        dashboardType: 'doctor'
      }
    });
    
  } catch (error) {
    console.error('Auto auth doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get doctor data'
    });
  }
});

/**
 * Get current user context based on the requesting dashboard
 */
router.get('/current-user', async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    
    // Determine user type based on referrer path
    let userId = 2; // Default to patient (Reuben Collins)
    
    if (referer.includes('/doctor-dashboard')) {
      userId = 1; // Dr. Marijke Collins
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const role = userId === 1 ? 'doctor' : 'patient';
    const dashboardType = userId === 1 ? 'doctor' : 'patient';
    
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        uin: user.uin,
        role,
        dashboardType
      }
    });
    
  } catch (error) {
    console.error('Auto auth current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current user data'
    });
  }
});

export { router as autoAuthRoutes };