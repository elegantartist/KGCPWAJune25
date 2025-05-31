import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate a secure JWT secret if not provided
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

interface TokenPayload {
  doctorId: number;
  email: string;
  phoneNumber: string;
  tokenType: 'setup' | 'login' | 'verification';
  iat: number;
  exp: number;
}

interface VerificationCode {
  code: string;
  phoneNumber: string;
  doctorId: number;
  expiresAt: Date;
  attempts: number;
}

// In-memory storage for verification codes (in production, use Redis or database)
const verificationCodes = new Map<string, VerificationCode>();

export class AuthTokenService {
  /**
   * Generate secure setup token for new doctor registration
   */
  static generateSetupToken(doctorId: number, email: string, phoneNumber: string): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      doctorId,
      email,
      phoneNumber,
      tokenType: 'setup'
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h',
      algorithm: 'HS256'
    });

    console.log(`Generated setup token for doctor ${doctorId} (${email})`);
    return token;
  }

  /**
   * Generate verification code for phone number verification
   */
  static generateVerificationCode(doctorId: number, phoneNumber: string): string {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const verificationData: VerificationCode = {
      code,
      phoneNumber,
      doctorId,
      expiresAt,
      attempts: 0
    };

    // Use phone number as key for easy lookup
    verificationCodes.set(phoneNumber, verificationData);

    // Clean up expired codes
    this.cleanupExpiredCodes();

    console.log(`Generated verification code for doctor ${doctorId} at ${phoneNumber}`);
    return code;
  }

  /**
   * Verify the provided code against stored verification
   */
  static verifyCode(phoneNumber: string, providedCode: string): { valid: boolean; error?: string; doctorId?: number } {
    const stored = verificationCodes.get(phoneNumber);
    
    if (!stored) {
      return { valid: false, error: 'No verification code found for this phone number' };
    }

    // Check expiration
    if (new Date() > stored.expiresAt) {
      verificationCodes.delete(phoneNumber);
      return { valid: false, error: 'Verification code has expired' };
    }

    // Check attempts (max 3)
    if (stored.attempts >= 3) {
      verificationCodes.delete(phoneNumber);
      return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
    }

    // Verify code
    if (stored.code !== providedCode) {
      stored.attempts++;
      return { valid: false, error: 'Invalid verification code' };
    }

    // Success - remove the code
    verificationCodes.delete(phoneNumber);
    return { valid: true, doctorId: stored.doctorId };
  }

  /**
   * Validate setup token and extract payload
   */
  static validateSetupToken(token: string): { valid: boolean; payload?: TokenPayload; error?: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      
      if (decoded.tokenType !== 'setup') {
        return { valid: false, error: 'Invalid token type' };
      }

      return { valid: true, payload: decoded };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Setup token has expired. Please contact admin for a new invitation.' };
      }
      
      return { valid: false, error: 'Invalid or malformed token' };
    }
  }

  /**
   * Generate login session token
   */
  static generateSessionToken(doctorId: number, email: string): string {
    const payload = {
      doctorId,
      email,
      tokenType: 'login' as const,
      sessionId: crypto.randomUUID()
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '8h', // Session expires in 8 hours
      algorithm: 'HS256'
    });

    console.log(`Generated session token for doctor ${doctorId}`);
    return token;
  }

  /**
   * Validate session token
   */
  static validateSessionToken(token: string): { valid: boolean; doctorId?: number; error?: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.tokenType !== 'login') {
        return { valid: false, error: 'Invalid session token' };
      }

      return { valid: true, doctorId: decoded.doctorId };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Session has expired. Please log in again.' };
      }
      
      return { valid: false, error: 'Invalid session token' };
    }
  }

  /**
   * Generate secure doctor dashboard URL with token
   */
  static generateDashboardURL(baseURL: string, token: string): string {
    return `${baseURL}/doctor-setup?token=${token}`;
  }

  /**
   * Clean up expired verification codes
   */
  private static cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [phoneNumber, data] of verificationCodes.entries()) {
      if (now > data.expiresAt) {
        verificationCodes.delete(phoneNumber);
      }
    }
  }

  /**
   * Get verification code status for admin debugging
   */
  static getVerificationStatus(phoneNumber: string): { exists: boolean; expiresAt?: Date; attempts?: number } {
    const stored = verificationCodes.get(phoneNumber);
    if (!stored) {
      return { exists: false };
    }

    return {
      exists: true,
      expiresAt: stored.expiresAt,
      attempts: stored.attempts
    };
  }

  /**
   * Force clear verification code (admin override)
   */
  static clearVerificationCode(phoneNumber: string): boolean {
    return verificationCodes.delete(phoneNumber);
  }
}

// Export individual functions for easier importing
export const generateDoctorSetupToken = AuthTokenService.generateSetupToken;
export const validateSetupToken = AuthTokenService.validateSetupToken;
export const generateVerificationCode = AuthTokenService.generateVerificationCode;
export const verifyPhoneCode = AuthTokenService.verifyCode;

export default AuthTokenService;