import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users, userRoles } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Store verification codes temporarily
const verificationCodes = new Map<string, { code: string; expires: number; attempts: number }>();

// Enhanced authentication middleware for hierarchical system
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  if (!session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  next();
}

// Role-based authorization middleware
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    
    if (!session?.userId || !session?.userRole) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!allowedRoles.includes(session.userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

// Initiate SMS authentication
export async function handleSMSLogin(req: Request, res: Response) {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Find user by phone number
    const userResult = await db
      .select({
        user: users,
        role: userRoles,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(eq(users.phoneNumber, phoneNumber));

    if (userResult.length === 0) {
      return res.status(400).json({ 
        message: "No account found with this phone number. Contact your administrator." 
      });
    }

    const { user, role } = userResult[0];

    if (!user.isActive) {
      return res.status(400).json({ 
        message: "Account is deactivated. Contact your administrator." 
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 5-minute expiration
    verificationCodes.set(phoneNumber, {
      code: verificationCode,
      expires: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    // Send SMS
    const message = `Hello ${user.name},

Your KGC verification code is: ${verificationCode}

This code expires in 5 minutes.

Dashboard: ${role.name.charAt(0).toUpperCase() + role.name.slice(1)}`;

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    res.json({ 
      success: true, 
      message: "Verification code sent to your phone" 
    });

  } catch (error) {
    console.error("SMS login error:", error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
}

// Verify SMS code and complete login
export async function handleSMSVerify(req: Request, res: Response) {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({ message: "Phone number and verification code required" });
    }

    // Check stored verification code
    const storedVerification = verificationCodes.get(phoneNumber);
    
    if (!storedVerification) {
      return res.status(400).json({ message: "No verification code found. Request a new code." });
    }

    // Check expiration
    if (Date.now() > storedVerification.expires) {
      verificationCodes.delete(phoneNumber);
      return res.status(400).json({ message: "Verification code expired. Request a new code." });
    }

    // Check attempts
    if (storedVerification.attempts >= 3) {
      verificationCodes.delete(phoneNumber);
      return res.status(400).json({ message: "Too many attempts. Request a new code." });
    }

    // Verify code
    if (storedVerification.code !== verificationCode) {
      storedVerification.attempts++;
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Get user details
    const userResult = await db
      .select({
        user: users,
        role: userRoles,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(eq(users.phoneNumber, phoneNumber));

    if (userResult.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const { user, role } = userResult[0];

    // Determine dashboard type from UIN
    let dashboardType: 'admin' | 'doctor' | 'patient' = 'patient';
    let dashboardRoute = '/patient-dashboard';
    
    if (user.uin === 'X1') {
      dashboardType = 'admin';
      dashboardRoute = '/admin-dashboard';
    } else if (/^[A-J]$/.test(user.uin || '')) {
      dashboardType = 'doctor';
      dashboardRoute = '/doctor-dashboard';
    } else if (/^[A-J][1-5]$/.test(user.uin || '')) {
      dashboardType = 'patient';
      dashboardRoute = '/patient-dashboard';
    }

    // Set session data with hierarchical information
    const session = req.session as any;
    session.userId = user.id;
    session.userRole = role.name;
    session.dashboardType = dashboardType;
    session.doctorLetter = user.doctorLetter;
    session.patientNumber = user.patientNumber;
    session.lastActivity = Date.now();
    
    // Legacy compatibility
    if (role.name === 'doctor') {
      session.doctorId = user.id;
    } else if (role.name === 'patient') {
      session.patientId = user.id;
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Clean up verification code
    verificationCodes.delete(phoneNumber);

    res.json({ 
      success: true,
      message: "Authentication successful",
      user: {
        id: user.id,
        uin: user.uin,
        name: user.name,
        email: user.email,
        role: role.name,
        dashboardType,
        doctorLetter: user.doctorLetter,
        patientNumber: user.patientNumber
      },
      dashboardRoute
    });

  } catch (error) {
    console.error("SMS verify error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
}

// Legacy login handler for backward compatibility
export async function handleLogin(req: Request, res: Response) {
  try {
    const { uin, name, role } = req.body;
    
    if (!uin || !name || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find user in database
    const [user] = await db
      .select({
        id: users.id,
        uin: users.uin,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        doctorLetter: users.doctorLetter,
        patientNumber: users.patientNumber
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(and(
        eq(users.uin, uin),
        eq(userRoles.name, role)
      ));

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Determine dashboard type
    let dashboardType: 'admin' | 'doctor' | 'patient' = 'patient';
    if (user.uin === 'X1') dashboardType = 'admin';
    else if (/^[A-J]$/.test(user.uin || '')) dashboardType = 'doctor';

    // Set session data
    const session = req.session as any;
    session.userId = user.id;
    session.userRole = role;
    session.dashboardType = dashboardType;
    session.doctorLetter = user.doctorLetter;
    session.patientNumber = user.patientNumber;
    session.lastActivity = Date.now();
    
    if (role === 'doctor') {
      session.doctorId = user.id;
    } else if (role === 'patient') {
      session.patientId = user.id;
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        uin: user.uin,
        name: user.name,
        role: role,
        dashboardType,
        doctorLetter: user.doctorLetter,
        patientNumber: user.patientNumber
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
}

// Auth status check
export function handleAuthStatus(req: Request, res: Response) {
  const session = req.session as any;
  
  if (session?.userId) {
    res.json({ 
      authenticated: true,
      user: {
        id: session.userId,
        role: session.userRole
      }
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
}