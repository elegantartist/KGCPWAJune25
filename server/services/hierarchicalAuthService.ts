/**
 * Hierarchical Authentication Service for KGC Dashboard System
 * Handles SMS-based authentication with role-based dashboard routing
 */

import { db } from '../db';
import { users, userRoles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import twilio from 'twilio';

export interface AuthRequest {
  phoneNumber: string;
}

export interface VerifyRequest {
  phoneNumber: string;
  verificationCode: string;
}

export interface AuthenticatedUser {
  id: number;
  uin: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  dashboardType: 'admin' | 'doctor' | 'patient';
  doctorLetter?: string;
  patientNumber?: number;
  isActive: boolean;
}

class HierarchicalAuthService {
  private static instance: HierarchicalAuthService;
  private twilioClient: twilio.Twilio;
  private verificationCodes: Map<string, { code: string; expires: number; attempts: number }> = new Map();

  constructor() {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  static getInstance(): HierarchicalAuthService {
    if (!HierarchicalAuthService.instance) {
      HierarchicalAuthService.instance = new HierarchicalAuthService();
    }
    return HierarchicalAuthService.instance;
  }

  /**
   * Initiate SMS authentication by sending verification code
   */
  async initiateAuthentication(authRequest: AuthRequest): Promise<{ success: boolean; message: string }> {
    const { phoneNumber } = authRequest;

    try {
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
        return {
          success: false,
          message: 'No account found with this phone number. Please contact your administrator.'
        };
      }

      const { user, role } = userResult[0];

      if (!user.isActive) {
        return {
          success: false,
          message: 'Your account has been deactivated. Please contact your administrator.'
        };
      }

      // Generate 6-digit verification code
      const verificationCode = this.generateVerificationCode();
      
      // Store verification code with expiration (5 minutes)
      this.verificationCodes.set(phoneNumber, {
        code: verificationCode,
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        attempts: 0
      });

      // Send SMS via Twilio
      await this.sendVerificationSMS(phoneNumber, verificationCode, user.name, role.name);

      return {
        success: true,
        message: 'Verification code sent to your phone. Please check your messages.'
      };

    } catch (error) {
      console.error('Authentication initiation error:', error);
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.'
      };
    }
  }

  /**
   * Verify SMS code and authenticate user
   */
  async verifyAuthentication(verifyRequest: VerifyRequest): Promise<{ 
    success: boolean; 
    message: string; 
    user?: AuthenticatedUser;
    dashboardRoute?: string;
  }> {
    const { phoneNumber, verificationCode } = verifyRequest;

    try {
      // Check stored verification code
      const storedVerification = this.verificationCodes.get(phoneNumber);

      if (!storedVerification) {
        return {
          success: false,
          message: 'No verification code found. Please request a new code.'
        };
      }

      // Check expiration
      if (Date.now() > storedVerification.expires) {
        this.verificationCodes.delete(phoneNumber);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new code.'
        };
      }

      // Check attempts limit
      if (storedVerification.attempts >= 3) {
        this.verificationCodes.delete(phoneNumber);
        return {
          success: false,
          message: 'Too many verification attempts. Please request a new code.'
        };
      }

      // Verify code
      if (storedVerification.code !== verificationCode) {
        storedVerification.attempts++;
        return {
          success: false,
          message: 'Invalid verification code. Please try again.'
        };
      }

      // Code is valid - get user details
      const userResult = await db
        .select({
          user: users,
          role: userRoles,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.roleId, userRoles.id))
        .where(eq(users.phoneNumber, phoneNumber));

      if (userResult.length === 0) {
        return {
          success: false,
          message: 'User account not found.'
        };
      }

      const { user, role } = userResult[0];

      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Clean up verification code
      this.verificationCodes.delete(phoneNumber);

      // Determine dashboard type and route
      const dashboardInfo = this.getDashboardInfo(user.uin!);

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        uin: user.uin!,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: role.name,
        dashboardType: dashboardInfo.type,
        doctorLetter: user.doctorLetter || undefined,
        patientNumber: user.patientNumber || undefined,
        isActive: user.isActive,
      };

      return {
        success: true,
        message: 'Authentication successful',
        user: authenticatedUser,
        dashboardRoute: dashboardInfo.route
      };

    } catch (error) {
      console.error('Authentication verification error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.'
      };
    }
  }

  /**
   * Generate 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification SMS via Twilio
   */
  private async sendVerificationSMS(phoneNumber: string, code: string, userName: string, userRole: string): Promise<void> {
    const message = `Hello ${userName},

Your Keep Going Care verification code is: ${code}

This code will expire in 5 minutes.

Dashboard: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}

If you didn't request this, please ignore this message.`;

    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
  }

  /**
   * Determine dashboard type and route from UIN
   */
  private getDashboardInfo(uin: string): { type: 'admin' | 'doctor' | 'patient'; route: string } {
    if (uin === 'X1') {
      return { type: 'admin', route: '/admin-dashboard' };
    }
    
    if (/^[A-J]$/.test(uin)) {
      return { type: 'doctor', route: '/doctor-dashboard' };
    }
    
    if (/^[A-J][1-5]$/.test(uin)) {
      return { type: 'patient', route: '/patient-dashboard' };
    }

    // Fallback to patient dashboard for unknown UINs
    return { type: 'patient', route: '/patient-dashboard' };
  }

  /**
   * Get user by ID with role information
   */
  async getUserById(userId: number): Promise<AuthenticatedUser | null> {
    try {
      const userResult = await db
        .select({
          user: users,
          role: userRoles,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.roleId, userRoles.id))
        .where(eq(users.id, userId));

      if (userResult.length === 0) {
        return null;
      }

      const { user, role } = userResult[0];
      const dashboardInfo = this.getDashboardInfo(user.uin!);

      return {
        id: user.id,
        uin: user.uin!,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: role.name,
        dashboardType: dashboardInfo.type,
        doctorLetter: user.doctorLetter || undefined,
        patientNumber: user.patientNumber || undefined,
        isActive: user.isActive,
      };

    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Validate user access to specific dashboard type
   */
  validateDashboardAccess(user: AuthenticatedUser, requiredDashboard: 'admin' | 'doctor' | 'patient'): boolean {
    return user.dashboardType === requiredDashboard && user.isActive;
  }

  /**
   * Get users managed by a specific user (for admin and doctor dashboards)
   */
  async getManagedUsersByRole(userId: number, userRole: string): Promise<AuthenticatedUser[]> {
    try {
      let managedUsers: any[] = [];

      if (userRole === 'admin') {
        // Admin can see all doctors
        managedUsers = await db
          .select({
            user: users,
            role: userRoles,
          })
          .from(users)
          .innerJoin(userRoles, eq(users.roleId, userRoles.id))
          .where(eq(userRoles.name, 'doctor'));

      } else if (userRole === 'doctor') {
        // Doctor can see their assigned patients
        const doctorInfo = await this.getUserById(userId);
        if (doctorInfo?.doctorLetter) {
          managedUsers = await db
            .select({
              user: users,
              role: userRoles,
            })
            .from(users)
            .innerJoin(userRoles, eq(users.roleId, userRoles.id))
            .where(eq(users.doctorLetter, doctorInfo.doctorLetter));
        }
      }

      return managedUsers.map(({ user, role }) => {
        const dashboardInfo = this.getDashboardInfo(user.uin!);
        return {
          id: user.id,
          uin: user.uin!,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: role.name,
          dashboardType: dashboardInfo.type,
          doctorLetter: user.doctorLetter || undefined,
          patientNumber: user.patientNumber || undefined,
          isActive: user.isActive,
        };
      });

    } catch (error) {
      console.error('Error getting managed users:', error);
      return [];
    }
  }

  /**
   * Clean up expired verification codes (run periodically)
   */
  cleanupExpiredCodes(): void {
    const now = Date.now();
    const entries = Array.from(this.verificationCodes.entries());
    for (const [phoneNumber, verification] of entries) {
      if (now > verification.expires) {
        this.verificationCodes.delete(phoneNumber);
      }
    }
  }
}

export const hierarchicalAuthService = HierarchicalAuthService.getInstance();

// Clean up expired codes every 10 minutes
setInterval(() => {
  hierarchicalAuthService.cleanupExpiredCodes();
}, 10 * 60 * 1000);