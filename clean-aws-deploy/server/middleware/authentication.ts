import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, userRoles } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Enhanced authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  if (!session?.userId) {
    console.log(`Unauthorized access attempt to ${req.path} from IP: ${req.ip}`);
    
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  // Log successful authentication for audit
  console.log(`User ${session.userId} accessed ${req.path}`);
  
  next();
}

// Role-based authorization with detailed logging
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    
    if (!session?.userId || !session?.userRole) {
      console.log(`Unauthorized access attempt to ${req.path} from IP: ${req.ip}`);
      
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }
    
    if (!allowedRoles.includes(session.userRole)) {
      console.log(`Authorization failure: User ${session.userId} with role ${session.userRole} attempted to access ${req.path}`);
      
      return res.status(403).json({ 
        error: 'Insufficient permissions' 
      });
    }
    
    // Log successful authorization
    console.log(`User ${session.userId} (${session.userRole}) authorized for ${req.path}`);
    
    next();
  };
}

// Secure admin authentication with proper password hashing
export async function authenticateAdmin(adminId: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // For production, admin credentials should be in environment variables
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    if (!adminPasswordHash) {
      console.error('ADMIN_PASSWORD_HASH environment variable not set');
      return { 
        success: false, 
        error: 'Server configuration error. Please contact system administrator.' 
      };
    }
    
    // Verify admin credentials
    if (adminId !== adminUsername) {
      return { 
        success: false, 
        error: 'Invalid credentials' 
      };
    }
    
    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);
    
    if (!passwordMatch) {
      return { 
        success: false, 
        error: 'Invalid credentials' 
      };
    }
    
    // Return success with minimal user info
    return {
      success: true,
      user: {
        id: 'admin',
        role: 'admin',
        name: 'System Administrator'
      }
    };
    
  } catch (error) {
    console.error('Admin authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication failed' 
    };
  }
}

// Resource ownership verification for IDOR protection
export function verifyResourceOwnership(resourceType: 'patient' | 'doctor' | 'report') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    const resourceId = req.params.id || req.params.patientId || req.params.doctorId;
    
    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID required' });
    }
    
    try {
      let hasAccess = false;
      
      switch (resourceType) {
        case 'patient':
          // Patients can only access their own data
          if (session.userRole === 'patient') {
            hasAccess = session.userId === parseInt(resourceId);
          }
          // Doctors can access their assigned patients
          else if (session.userRole === 'doctor') {
            const doctorPatient = await db
              .select()
              .from(users)
              .where(and(
                eq(users.id, parseInt(resourceId)),
                eq(users.doctorId, session.userId)
              ));
            hasAccess = doctorPatient.length > 0;
          }
          // Admins can access all patients
          else if (session.userRole === 'admin') {
            hasAccess = true;
          }
          break;
          
        case 'doctor':
          // Only admins can access doctor resources
          if (session.userRole === 'admin') {
            hasAccess = true;
          }
          // Doctors can access their own data
          else if (session.userRole === 'doctor') {
            hasAccess = session.userId === parseInt(resourceId);
          }
          break;
          
        case 'report':
          // Reports follow patient access rules
          // Additional logic would go here to verify report ownership
          hasAccess = session.userRole === 'admin' || session.userRole === 'doctor';
          break;
      }
      
      if (!hasAccess) {
        console.log(`IDOR attempt: User ${session.userId} (${session.userRole}) tried to access ${resourceType}:${resourceId}`);
        
        return res.status(403).json({ 
          error: 'Access denied to this resource' 
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Resource ownership verification error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

// Session timeout management
export function checkSessionTimeout(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  if (session?.userId) {
    const now = Date.now();
    const lastActivity = session.lastActivity || now;
    const sessionTimeout = getSessionTimeout(session.userRole);
    
    if (now - lastActivity > sessionTimeout) {
      // Session expired
      console.log(`Session expired for user ${session.userId} after ${(now - lastActivity) / 1000 / 60} minutes`);
      
      session.destroy((err: any) => {
        if (err) console.error('Session destruction error:', err);
      });
      
      return res.status(401).json({ 
        error: 'Session expired. Please log in again.' 
      });
    }
    
    // Update last activity
    session.lastActivity = now;
  }
  
  next();
}

// Get session timeout based on user role
function getSessionTimeout(userRole: string): number {
  switch (userRole) {
    case 'admin':
      return 60 * 60 * 1000; // 1 hour
    case 'doctor':
      return 5 * 60 * 1000; // 5 minutes  
    case 'patient':
      return 30 * 60 * 1000; // 30 minutes
    default:
      return 5 * 60 * 1000; // 5 minutes default
  }
}

// Input validation for sensitive operations
export function validateSensitiveInput(req: Request, res: Response, next: NextFunction) {
  const sensitiveFields = ['password', 'email', 'phoneNumber', 'adminId'];
  const body = req.body;
  
  for (const field of sensitiveFields) {
    if (body[field]) {
      // Basic validation
      if (typeof body[field] !== 'string') {
        return res.status(400).json({ error: `${field} must be a string` });
      }
      
      // Length validation
      if (body[field].length > 255) {
        return res.status(400).json({ error: `${field} is too long` });
      }
      
      // Pattern validation for specific fields
      if (field === 'email' && body[field]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body[field])) {
          return res.status(400).json({ error: 'Invalid email format' });
        }
      }
      
      if (field === 'phoneNumber' && body[field]) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(body[field])) {
          return res.status(400).json({ error: 'Invalid phone number format' });
        }
      }
    }
  }
  
  next();
}