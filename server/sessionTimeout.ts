import { Request, Response, NextFunction } from 'express';

// Session timeout durations in milliseconds
const DOCTOR_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PATIENT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface SessionData {
  userId?: number;
  doctorId?: number;
  patientId?: number;
  userRole?: string;
  dashboardType?: 'admin' | 'doctor' | 'patient';
  doctorLetter?: string;
  patientNumber?: number;
  lastActivity?: number;
  impersonatedDoctorId?: number;
  impersonatedPatientId?: number;
  adminOriginalUserId?: number;
}

export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  // Check if session exists and has any authentication data
  const hasAuthData = session && (
    session.doctorId || 
    session.patientId || 
    session.userId || 
    session.userRole ||
    session.impersonatedDoctorId ||
    session.impersonatedPatientId
  );
  
  if (!hasAuthData) {
    // No active session, continue
    return next();
  }

  const now = Date.now();
  const lastActivity = session.lastActivity || now;
  
  // Determine timeout based on user role - admin gets longer timeout especially during impersonation
  let timeoutDuration = PATIENT_TIMEOUT; // Default
  if (session.userRole === 'doctor') {
    timeoutDuration = DOCTOR_TIMEOUT;
  } else if (session.userRole === 'admin' || session.adminOriginalUserId) {
    // Extended timeout for admin, especially during impersonation - much longer to prevent rapid logout
    timeoutDuration = 4 * 60 * 60 * 1000; // 4 hours for admin or during admin impersonation
  }
  
  // Check if this is an API route - be more lenient with session timeouts for rapid API calls
  const isApiRoute = req.path.startsWith('/api/');
  if (isApiRoute && session.adminOriginalUserId) {
    // During admin impersonation, be very lenient with API routes to prevent rapid logout
    timeoutDuration = 8 * 60 * 60 * 1000; // 8 hours for API routes during admin impersonation
  }
  
  if (now - lastActivity > timeoutDuration) {
    // Session expired
    console.log(`[SESSION TIMEOUT] Session expired for ${session.userRole} ID: ${session.doctorId || session.patientId || session.userId}, impersonating: ${session.impersonatedDoctorId || session.impersonatedPatientId || 'none'}`);
    
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