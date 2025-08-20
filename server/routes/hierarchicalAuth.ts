/**
 * Hierarchical Authentication Routes for KGC Dashboard System
 * Handles SMS-based authentication with role-based dashboard routing
 */

import { Router } from 'express';
import { hierarchicalAuthService } from '../services/hierarchicalAuthService';
import { userManagementService } from '../services/userManagementService';
import { z } from 'zod';

const router = Router();

// Request schemas
const initiateAuthSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
});

const verifyAuthSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  verificationCode: z.string().length(6, 'Verification code must be 6 digits'),
});

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['admin', 'doctor', 'patient']),
  doctorLetter: z.string().optional(),
  patientNumber: z.number().min(1).max(5).optional(),
});

/**
 * POST /api/auth/initiate
 * Initiate SMS authentication by sending verification code
 */
router.post('/initiate', async (req, res) => {
  try {
    const { phoneNumber } = initiateAuthSchema.parse(req.body);

    const result = await hierarchicalAuthService.initiateAuthentication({ phoneNumber });

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Initiate auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate authentication'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify SMS code and authenticate user
 */
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = verifyAuthSchema.parse(req.body);

    const result = await hierarchicalAuthService.verifyAuthentication({ 
      phoneNumber, 
      verificationCode 
    });

    if (result.success && result.user) {
      // Set session data
      req.session.userId = result.user.id;
      req.session.userRole = result.user.role;
      req.session.dashboardType = result.user.dashboardType;
      req.session.lastActivity = Date.now();

      res.json({
        success: true,
        message: result.message,
        user: result.user,
        dashboardRoute: result.dashboardRoute
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Verify auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication verification failed'
    });
  }
});

/**
 * GET /api/auth/user
 * Get current authenticated user
 */
router.get('/user', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await hierarchicalAuthService.getUserById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update session activity
    req.session.lastActivity = Date.now();

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /api/auth/managed-users
 * Get users managed by current user (admin sees doctors, doctors see patients)
 */
router.get('/managed-users', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.userRole) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const managedUsers = await hierarchicalAuthService.getManagedUsersByRole(
      req.session.userId,
      req.session.userRole
    );

    res.json({
      success: true,
      users: managedUsers
    });

  } catch (error) {
    console.error('Get managed users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get managed users'
    });
  }
});

/**
 * POST /api/auth/create-user
 * Create new user (admin creates doctors, doctors create patients)
 */
router.post('/create-user', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.userRole) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const userData = createUserSchema.parse(req.body);

    // Validate permissions
    if (req.session.userRole === 'admin' && userData.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Admin can only create doctor accounts'
      });
    }

    if (req.session.userRole === 'doctor' && userData.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Doctors can only create patient accounts'
      });
    }

    if (req.session.userRole === 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Patients cannot create accounts'
      });
    }

    // Set creator and hierarchy info
    const createRequest = {
      ...userData,
      createdByUserId: req.session.userId,
    };

    // For doctor creating patient, get doctor's letter
    if (req.session.userRole === 'doctor' && userData.role === 'patient') {
      const doctor = await hierarchicalAuthService.getUserById(req.session.userId);
      if (doctor?.doctorLetter) {
        createRequest.doctorLetter = doctor.doctorLetter;
      }
    }

    const newUser = await userManagementService.createUser(createRequest);

    res.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
});

/**
 * GET /api/auth/available-slots
 * Get available slots for user creation
 */
router.get('/available-slots', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.userRole) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    let availableSlots = {};

    if (req.session.userRole === 'admin') {
      // Admin can see available doctor letters
      const availableLetters = await userManagementService.getAvailableDoctorLetters();
      availableSlots = { doctorLetters: availableLetters };
    } else if (req.session.userRole === 'doctor') {
      // Doctor can see available patient slots
      const doctor = await hierarchicalAuthService.getUserById(req.session.userId);
      if (doctor?.doctorLetter) {
        const availablePatientSlots = await userManagementService.getAvailablePatientSlots(doctor.doctorLetter);
        availableSlots = { patientSlots: availablePatientSlots };
      }
    }

    res.json({
      success: true,
      availableSlots
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available slots'
    });
  }
});

/**
 * PUT /api/auth/reassign-patient
 * Reassign patient to different doctor (admin only)
 */
router.put('/reassign-patient', async (req, res) => {
  try {
    if (!req.session.userId || req.session.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can reassign patients'
      });
    }

    const { patientId, newDoctorId } = req.body;

    if (!patientId || !newDoctorId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and new doctor ID are required'
      });
    }

    await userManagementService.reassignPatient(patientId, newDoctorId, req.session.userId);

    res.json({
      success: true,
      message: 'Patient reassigned successfully'
    });

  } catch (error) {
    console.error('Reassign patient error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reassign patient'
    });
  }
});

export default router;