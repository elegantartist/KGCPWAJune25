import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { SMSService } from './smsService';
import { emailService } from './emailService';
import { VerificationCodeStorageService } from './verificationCodeStorageService';

// JWT secret for doctor authentication tokens - validation happens at runtime
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set for production deployment');
  }
  return secret;
};
const TOKEN_EXPIRY = '24h';
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

export interface DoctorToken {
  doctorId: number;
  email: string;
  phone: string;
  iat: number;
  exp: number;
}

export interface VerificationCode {
  code: string;
  phone: string;
  doctorId: number;
  expiresAt: Date;
  attempts: number;
}

export class DoctorAuthService {
  /**
   * Generate a secure one-time access token for doctor registration
   */
  static generateAccessToken(doctorId: number, email: string, phone: string): string {
    const payload: Omit<DoctorToken, 'iat' | 'exp'> = {
      doctorId,
      email,
      phone
    };

    return jwt.sign(payload, getJWTSecret(), {
      expiresIn: TOKEN_EXPIRY,
      issuer: 'keep-going-care',
      audience: 'doctor-portal'
    });
  }

  /**
   * Verify and decode a doctor access token
   */
  static verifyAccessToken(token: string): DoctorToken | null {
    try {
      const decoded = jwt.verify(token, getJWTSecret(), {
        issuer: 'keep-going-care',
        audience: 'doctor-portal'
      }) as DoctorToken;

      return decoded;
    } catch (error) {
      console.error('Token verification failed:', (error as Error).message);
      return null;
    }
  }

  /**
   * Generate secure setup URL with token
   */
  static generateSetupUrl(token: string, baseUrl?: string): string {
    // Use the current request's host or fall back to Replit domain
    const domain = baseUrl || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    return `${domain}/doctor-setup?token=${token}`;
  }

  /**
   * Send verification code via SMS
   */
  static async sendVerificationCode(phone: string, doctorId: number): Promise<{ success: boolean, message: string }> {
    try {
      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code using centralized service
      const stored = await VerificationCodeStorageService.setCode(
        doctorId,
        phone,
        code,
        VERIFICATION_CODE_EXPIRY,
        'sms'
      );

      if (!stored) {
        return {
          success: false,
          message: 'Failed to store verification code'
        };
      }

      // Send SMS
      const smsResult = await SMSService.sendVerificationCode(phone, code);

      if (smsResult.success) {
        return {
          success: true,
          message: 'Verification code sent successfully'
        };
      } else {
        return {
          success: false,
          message: `Failed to send SMS: ${smsResult.error}`
        };
      }
    } catch (error) {
      console.error('Error sending verification code:', (error as Error).message);
      return {
        success: false,
        message: 'Internal error sending verification code'
      };
    }
  }

  /**
   * Verify SMS code
   */
  static async verifyCode(phone: string, doctorId: number, code: string): Promise<{ success: boolean, message: string }> {
    try {
      // Get stored verification code
      const storedVerification = await VerificationCodeStorageService.getCode(doctorId, phone, 'sms');

      if (!storedVerification) {
        return {
          success: false,
          message: 'No verification code found. Please request a new code.'
        };
      }

      // Check attempts (rate limiting)
      if (storedVerification.attempts >= 3) {
        await VerificationCodeStorageService.deleteCode(doctorId, phone, 'sms');
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new code.'
        };
      }

      // Verify code
      if (storedVerification.code === code) {
        // Success - clean up
        await VerificationCodeStorageService.deleteCode(doctorId, phone, 'sms');
        return {
          success: true,
          message: 'Phone number verified successfully'
        };
      } else {
        // Increment attempts
        await VerificationCodeStorageService.incrementAttempts(doctorId, phone, 'sms', storedVerification);
        
        return {
          success: false,
          message: `Invalid verification code. ${2 - storedVerification.attempts} attempts remaining.`
        };
      }
    } catch (error) {
      console.error('Error verifying code:', (error as Error).message);
      return {
        success: false,
        message: 'Internal error verifying code'
      };
    }
  }

  /**
   * Send welcome email with secure setup link
   */
  static async sendWelcomeEmail(doctorEmail: string, doctorName: string, doctorPhone: string): Promise<{ success: boolean, message: string }> {
    try {
      // Find the doctor record to get their ID
      const doctor = await storage.getUserByEmail(doctorEmail);
      if (!doctor) {
        return {
          success: false,
          message: 'Doctor not found'
        };
      }

      // Generate secure access token
      const accessToken = DoctorAuthService.generateAccessToken(doctor.id, doctorEmail, doctorPhone);
      const setupUrl = DoctorAuthService.generateSetupUrl(accessToken);

      // Get the correct Replit domain from environment or construct it
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 
                           `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const baseUrl = `https://${replitDomain}`;

      const emailSubject = 'Welcome to Keep Going Care - Complete Your Account Setup';
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header with KGC Logo -->
          <div style="text-align: center; padding: 40px 20px 20px; background: linear-gradient(135deg, #2E8BC0 0%, #1e40af 100%);">
            <div style="background-color: white; padding: 15px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <h1 style="color: #2E8BC0; margin: 0; font-size: 24px; font-weight: bold;">Keep Going Care</h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Healthcare Technology Platform</p>
            </div>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; font-size: 28px; margin-bottom: 20px; text-align: center;">Welcome to Keep Going Care, Dr. ${doctorName}!</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Thank you for joining Keep Going Care as a healthcare provider. You now have access to our comprehensive digital health platform designed to support your patients' health journey.
            </p>

            <div style="background-color: #f8fafc; border-left: 4px solid #2E8BC0; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">🔒 Secure Account Setup Required</h3>
              <p style="color: #4b5563; margin-bottom: 15px; font-size: 14px;">
                For security, please complete your account setup using the secure link below. This link will expire in 24 hours.
              </p>
            </div>

            <!-- Setup Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${setupUrl}" style="background: linear-gradient(135deg, #2E8BC0 0%, #1e40af 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(46, 139, 192, 0.3);">
                Complete Account Setup
              </a>
            </div>

            <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Important:</strong> You'll need to verify your mobile phone number (${doctorPhone}) during setup for two-factor authentication.
              </p>
            </div>

            <!-- Features Overview -->
            <div style="margin-top: 40px;">
              <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 20px;">What You Can Do:</h3>
              <ul style="color: #4b5563; line-height: 1.8; font-size: 15px;">
                <li><strong>Patient Management:</strong> Add and monitor patients in your care</li>
                <li><strong>Care Plan Creation:</strong> Develop personalised care plans and track progress</li>
                <li><strong>Health Monitoring:</strong> Real-time access to patient health metrics</li>
                <li><strong>Secure Messaging:</strong> Communicate safely with patients</li>
                <li><strong>Compliance Tools:</strong> TGA-compliant digital health solutions</li>
              </ul>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.<br>
              This email was sent to ${doctorEmail}. If you did not request this account, please disregard this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              © 2024 Keep Going Care. Healthcare Technology Platform.<br>
              Secure • Compliant • Patient-Focused
            </p>
          </div>
        </div>
      `;

      const result = await emailService.sendEmail({
        to: doctorEmail,
        from: 'welcome@keepgoingcare.com',
        subject: emailSubject,
        html: emailHtml
      });

      if (result.success) {
        return {
          success: true,
          message: 'Welcome email sent successfully'
        };
      } else {
        return {
          success: false,
          message: result.error || 'Failed to send welcome email'
        };
      }
    } catch (error) {
      console.error('Error sending welcome email:', (error as Error).message);
      return {
        success: false,
        message: 'Internal error sending welcome email'
      };
    }
  }
}