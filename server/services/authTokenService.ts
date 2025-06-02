import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const TOKEN_EXPIRY = '24h';
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// In-memory storage for setup tokens and verification codes
const setupTokens = new Map<string, { doctorId: number; email: string; phone: string; expiresAt: Date }>();
const verificationCodes = new Map<string, { code: string; phone: string; doctorId: number; expiresAt: Date; attempts: number }>();

export function generateDoctorSetupToken(doctorId: number, email: string, phone: string = ''): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  setupTokens.set(token, {
    doctorId,
    email,
    phone,
    expiresAt
  });
  
  return token;
}

export function validateSetupToken(token: string): { valid: boolean; doctorId?: number; email?: string; phone?: string; error?: string } {
  const tokenData = setupTokens.get(token);
  
  if (!tokenData) {
    return { valid: false, error: 'Invalid token' };
  }
  
  if (new Date() > tokenData.expiresAt) {
    setupTokens.delete(token);
    return { valid: false, error: 'Token expired' };
  }
  
  return {
    valid: true,
    doctorId: tokenData.doctorId,
    email: tokenData.email,
    phone: tokenData.phone
  };
}

export function generateVerificationCode(phone: string, doctorId: number): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);
  
  verificationCodes.set(phone, {
    code,
    phone,
    doctorId,
    expiresAt,
    attempts: 0
  });
  
  return code;
}

export function verifyPhoneCode(phone: string, code: string): { valid: boolean; error?: string } {
  const storedData = verificationCodes.get(phone);
  
  if (!storedData) {
    return { valid: false, error: 'No verification code found for this phone number' };
  }
  
  if (new Date() > storedData.expiresAt) {
    verificationCodes.delete(phone);
    return { valid: false, error: 'Verification code expired' };
  }
  
  if (storedData.attempts >= 3) {
    verificationCodes.delete(phone);
    return { valid: false, error: 'Too many attempts' };
  }
  
  if (storedData.code !== code) {
    storedData.attempts++;
    return { valid: false, error: 'Invalid verification code' };
  }
  
  // Code is valid, clean up
  verificationCodes.delete(phone);
  return { valid: true };
}

// Clean up expired tokens and codes
export function cleanupExpired(): void {
  const now = new Date();
  
  // Clean up expired setup tokens
  for (const [token, data] of setupTokens.entries()) {
    if (now > data.expiresAt) {
      setupTokens.delete(token);
    }
  }
  
  // Clean up expired verification codes
  for (const [phone, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(phone);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpired, 5 * 60 * 1000);