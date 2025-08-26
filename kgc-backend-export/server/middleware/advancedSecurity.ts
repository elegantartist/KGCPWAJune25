/**
 * Advanced Security Middleware
 * Critical healthcare application security controls to prevent legal liability
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { auditLogger } from '../auditLogger';

/**
 * Enhanced Rate Limiting with Account Lockout
 * Prevents brute force attacks on healthcare systems
 */
export const createAdvancedRateLimit = (options: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req, res) => {
      const session = req.session as any;
      
      // Log rate limit violation
      auditLogger.logSecurityEvent({
        eventType: 'UNAUTHORIZED_ACCESS',
        userId: session?.userId,
        resource: req.path,
        method: req.method,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date(),
        additionalData: {
          endpoint: req.path,
          rateLimitWindow: options.windowMs,
          rateLimitMax: options.max
        }
      });
      
      // Implement account lockout for repeated violations
      if (session?.userId) {
        session.rateLimitViolations = (session.rateLimitViolations || 0) + 1;
        
        if (session.rateLimitViolations >= 3) {
          session.accountLocked = true;
          session.lockExpires = Date.now() + (30 * 60 * 1000); // 30 minutes
          
          auditLogger.logSecurityEvent({
            eventType: 'UNAUTHORIZED_ACCESS',
            userId: session.userId,
            userRole: session.userRole,
            ipAddress: req.ip || 'unknown',
            timestamp: new Date(),
            additionalData: {
              reason: 'RATE_LIMIT_VIOLATIONS',
              violationCount: session.rateLimitViolations,
              lockDuration: 30 * 60 * 1000
            }
          });
        }
      }
      
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

/**
 * Account Lockout Middleware
 * Prevents access to locked accounts
 */
export function accountLockoutCheck(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  if (session?.accountLocked) {
    const now = Date.now();
    
    if (session.lockExpires && now < session.lockExpires) {
      const remainingTime = Math.ceil((session.lockExpires - now) / 1000 / 60);
      
      return res.status(423).json({
        error: 'Account temporarily locked',
        code: 'ACCOUNT_LOCKED',
        remainingMinutes: remainingTime
      });
    } else {
      // Unlock expired locks
      delete session.accountLocked;
      delete session.lockExpires;
      delete session.rateLimitViolations;
    }
  }
  
  next();
}

/**
 * Input Sanitization and Validation
 * Prevents injection attacks on healthcare data
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value);
      }
    }
  }
  
  // Sanitize body data
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
}

/**
 * SQL Injection Prevention
 * Additional layer of protection for database queries
 */
export function sqlInjectionPrevention(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(\b(UNION|OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(--|\/\*|\*\/|;)/,
    /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i
  ];
  
  const checkForInjection = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };
  
  // Check query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && checkForInjection(value)) {
      auditLogger.logSecurityEvent({
        eventType: 'SQL_INJECTION_ATTEMPT',
        userId: (req.session as any)?.userId,
        resource: req.path,
        method: req.method,
        ipAddress: req.ip,
        timestamp: new Date(),
        additionalData: {
          parameter: key,
          suspiciousValue: '[REDACTED]',
          detectedPattern: 'SQL_INJECTION'
        }
      });
      
      return res.status(400).json({
        error: 'Invalid input detected',
        code: 'INPUT_VALIDATION_FAILED'
      });
    }
  }
  
  // Check body parameters
  if (req.body && typeof req.body === 'object') {
    const checkObjectForInjection = (obj: any, path: string = ''): boolean => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && checkForInjection(value)) {
          auditLogger.logSecurityEvent({
            eventType: 'UNAUTHORIZED_ACCESS',
            userId: (req.session as any)?.userId,
            resource: req.path,
            method: req.method,
            ipAddress: req.ip,
            timestamp: new Date(),
            additionalData: {
              bodyField: currentPath,
              suspiciousValue: '[REDACTED]',
              detectedPattern: 'SQL_INJECTION'
            }
          });
          return true;
        }
        
        if (typeof value === 'object' && value !== null) {
          if (checkObjectForInjection(value, currentPath)) return true;
        }
      }
      return false;
    };
    
    if (checkObjectForInjection(req.body)) {
      return res.status(400).json({
        error: 'Invalid input detected',
        code: 'INPUT_VALIDATION_FAILED'
      });
    }
  }
  
  next();
}

/**
 * XSS Prevention
 * Prevents cross-site scripting attacks
 */
export function xssProtection(req: Request, res: Response, next: NextFunction) {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["|']javascript:/gi
  ];
  
  const checkForXSS = (value: string): boolean => {
    return xssPatterns.some(pattern => pattern.test(value));
  };
  
  // Check all string inputs
  const checkStringInputs = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      return checkForXSS(obj);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (checkStringInputs(value, currentPath)) {
          auditLogger.logSecurityEvent({
            eventType: 'XSS_ATTEMPT',
            userId: (req.session as any)?.userId,
            resource: req.path,
            method: req.method,
            ipAddress: req.ip,
            timestamp: new Date(),
            additionalData: {
              field: currentPath,
              detectedPattern: 'XSS_SCRIPT'
            }
          });
          return true;
        }
      }
    }
    
    return false;
  };
  
  if (checkStringInputs(req.query) || checkStringInputs(req.body)) {
    return res.status(400).json({
      error: 'Potentially malicious content detected',
      code: 'XSS_DETECTED'
    });
  }
  
  next();
}

/**
 * Suspicious Activity Detection
 * Detects patterns that might indicate a security breach
 */
export function suspiciousActivityDetection(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  const now = Date.now();
  
  // Track request patterns (ensure session exists)
  if (!session) {
    return next();
  }
  
  if (!session.requestHistory) {
    session.requestHistory = [];
  }
  
  session.requestHistory.push({
    path: req.path,
    method: req.method,
    timestamp: now,
    ip: req.ip
  });
  
  // Keep only last 20 requests
  if (session.requestHistory.length > 20) {
    session.requestHistory = session.requestHistory.slice(-20);
  }
  
  // Detect suspicious patterns
  const recentRequests = session.requestHistory.filter((r: any) => now - r.timestamp < 60000); // Last minute
  
  if (recentRequests.length > 15) {
    auditLogger.logSecurityEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      userId: session?.userId,
      userRole: session?.userRole,
      resource: req.path,
      method: req.method,
      ipAddress: req.ip,
      timestamp: new Date(),
      additionalData: {
        requestCount: recentRequests.length,
        timeWindow: '60_seconds',
        pattern: 'HIGH_FREQUENCY_REQUESTS'
      }
    });
  }
  
  next();
}

// Rate limit configurations for different endpoints
export const authRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true
});

export const apiRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

export const phiRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 PHI requests per window
  keyGenerator: (req) => {
    const session = req.session as any;
    return session?.userId ? `user:${session.userId}` : req.ip;
  }
});

// Helper functions
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[\\]/g, '') // Remove backslashes
    .trim();
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}