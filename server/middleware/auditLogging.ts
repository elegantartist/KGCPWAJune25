import { Request, Response, NextFunction } from 'express';

// Comprehensive audit logging middleware for healthcare compliance
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  const startTime = Date.now();
  
  // Capture response data
  const originalJson = res.json;
  let responseData: any = null;
  let statusCode: number = 200;
  
  res.json = function(data: any) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson.call(this, data);
  };
  
  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Determine if this is a PHI/PII access
    const isPHIAccess = isPHIEndpoint(req.path, req.method);
    const isAdminAction = isAdminEndpoint(req.path);
    const isAuthAction = isAuthEndpoint(req.path);
    
    // Log PHI/PII access
    if (isPHIAccess && session?.userId) {
      console.log(`PHI Access: User ${session.userId} ${req.method} ${req.path} - Status: ${statusCode}`);
    }
    
    // Log administrative actions
    if (isAdminAction && session?.userId) {
      console.log(`Admin Action: User ${session.userId} ${req.method} ${req.path} - Status: ${statusCode}`);
    }
    
    // Log authentication attempts
    if (isAuthAction) {
      console.log(`Auth Attempt: ${req.path} from IP: ${req.ip} - Status: ${statusCode}`);
    }
    
    // Log security events for failed requests
    if (statusCode === 401 || statusCode === 403) {
      console.log(`Security Event: ${statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'} - ${req.path} from IP: ${req.ip}`);
    }
    
    // Log high-risk events
    if (statusCode >= 500) {
      console.log(`System Error: ${req.path} - Status: ${statusCode} - IP: ${req.ip}`);
    }
  });
  
  next();
}

// Determine if endpoint accesses PHI/PII
function isPHIEndpoint(path: string, method: string): boolean {
  const phiPatterns = [
    /^\/api\/patients?\//,
    /^\/api\/health-metrics/,
    /^\/api\/care-plan-directives/,
    /^\/api\/patient-progress-reports/,
    /^\/api\/chat/,
    /^\/api\/recommendations/,
    /^\/api\/patient-scores/,
    /^\/api\/daily-self-scores/
  ];
  
  return phiPatterns.some(pattern => pattern.test(path)) || 
         (method === 'GET' && path.includes('patient')) ||
         (method === 'POST' && path.includes('score'));
}

// Determine if endpoint is an admin action
function isAdminEndpoint(path: string): boolean {
  const adminPatterns = [
    /^\/api\/admin\//,
    /^\/api\/doctors\/create/,
    /^\/api\/patients\/create/,
    /^\/api\/users\/deactivate/,
    /^\/api\/system\//
  ];
  
  return adminPatterns.some(pattern => pattern.test(path));
}

// Determine if endpoint is an auth action
function isAuthEndpoint(path: string): boolean {
  const authPatterns = [
    /^\/api\/auth\//,
    /^\/api\/login/,
    /^\/api\/logout/,
    /^\/api\/sms-verify/
  ];
  
  return authPatterns.some(pattern => pattern.test(path));
}

// Extract resource information from request
function extractResourceInfo(req: Request): string {
  const resourceId = req.params.id || req.params.patientId || req.params.doctorId;
  if (resourceId) {
    return `${req.path.split('/')[2]}:${resourceId}`;
  }
  
  return req.path.split('/')[2] || 'unknown';
}

// Sanitize data for logging (remove sensitive information)
function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'verificationCode', 'adminPassword', 
    'authToken', 'sessionId', 'phoneNumber', 'email'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
}

// Middleware to log data modifications
export function dataModificationLogger(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  // Only log data modification operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Log successful data modifications
      if (res.statusCode < 400) {
        console.log(`Data Modification: User ${session?.userId || 'anonymous'} ${req.method} ${req.path}`);
      }
      
      return originalJson.call(this, data);
    };
  }
  
  next();
}