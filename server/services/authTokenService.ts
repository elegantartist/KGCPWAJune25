import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { VerificationCodeStorageService } from './verificationCodeStorageService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const TOKEN_EXPIRY = '24h';
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

export async function generateDoctorSetupToken(doctorId: number, email: string, phone: string = ''): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiryMs = 24 * 60 * 60 * 1000; // 24 hours
  
  await VerificationCodeStorageService.setCode(
    doctorId,
    token,
    token,
    expiryMs,
    'setup_token',
    { emailForSetup: email, phoneForSetup: phone }
  );
  
  return token;
}

export async function validateSetupToken(token: string): Promise<{ valid: boolean; doctorId?: number; email?: string; phone?: string; error?: string }> {
  const tokenData = await VerificationCodeStorageService.getCode(0, token, 'setup_token');
  
  if (!tokenData) {
    return { valid: false, error: 'Invalid token' };
  }
  
  if (Date.now() > tokenData.expiresAt) {
    await VerificationCodeStorageService.deleteCode(0, token, 'setup_token');
    return { valid: false, error: 'Token expired' };
  }
  
  return {
    valid: true,
    doctorId: tokenData.userId,
    email: tokenData.emailForSetup,
    phone: tokenData.phoneForSetup
  };
}

export async function generateVerificationCode(phone: string, doctorId: number): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  await VerificationCodeStorageService.setCode(
    doctorId,
    phone,
    code,
    VERIFICATION_CODE_EXPIRY,
    'sms'
  );
  
  return code;
}

export async function verifyPhoneCode(phone: string, code: string, doctorId: number): Promise<{ valid: boolean; error?: string }> {
  const storedData = await VerificationCodeStorageService.getCode(doctorId, phone, 'sms');
  
  if (!storedData) {
    return { valid: false, error: 'No verification code found for this phone number' };
  }
  
  if (Date.now() > storedData.expiresAt) {
    await VerificationCodeStorageService.deleteCode(doctorId, phone, 'sms');
    return { valid: false, error: 'Verification code expired' };
  }
  
  if (storedData.attempts >= 3) {
    await VerificationCodeStorageService.deleteCode(doctorId, phone, 'sms');
    return { valid: false, error: 'Too many attempts' };
  }
  
  if (storedData.code !== code) {
    await VerificationCodeStorageService.incrementAttempts(doctorId, phone, 'sms', storedData);
    return { valid: false, error: 'Invalid verification code' };
  }
  
  // Code is valid, clean up
  await VerificationCodeStorageService.deleteCode(doctorId, phone, 'sms');
  return { valid: true };
}

// Cleanup is now handled automatically by VerificationCodeStorageService