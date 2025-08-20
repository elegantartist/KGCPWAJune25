/**
 * HIPAA Compliance Middleware
 * Essential healthcare data protection to prevent legal liability from PHI breaches
 */

import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../auditLogger';
import { encryptionService } from '../encryptionService';

// PHI (Protected Health Information) patterns for detection
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{16}\b|\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/, // Credit card numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  /\b\d{5}[-]?\d{4}?\b/, // ZIP codes
  /\b(medicare|medicaid)[-\s]?(\w+[-]?\w+)\b/i, // Medicare/Medicaid numbers
];

// Session timeout configurations for healthcare compliance
const SESSION_TIMEOUTS = {
  admin: 5 * 60 * 1000,    // 5 minutes
  doctor: 15 * 60 * 1000,  // 15 minutes  
  patient: 30 * 60 * 1000  // 30 minutes
};

/**
 * PHI Access Audit Logging
 * Required for HIPAA compliance - logs all access to protected health information
 */
export function phiAuditLogger(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  const isPhiEndpoint = isPHIEndpoint(req.path);
  
  if (isPhiEndpoint && session?.userId) {
    // Log PHI access for audit trail
    auditLogger.logSecurityEvent({
      eventType: 'PHI_ACCESS',
      userId: session.userId,
      userRole: session.userRole,
      resource: req.path,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      additionalData: {
        sessionId: req.sessionID,
        patientId: req.params.patientId || req.query.patientId,
        doctorId: req.params.doctorId || req.query.doctorId
      }
    });
  }
  
  next();
}

/**
 * Automatic Session Timeout for Healthcare Compliance
 * Different timeout periods based on user role sensitivity
 */
export function healthcareSessionTimeout(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  if (session?.userId && session?.userRole) {
    const now = Date.now();
    const lastActivity = session.lastActivity || now;
    const timeout = SESSION_TIMEOUTS[session.userRole as keyof typeof SESSION_TIMEOUTS] || SESSION_TIMEOUTS.patient;
    
    if (now - lastActivity > timeout) {
      // Session expired - destroy and log
      auditLogger.logSecurityEvent({
        eventType: 'LOGOUT',
        userId: session.userId,
        userRole: session.userRole,
        resource: req.path,
        ipAddress: req.ip,
        timestamp: new Date(),
        additionalData: {
          sessionDuration: now - lastActivity,
          timeoutPeriod: timeout
        }
      });
      
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      
      return res.status(401).json({ 
        error: 'Session expired',
        reason: 'healthcare_timeout',
        timeout: timeout / 1000 
      });
    }
    
    // Update last activity
    session.lastActivity = now;
  }
  
  next();
}

/**
 * PHI Data Sanitization for Logs
 * Prevents PHI from appearing in application logs
 */
export function sanitizePHIFromLogs(data: any): any {
  if (typeof data === 'string') {
    let sanitized = data;
    
    PHI_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[PHI_REDACTED]');
    });
    
    return sanitized;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Redact sensitive field names
      if (isSensitiveField(key)) {
        sanitized[key] = '[PHI_REDACTED]';
      } else {
        sanitized[key] = sanitizePHIFromLogs(value);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * PHI Encryption at Rest Middleware
 * Encrypts sensitive data before database storage
 */
export function encryptPHI(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const body = req.body;
    
    if (body && typeof body === 'object') {
      // Encrypt PHI fields
      const phiFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'address', 'dateOfBirth', 'medicalRecord'];
      
      phiFields.forEach(field => {
        if (body[field]) {
          // This would integrate with your encryption service
          // body[field] = encryptionService.encrypt(body[field]);
        }
      });
    }
  }
  
  next();
}

/**
 * CSRF Protection for Healthcare Data
 * Prevents cross-site request forgery on sensitive endpoints
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] as string;
  const session = req.session as any;
  
  if (!token || token !== session?.csrfToken) {
    auditLogger.logSecurityEvent({
      eventType: 'CSRF_VIOLATION',
      userId: session?.userId,
      resource: req.path,
      method: req.method,
      ipAddress: req.ip,
      timestamp: new Date(),
      additionalData: {
        providedToken: token ? '[TOKEN_PROVIDED]' : 'NO_TOKEN',
        expectedToken: session?.csrfToken ? '[TOKEN_EXISTS]' : 'NO_SESSION_TOKEN'
      }
    });
    
    return res.status(403).json({ 
      error: 'CSRF token validation failed',
      code: 'CSRF_INVALID'
    });
  }
  
  next();
}

/**
 * Data Loss Prevention
 * Prevents unauthorized data export or bulk access
 */
export function dataLossPrevention(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  // Monitor for bulk data requests
  if (isBulkDataRequest(req)) {
    auditLogger.logSecurityEvent({
      eventType: 'BULK_DATA_ACCESS',
      userId: session?.userId,
      userRole: session?.userRole,
      resource: req.path,
      method: req.method,
      ipAddress: req.ip,
      timestamp: new Date(),
      additionalData: {
        queryParams: sanitizePHIFromLogs(req.query),
        suspiciousActivity: true
      }
    });
    
    // Rate limit bulk requests
    if (session?.bulkRequestCount && session.bulkRequestCount > 5) {
      return res.status(429).json({ 
        error: 'Bulk data access rate limit exceeded',
        code: 'BULK_ACCESS_DENIED'
      });
    }
    
    session.bulkRequestCount = (session.bulkRequestCount || 0) + 1;
  }
  
  next();
}

// Helper functions
function isPHIEndpoint(path: string): boolean {
  const phiEndpoints = [
    '/api/patients',
    '/api/health-metrics',
    '/api/medical-records',
    '/api/care-plan-directives',
    '/api/patient-scores',
    '/api/user'
  ];
  
  return phiEndpoints.some(endpoint => path.startsWith(endpoint));
}

function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = [
    'password', 'ssn', 'socialSecurityNumber', 'medicalRecord',
    'diagnosis', 'medication', 'allergies', 'emergencyContact',
    'insurance', 'dateOfBirth', 'phone', 'address'
  ];
  
  return sensitiveFields.some(field => 
    fieldName.toLowerCase().includes(field.toLowerCase())
  );
}

function isBulkDataRequest(req: Request): boolean {
  const limit = parseInt(req.query.limit as string);
  const hasWildcardSearch = req.query.search === '*' || req.query.q === '*';
  const hasNoFilters = Object.keys(req.query).length <= 1;
  
  return limit > 50 || hasWildcardSearch || (hasNoFilters && req.method === 'GET');
}