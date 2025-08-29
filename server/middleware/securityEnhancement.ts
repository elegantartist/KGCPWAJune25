/**
 * Enhanced Security Middleware for KGC Healthcare Application
 * Provides comprehensive security hardening without breaking existing functionality
 */

import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../auditLogger';

// Security configuration constants
const SECURITY_CONFIG = {
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_MESSAGE_LENGTH: 2000,
  MAX_NOTES_LENGTH: 500,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_REQUESTS: 100,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  PASSWORD_MIN_LENGTH: 8,
  XSS_PATTERNS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ]
};

// Store rate limiting data in memory (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Enhanced input sanitization for healthcare data
 */
export function sanitizeHealthcareInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Invalid input data format' 
    });
  }
}

/**
 * Rate limiting middleware for API endpoints
 */
export function healthcareRateLimit(req: Request, res: Response, next: NextFunction) {
  const clientIdentifier = getClientIdentifier(req);
  const now = Date.now();
  
  // Clean up expired entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  const clientData = rateLimitStore.get(clientIdentifier);
  
  if (!clientData || now > clientData.resetTime) {
    // First request or reset window
    rateLimitStore.set(clientIdentifier, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW
    });
    next();
  } else if (clientData.count < SECURITY_CONFIG.RATE_LIMIT_REQUESTS) {
    // Within limit
    clientData.count++;
    next();
  } else {
    // Rate limit exceeded
    auditLogger.logSecurityEvent({
      eventType: 'RATE_LIMIT_EXCEEDED',
      severity: 'MEDIUM',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { endpoint: req.path, method: req.method }
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }
}

/**
 * Enhanced session security validation
 */
export function validateSecureSession(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  if (session?.userId) {
    const now = Date.now();
    const lastActivity = session.lastActivity || now;
    
    // Check session timeout
    if (now - lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.'
      });
    }
    
    // Update last activity
    session.lastActivity = now;
  }
  
  next();
}

/**
 * Healthcare-specific data validation
 */
export function validateHealthcareData(req: Request, res: Response, next: NextFunction) {
  const { body } = req;
  
  // Validate score ranges for healthcare metrics
  if (body.exerciseSelfScore !== undefined) {
    if (!isValidScore(body.exerciseSelfScore)) {
      return res.status(400).json({
        success: false,
        error: 'Exercise score must be a number between 1 and 10'
      });
    }
  }
  
  if (body.mealPlanSelfScore !== undefined) {
    if (!isValidScore(body.mealPlanSelfScore)) {
      return res.status(400).json({
        success: false,
        error: 'Meal plan score must be a number between 1 and 10'
      });
    }
  }
  
  if (body.medicationSelfScore !== undefined) {
    if (!isValidScore(body.medicationSelfScore)) {
      return res.status(400).json({
        success: false,
        error: 'Medication score must be a number between 1 and 10'
      });
    }
  }
  
  // Validate patient ID format
  if (body.patientId !== undefined) {
    const patientId = parseInt(body.patientId);
    if (isNaN(patientId) || patientId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid patient ID format'
      });
    }
  }
  
  next();
}

/**
 * Security headers middleware
 */
export function setSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HSTS for HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy for healthcare app
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://replit.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.openai.com https://api.anthropic.com"
  );
  
  next();
}

// Helper functions
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  } else if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  // Remove potential XSS patterns
  let sanitized = str;
  for (const pattern of SECURITY_CONFIG.XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.substring(0, SECURITY_CONFIG.MAX_MESSAGE_LENGTH);
  }
  
  return sanitized;
}

function isValidScore(score: any): boolean {
  return typeof score === 'number' && score >= 1 && score <= 10 && Number.isInteger(score);
}

function getClientIdentifier(req: Request): string {
  const session = req.session as any;
  return session?.userId ? `user_${session.userId}` : `ip_${req.ip}`;
}

// Export middleware functions for easy application
export const securityMiddleware = {
  sanitizeInput: sanitizeHealthcareInput,
  rateLimit: healthcareRateLimit,
  validateSession: validateSecureSession,
  validateData: validateHealthcareData,
  setHeaders: setSecurityHeaders
};