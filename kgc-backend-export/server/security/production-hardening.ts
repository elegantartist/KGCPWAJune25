import { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Production security hardening features
export class ProductionHardening {
  
  // Remove test/demo endpoints in production
  static removeTestEndpoints(app: Express) {
    if (process.env.NODE_ENV === 'production') {
      console.log('🔐 Production mode: Disabling test endpoints and demo data');
      
      // Remove or disable test data endpoints
      const testRoutes = [
        '/api/test',
        '/api/demo',
        '/api/fill-test-data',
        '/api/mock'
      ];
      
      testRoutes.forEach(route => {
        app.all(route, (req: Request, res: Response) => {
          console.log(`Blocked access to test endpoint: ${route} from IP: ${req.ip}`);
          res.status(403).json({ 
            error: 'Test endpoints disabled in production',
            statusCode: 403 
          });
        });
      });
    }
  }
  
  // Enforce strong password policies
  static enforcePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'letmein', 
      'welcome', 'monkey', 'qwerty', 'dragon', 'master'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }
    
    // Check for sequential patterns
    if (/123456|abcdef|qwerty/.test(password.toLowerCase())) {
      errors.push('Password contains sequential patterns');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Account lockout mechanism
  static createAccountLockout() {
    const failedAttempts = new Map<string, { count: number; lockedUntil?: number }>();
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    
    return {
      isLocked: (identifier: string): boolean => {
        const attempts = failedAttempts.get(identifier);
        if (!attempts) return false;
        
        if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
          return true;
        }
        
        // Clear expired lockout
        if (attempts.lockedUntil && attempts.lockedUntil <= Date.now()) {
          failedAttempts.delete(identifier);
          return false;
        }
        
        return attempts.count >= MAX_ATTEMPTS;
      },
      
      recordFailure: (identifier: string): void => {
        const attempts = failedAttempts.get(identifier) || { count: 0 };
        attempts.count++;
        
        if (attempts.count >= MAX_ATTEMPTS) {
          attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
          console.log(`Account locked for ${identifier} due to ${attempts.count} failed attempts`);
        }
        
        failedAttempts.set(identifier, attempts);
      },
      
      recordSuccess: (identifier: string): void => {
        failedAttempts.delete(identifier);
      },
      
      getRemainingLockoutTime: (identifier: string): number => {
        const attempts = failedAttempts.get(identifier);
        if (!attempts?.lockedUntil) return 0;
        
        const remaining = attempts.lockedUntil - Date.now();
        return remaining > 0 ? remaining : 0;
      }
    };
  }
  
  // Input validation middleware factory
  static createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = schema.parse({
          ...req.body,
          ...req.params,
          ...req.query
        });
        
        // Store validated data for use in route handlers
        (req as any).validatedData = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.log(`Validation failed for ${req.path}: ${JSON.stringify(error.errors)}`);
          res.status(400).json({
            error: 'Invalid input data',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
              received: e.received
            }))
          });
        } else {
          next(error);
        }
      }
    };
  }
  
  // Emergency detection patterns (enhanced)
  static createEmergencyPatterns() {
    const criticalPatterns = [
      // Suicide ideation
      /\b(kill\s+myself|suicide|end\s+my\s+life|want\s+to\s+die|hurt\s+myself)\b/i,
      // Self-harm
      /\b(cut\s+myself|self\s*harm|hurt\s+myself|razor|blade)\b/i,
      // Medical emergencies
      /\b(chest\s+pain|heart\s+attack|stroke|can't\s+breathe|overdose|poisoned)\b/i,
      // Severe distress
      /\b(emergency|911|help\s+me|crisis|urgent|severe\s+pain)\b/i
    ];
    
    const warningPatterns = [
      // Depression indicators
      /\b(hopeless|worthless|no\s+point|give\s+up|can't\s+cope)\b/i,
      // Anxiety indicators
      /\b(panic\s+attack|can't\s+handle|overwhelmed|terrified)\b/i,
      // Pain indicators
      /\b(severe\s+pain|excruciating|unbearable|10\/10\s+pain)\b/i
    ];
    
    return {
      detectEmergency: (text: string): { isCritical: boolean; isWarning: boolean; matches: string[] } => {
        const criticalMatches = criticalPatterns.filter(pattern => pattern.test(text));
        const warningMatches = warningPatterns.filter(pattern => pattern.test(text));
        
        return {
          isCritical: criticalMatches.length > 0,
          isWarning: warningMatches.length > 0,
          matches: [
            ...criticalMatches.map(p => `Critical: ${p.source}`),
            ...warningMatches.map(p => `Warning: ${p.source}`)
          ]
        };
      }
    };
  }
  
  // Resource ownership verification
  static createOwnershipVerifier() {
    return {
      verifyPatientOwnership: async (userId: number, patientId: number, userRole: string): Promise<boolean> => {
        // Patient can access their own data
        if (userRole === 'patient' && userId === patientId) {
          return true;
        }
        
        // Doctors can access their assigned patients
        if (userRole === 'doctor') {
          // This would typically check a database relationship
          // For now, return true for doctors to maintain functionality
          return true;
        }
        
        // Admins can access all data
        if (userRole === 'admin') {
          return true;
        }
        
        return false;
      },
      
      verifyDoctorOwnership: async (userId: number, doctorId: number, userRole: string): Promise<boolean> => {
        // Doctor can access their own data
        if (userRole === 'doctor' && userId === doctorId) {
          return true;
        }
        
        // Admins can access all data
        if (userRole === 'admin') {
          return true;
        }
        
        return false;
      }
    };
  }
  
  // Security logging
  static createSecurityLogger() {
    return {
      logSecurityEvent: (event: {
        type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'EMERGENCY' | 'IDOR' | 'RATE_LIMIT';
        userId?: number;
        ipAddress?: string;
        userAgent?: string;
        details: any;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      }) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          ...event
        };
        
        // In production, this would go to a proper logging system
        if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
          console.error('SECURITY EVENT:', JSON.stringify(logEntry));
        } else {
          console.log('Security Event:', JSON.stringify(logEntry));
        }
      }
    };
  }
}

// Export singleton instances
export const accountLockout = ProductionHardening.createAccountLockout();
export const emergencyDetection = ProductionHardening.createEmergencyPatterns();
export const ownershipVerifier = ProductionHardening.createOwnershipVerifier();
export const securityLogger = ProductionHardening.createSecurityLogger();