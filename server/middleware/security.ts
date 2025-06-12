import { IRateLimitMiddleware, IValidationMiddleware, ISanitizationMiddleware, ISecurityHeadersMiddleware, IAuditMiddleware, IValidationErrorHandler } from './security.d';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth';

// Rate limiting middleware implementations
export const videoSearchRateLimit: IRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 video searches per windowMs
  message: {
    error: 'Too many search requests from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit: IRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiQueryRateLimit: IRateLimitMiddleware = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 AI queries per hour
  message: {
    error: 'AI query limit exceeded, please try again after 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit: IRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
export const securityHeaders: ISecurityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.tavily.com"],
      mediaSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for YouTube embeds
});

// Validation middleware for recipe search
export const validateRecipeSearch: IValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const validationRules = [
    body('query')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Query must be between 1 and 200 characters'),
    
    body('mealType')
      .optional()
      .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
      .withMessage('Invalid meal type'),
    
    body('cuisineType')
      .optional()
      .isIn(['mediterranean', 'asian', 'american', 'italian', 'mexican', 'indian', 'chinese'])
      .withMessage('Invalid cuisine type'),
    
    body('dietaryPreferences')
      .optional()
      .isArray()
      .withMessage('Dietary preferences must be an array'),
    
    body('dietaryPreferences.*')
      .optional()
      .isIn(['omnivore', 'vegetarian', 'vegan', 'keto', 'low-carb', 'gluten-free', 'dairy-free', 'no-nuts', 'no-dairy', 'no-gluten', 'no-shellfish', 'no-soy'])
      .withMessage('Invalid dietary preference'),
  ];

  // Apply validation rules
  Promise.all(validationRules.map(validation => validation.run(req)))
    .then(() => next())
    .catch(next);
};

// Validation middleware for AI queries
export const validateAIQuery: IValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const validationRules = [
    body('queryText')
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Query text must be between 1 and 1000 characters'),
    
    body('sessionId')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Session ID must be between 1 and 100 characters'),
    
    body('requiresValidation')
      .optional()
      .isBoolean()
      .withMessage('requiresValidation must be a boolean'),
  ];

  Promise.all(validationRules.map(validation => validation.run(req)))
    .then(() => next())
    .catch(next);
};

// Validation middleware for SMS verification
export const validateSMSVerification: IValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const validationRules = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    
    body('code')
      .isString()
      .trim()
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('Code must be a 6-digit number'),
  ];

  Promise.all(validationRules.map(validation => validation.run(req)))
    .then(() => next())
    .catch(next);
};

// Request sanitization middleware
export const sanitizeRequestBody: ISanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Validation error handler
export const handleValidationErrors: IValidationErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
  }
  next();
};

// Audit logging middleware
export const auditLogger: IAuditMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.userId,
      userRole: req.user?.role,
      timestamp: new Date().toISOString(),
    };
    
    secureLog('info', 'API Request', logData);
  });
  
  next();
};

// Secure logging function - supports both parameter orders for compatibility
export const diagnosticLogger = (stepName: string) => (req: any, res: any, next: any) => {
  console.log(`[MIDDLEWARE_TRACE] Passed: ${stepName}`);
  next();
};

export const secureLog = (messageOrLevel: string | 'info' | 'warn' | 'error', messageOrMetadata?: string | any, metadata?: any) => {
  let level: 'info' | 'warn' | 'error';
  let message: string;
  let data: any;

  // Handle both parameter orders: (level, message, metadata) and (message, metadata)
  if (typeof messageOrLevel === 'string' && ['info', 'warn', 'error'].includes(messageOrLevel)) {
    level = messageOrLevel as 'info' | 'warn' | 'error';
    message = messageOrMetadata as string;
    data = metadata;
  } else {
    level = 'info';
    message = messageOrLevel as string;
    data = messageOrMetadata;
  }

  const sanitizedMetadata = data ? sanitizeObject(data) : {};
  const cleanMetadata = removeSensitiveData(sanitizedMetadata);
  
  console.log(`[${level.toUpperCase()}] ${message}`, cleanMetadata);
};

// Helper functions
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeString(key)] = sanitizeObject(value);
  }
  
  return sanitized;
}

function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
    .trim();
}

function removeSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeSensitiveData(item));
  }
  
  const cleaned: any = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey));
    
    if (isSensitive) {
      cleaned[key] = '[REDACTED]';
    } else {
      cleaned[key] = removeSensitiveData(value);
    }
  }
  
  return cleaned;
}