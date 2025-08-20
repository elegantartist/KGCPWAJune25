import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { SMSService } from './smsService';
import { emailService } from './emailService';
import { VerificationCodeStorageService } from './verificationCodeStorageService';

// JWT secret for doctor authentication tokens - validation happens at runtime
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    console.error('JWT_SECRET environment variable not found or empty');
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set for production deployment');
  }
  console.log('JWT_SECRET loaded successfully for token generation');
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
  static generateSetupUrl(token: string, req?: any): string {
    // Use the request host if available, otherwise fallback to environment
    let baseUrl;
    if (req && req.get && req.get('host')) {
      const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      baseUrl = `${protocol}://${req.get('host')}`;
    } else {
      // Fallback to environment variables
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 
                           `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      baseUrl = `https://${replitDomain}`;
    }
    return `${baseUrl}/doctor-setup?token=${token}`;
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
  static async sendWelcomeEmail(doctorEmail: string, doctorName: string, doctorPhone: string, req?: any): Promise<{ success: boolean, message: string }> {
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
      const setupUrl = DoctorAuthService.generateSetupUrl(accessToken, req);

      // Get the correct Replit domain from environment or construct it
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 
                           `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const baseUrl = `https://${replitDomain}`;
      const loginUrl = `${baseUrl}/doctor-login`;

      const emailSubject = 'Welcome to Keep Going Care - Complete Your Account Setup';
      const emailHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="text-align: center; padding: 40px 20px 20px; background: linear-gradient(135deg, #2E8BC0 0%, #1e40af 100%);">
      <div style="background-color: white; padding: 15px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <img src="${baseUrl}/shared/logo" alt="KGC Logo" style="max-width: 120px; height: 60px; margin: 0 auto 10px;">
      </div>
      <h1 style="color: #ffffff; margin: 20px 0 0 0; font-size: 28px; font-weight: 600;">Welcome to Keep Going Care</h1>
    </div>

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
      <div style="text-align: center; margin: 25px 0;">
        <a href="${setupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
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
        <a href="https://youtu.be/AitZI0VTYj8" style="background-color: #2E8BC0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          📹 Mini Clinical Audit Explainer Video
        </a>
      </div>

      <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0;">
        Sincerely,<br>
        <strong>The Keep Going Care Team</strong><br>
        Anthrocyt AI Pty Ltd
      </p>
    </div>

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