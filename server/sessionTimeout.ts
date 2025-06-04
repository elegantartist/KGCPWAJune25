import { Request, Response, NextFunction } from 'express';

// Session timeout durations in milliseconds
const DOCTOR_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PATIENT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface SessionData {
  userId?: number;
  doctorId?: number;
  patientId?: number;
  userRole?: string;
  lastActivity?: number;
}

export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  if (!session || (!session.doctorId && !session.patientId && !session.userId && !session.userRole)) {
    // No active session, continue
    return next();
  }

  const now = Date.now();
  const lastActivity = session.lastActivity || now;
  
  // Determine timeout based on user role
  let timeoutDuration = PATIENT_TIMEOUT; // Default
  if (session.userRole === 'doctor') {
    timeoutDuration = DOCTOR_TIMEOUT;
  } else if (session.userRole === 'admin') {
    timeoutDuration = 60 * 60 * 1000; // 1 hour for admin
  }
  
  if (now - lastActivity > timeoutDuration) {
    // Session expired
    console.log(`Session expired for ${session.userRole} ID: ${session.doctorId || session.patientId || session.userId}`);
    
    // Clear session
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Error destroying expired session:', err);
      }
    });
    
    return res.status(401).json({ 
      message: 'Session expired. Please log in again.',
      expired: true,
      userRole: session.userRole
    });
  }
  
  // Update last activity timestamp
  session.lastActivity = now;
  
  next();
}

export function updateSessionActivity(req: Request) {
  const session = req.session as any;
  if (session && (session.doctorId || session.patientId)) {
    session.lastActivity = Date.now();
  }
}