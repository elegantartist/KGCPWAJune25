import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Redis } from 'ioredis';
import { storage } from '../storage';
import { SMSService } from './smsService';
import { emailService } from './emailService';

// JWT secret for doctor authentication tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-2024';
const TOKEN_EXPIRY = '24h';
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

// Redis client for persistent verification code storage with fallback
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient: Redis | null = null;
let useRedis = false;

try {
  redisClient = new Redis(REDIS_URL);
  
  redisClient.on('connect', () => {
    console.log('Redis connected successfully for verification codes');
    useRedis = true;
  });
  
  redisClient.on('error', (err) => {
    console.warn('Redis connection failed, using in-memory fallback:', err.message);
    useRedis = false;
  });
} catch (error) {
  console.warn('Redis initialization failed, using in-memory fallback');
  useRedis = false;
}

// Fallback in-memory storage when Redis unavailable
const fallbackVerificationCodes = new Map<string, { code: string; phone: string; doctorId: number; expiresAt: Date; attempts: number }>();

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

// Verification codes now stored in Redis for persistence across server restarts

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

    return jwt.sign(payload, JWT_SECRET, {
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
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'keep-going-care',
        audience: 'doctor-portal'
      }) as DoctorToken;

      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error.message);
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
      const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);
      
      // Store verification code (Redis with fallback to in-memory)
      const verificationKey = `${phone}-${doctorId}`;
      const verificationData = {
        code,
        phone,
        doctorId,
        expiresAt,
        attempts: 0
      };
      
      if (useRedis && redisClient) {
        try {
          const redisKey = `2fa:doctor:${doctorId}:${phone}`;
          const ttlSeconds = Math.floor(VERIFICATION_CODE_EXPIRY / 1000);
          await redisClient.setex(redisKey, ttlSeconds, JSON.stringify({
            code,
            phone,
            doctorId,
            attempts: 0
          }));
        } catch (error) {
          console.warn('Redis storage failed, using fallback:', error);
          fallbackVerificationCodes.set(verificationKey, verificationData);
        }
      } else {
        fallbackVerificationCodes.set(verificationKey, verificationData);
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
      console.error('Error sending verification code:', error);
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
      const verificationKey = `${phone}-${doctorId}`;
      let storedVerification: any = null;
      let isFromRedis = false;

      // Try Redis first if available
      if (useRedis && redisClient) {
        try {
          const redisKey = `2fa:doctor:${doctorId}:${phone}`;
          const storedData = await redisClient.get(redisKey);
          if (storedData) {
            storedVerification = JSON.parse(storedData);
            isFromRedis = true;
          }
        } catch (redisError) {
          console.warn('Redis retrieval failed, checking fallback storage:', redisError);
        }
      }

      // Fallback to in-memory storage
      if (!storedVerification) {
        const fallbackData = fallbackVerificationCodes.get(verificationKey);
        if (fallbackData) {
          // Check expiry for fallback storage
          if (new Date() > fallbackData.expiresAt) {
            fallbackVerificationCodes.delete(verificationKey);
            return {
              success: false,
              message: 'Verification code has expired. Please request a new code.'
            };
          }
          storedVerification = fallbackData;
          isFromRedis = false;
        }
      }

      if (!storedVerification) {
        return {
          success: false,
          message: 'No verification code found. Please request a new code.'
        };
      }

      // Check attempts (rate limiting)
      if (storedVerification.attempts >= 3) {
        if (isFromRedis && redisClient) {
          const redisKey = `2fa:doctor:${doctorId}:${phone}`;
          await redisClient.del(redisKey);
        } else {
          fallbackVerificationCodes.delete(verificationKey);
        }
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new code.'
        };
      }

      // Verify code
      if (storedVerification.code === code) {
        // Success - clean up
        if (isFromRedis && redisClient) {
          const redisKey = `2fa:doctor:${doctorId}:${phone}`;
          await redisClient.del(redisKey);
        } else {
          fallbackVerificationCodes.delete(verificationKey);
        }
        return {
          success: true,
          message: 'Phone number verified successfully'
        };
      } else {
        // Increment attempts
        storedVerification.attempts++;
        
        if (isFromRedis && redisClient) {
          const redisKey = `2fa:doctor:${doctorId}:${phone}`;
          const ttl = await redisClient.ttl(redisKey);
          if (ttl > 0) {
            await redisClient.setex(redisKey, ttl, JSON.stringify(storedVerification));
          }
        } else {
          // Update fallback storage
          fallbackVerificationCodes.set(verificationKey, storedVerification);
        }
        
        return {
          success: false,
          message: `Invalid verification code. ${3 - storedVerification.attempts} attempts remaining.`
        };
      }
    } catch (error) {
      console.error('Error during code verification:', error);
      return {
        success: false,
        message: 'Internal error during verification. Please try again.'
      };
    }
  }

  /**
   * Create secure password hash
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }



  /**
   * Clean up expired verification codes from fallback storage
   * (Redis handles TTL automatically)
   */
  static cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [key, verification] of fallbackVerificationCodes.entries()) {
      if (now > verification.expiresAt) {
        fallbackVerificationCodes.delete(key);
      }
    }
  }

  /**
   * Send welcome email with secure setup link
   */
  static async sendWelcomeEmail(doctorEmail: string, doctorName: string, setupToken: string): Promise<{ success: boolean, message: string }> {
    try {
      // Get the correct Replit domain from environment or construct it
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 
                           `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const baseUrl = `https://${replitDomain}`;
      const setupUrl = `${baseUrl}/doctor-login`;
      
      const emailSubject = 'Welcome to Keep Going Care - Complete Your Account Setup';
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header with KGC Logo -->
          <div style="text-align: center; padding: 40px 20px 20px; background: linear-gradient(135deg, #2E8BC0 0%, #1e40af 100%);">
            <div style="background-color: white; padding: 15px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <div style="width: 120px; height: 60px; background-color: #2E8BC0; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                <span style="color: white; font-weight: bold; font-size: 16px;">KGC</span>
              </div>
            </div>
            <h1 style="color: #ffffff; margin: 20px 0 0 0; font-size: 28px; font-weight: 600;">Welcome to Keep Going Care</h1>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Dear Dr. ${doctorName},
            </p>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
              Welcome to Keep Going Care (KGC), a new Class I Software as a Medical Device (SaMD) designed to support your metabolic syndrome patients. KGC is built to seamlessly integrate with your care, empowering patients to make sustainable lifestyle modifications and reduce their risk of heart attack and stroke, all within the TGA regulatory framework.
            </p>
            
            <h3 style="color: #1f2937; margin: 20px 0 15px 0; font-size: 18px; font-weight: 600;">What KGC Is:</h3>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
              KGC acts as a personalised health assistant for your patients. It combines your clinical guidance, delivered through Care Plan Directives (CPDs) you enter via the Doctor Dashboard, with Australian health guidelines and patient preferences. Using evidence-based techniques from Cognitive Behavioural Therapy (CBT) and Motivational Interviewing (MI), KGC provides non-diagnostic, educational support tailored to each individual.
            </p>
            
            <h3 style="color: #1f2937; margin: 20px 0 15px 0; font-size: 18px; font-weight: 600;">How KGC Works for You and Your Patients:</h3>
            <ul style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; padding-left: 20px;">
              <li style="margin-bottom: 10px;"><strong>Set Patient Directives:</strong> Easily enter personalised CPDs for Diet, Exercise/Wellness Routine, and Medication via your dedicated Doctor Dashboard. These directives form the foundation of the patient experience within the app.</li>
              <li style="margin-bottom: 10px;"><strong>Receive Patient Progress Reports (PPRs):</strong> Gain valuable insights into your patients engagement and self-reported progress through PPRs generated from their daily self-scores (1-10) and usage of the unique "Keep Going" motivation button.</li>
              <li style="margin-bottom: 10px;"><strong>Support Patient Adherence:</strong> KGC provides a supportive, engaging platform that helps keep patients motivated, subtly encouraging adherence to their care plan through personalised interactions and helpful features like curated health content and local service directories (presented via a friendly AI interface, our Supervisor Agent).</li>
              <li style="margin-bottom: 10px;"><strong>Safety and Escalation:</strong> KGC monitors patient engagement and query scope. If a patient stops using the app for 24+ hours or asks questions outside the scope of a Type 1 SaMD, KGC will notify you using the contact details provided. In the event of a medical emergency expressed by the patient (indicating risk of death, serious injury, or self-harm), KGC is programmed to recommend calling 000.</li>
            </ul>
            
            <h3 style="color: #1f2937; margin: 20px 0 15px 0; font-size: 18px; font-weight: 600;">Participate in the Mini Clinical Audit (MCA):</h3>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
              We invite you to participate in our Mini Clinical Audit, directly accessible through your Doctor Dashboard. By prescribing KGC to a minimum of 5 appropriate patients (those at risk of heart attack and stroke, suitable for primary prevention, and comfortable using technology), monitoring their progress via PPRs for 3 months, and measuring simple health outcomes, you can earn 5 hours of accredited CPD under the ACRRM and RACGP "Measuring Outcomes" category.
            </p>
            
            <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Terms and Conditions Agreement Required</h4>
              <p style="color: #92400e; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;">
                <strong>Terms and Conditions Summary:</strong><br>
                By using Keep Going Care, you agree to our Terms and Conditions. Please note the following key points:
              </p>
              <ul style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Data Privacy:</strong> All private health data is managed securely in accordance with applicable Australian state and federal privacy laws.</li>
                <li style="margin-bottom: 8px;"><strong>Software as a Medical Device (SaMD):</strong> KGC is a Class I SaMD providing non-diagnostic, educational support. It is not intended for diagnosis or treatment of any medical condition.</li>
                <li style="margin-bottom: 8px;"><strong>AI and LLM Limitations:</strong> KGC utilises Artificial Intelligence, including Large Language Models (LLMs). While powerful, LLMs are prone to occasional inaccuracies or hallucinations. All information provided by the KGC system is for educational purposes only and must not be considered definitive or acted upon until verified by a qualified healthcare professional.</li>
                <li style="margin-bottom: 8px;"><strong>Verification is Key:</strong> You, as the healthcare professional, remain responsible for all clinical decisions and for verifying any information presented by the KGC system in relation to your patients care.</li>
              </ul>
              <p style="color: #92400e; margin: 15px 0 0 0; font-size: 14px; font-weight: 600;">
                By using Keep Going Care, you confirm that you have read and agree to these terms.
              </p>
            </div>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0;">
              We are excited to partner with you in supporting your patients health journeys. You can access your account setup here:
            </p>
            
            <!-- Call to Action Button -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="${baseUrl}/doctor-login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                🔐 Complete Account Setup
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 15px 0 25px 0;">
              This secure setup link expires in 24 hours for your protection.
            </p>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0 15px 0;">
              <strong>Additional Resources:</strong>
            </p>
            <div style="text-align: center; margin: 15px 0 30px 0;">
              <a href="https://youtu.be/AitZI0VTYj8" style="background-color: #2E8BC0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 14px;">
                📹 Mini Clinical Audit Explainer Video
              </a>
            </div>
            
            <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0;">
              Sincerely,<br>
              <strong>The Keep Going Care Team</strong><br>
              Anthrocyt AI Pty Ltd
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2025 Keep Going Care. All rights reserved.<br>
              This is a secure, TGA-compliant healthcare communication.
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

      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return {
        success: false,
        message: 'Failed to send welcome email'
      };
    }
  }
}

// Clean up expired codes every 5 minutes
setInterval(() => {
  DoctorAuthService.cleanupExpiredCodes();
}, 5 * 60 * 1000);

export { DoctorAuthService as doctorAuthService };