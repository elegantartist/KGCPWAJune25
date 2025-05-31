import crypto from 'crypto';
import { storage } from '../storage';
import { passwordValidationService } from './passwordValidationService';
import { inputSanitizationService } from './inputSanitizationService';
import { emailService } from './emailService';

interface CreateDoctorParams {
  name: string;
  email: string;
  password: string;
  phone?: string;
  speciality?: string;
  sendWelcomeEmail?: boolean;
}

interface CreatePatientParams {
  name: string;
  email: string;
  password: string;
  phone?: string;
  doctorId: number;
  sendWelcomeEmail?: boolean;
}

interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  emailSent?: boolean;
}

export class AuthService {
  async createDoctorWithEmail(params: CreateDoctorParams): Promise<AuthResult> {
    try {
      // Sanitize inputs
      const sanitizedName = inputSanitizationService.sanitizeInput(params.name, 'text').sanitized;
      const sanitizedEmail = inputSanitizationService.sanitizeInput(params.email, 'email').sanitized;
      const sanitizedPhone = params.phone ? inputSanitizationService.sanitizeInput(params.phone, 'phone').sanitized : undefined;
      const sanitizedSpeciality = params.speciality ? inputSanitizationService.sanitizeInput(params.speciality, 'text').sanitized : undefined;

      // Validate password
      const passwordValidation = passwordValidationService.validatePassword(params.password, {
        name: sanitizedName,
        email: sanitizedEmail
      });

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.feedback.join(', ')}`
        };
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(sanitizedEmail);
      if (existingUser) {
        return {
          success: false,
          error: 'A user with this email already exists'
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(params.password);

      // Create doctor
      const doctor = await storage.createUser({
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        phone: sanitizedPhone,
        role: 'doctor',
        speciality: sanitizedSpeciality,
        isActive: true
      });

      let emailSent = false;

      // Send welcome email if requested
      if (params.sendWelcomeEmail !== false) {
        const emailResult = await emailService.sendDoctorWelcomeEmail({
          doctorEmail: sanitizedEmail,
          doctorName: sanitizedName
        });
        emailSent = emailResult.success;
        
        if (!emailResult.success) {
          console.warn(`Welcome email failed for doctor ${sanitizedEmail}: ${emailResult.error}`);
        }
      }

      return {
        success: true,
        user: this.sanitizeUserForResponse(doctor),
        emailSent
      };

    } catch (error: any) {
      console.error('Create doctor error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create doctor'
      };
    }
  }

  async createPatientWithEmail(params: CreatePatientParams): Promise<AuthResult> {
    try {
      // Sanitize inputs
      const sanitizedName = inputSanitizationService.sanitizeInput(params.name, 'text').sanitized;
      const sanitizedEmail = inputSanitizationService.sanitizeInput(params.email, 'email').sanitized;
      const sanitizedPhone = params.phone ? inputSanitizationService.sanitizeInput(params.phone, 'phone').sanitized : undefined;

      // Validate password
      const passwordValidation = passwordValidationService.validatePassword(params.password, {
        name: sanitizedName,
        email: sanitizedEmail
      });

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.feedback.join(', ')}`
        };
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(sanitizedEmail);
      if (existingUser) {
        return {
          success: false,
          error: 'A user with this email already exists'
        };
      }

      // Get doctor info for welcome email
      const doctor = await storage.getUser(params.doctorId);
      if (!doctor) {
        return {
          success: false,
          error: 'Invalid doctor ID'
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(params.password);

      // Create patient
      const patient = await storage.createUser({
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
        phone: sanitizedPhone,
        role: 'patient',
        doctorId: params.doctorId,
        isActive: true
      });

      let emailSent = false;

      // Send welcome email if requested
      if (params.sendWelcomeEmail !== false) {
        const emailResult = await emailService.sendPatientWelcomeEmail({
          patientEmail: sanitizedEmail,
          patientName: sanitizedName,
          doctorName: doctor.name
        });
        emailSent = emailResult.success;
        
        if (!emailResult.success) {
          console.warn(`Welcome email failed for patient ${sanitizedEmail}: ${emailResult.error}`);
        }
      }

      return {
        success: true,
        user: this.sanitizeUserForResponse(patient),
        emailSent
      };

    } catch (error: any) {
      console.error('Create patient error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create patient'
      };
    }
  }

  async createPasswordResetToken(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const sanitizedEmail = inputSanitizationService.sanitizeInput(email, 'email').sanitized;
      
      const user = await storage.getUserByEmail(sanitizedEmail);
      if (!user) {
        // Don't reveal if email exists for security
        return { success: true };
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store reset token (you'd need to add this to storage interface)
      // For now, we'll just send the email
      
      const emailResult = await emailService.sendPasswordResetEmail(
        sanitizedEmail,
        resetToken,
        user.name
      );

      if (!emailResult.success) {
        console.error(`Password reset email failed for ${sanitizedEmail}: ${emailResult.error}`);
      }

      return { success: true };

    } catch (error: any) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Failed to process password reset request'
      };
    }
  }

  private async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt or similar
    // For demo purposes, using simple crypto
    return crypto.createHash('sha256').update(password + 'kgc_salt').digest('hex');
  }

  private sanitizeUserForResponse(user: any): any {
    // Remove password and other sensitive fields
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();