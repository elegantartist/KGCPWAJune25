import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Input validation middleware
export function validateInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Remove any potentially dangerous characters from input
    if (req.body) {
      sanitizeObject(req.body);
    }
    if (req.query) {
      sanitizeObject(req.query);
    }
    if (req.params) {
      sanitizeObject(req.params);
    }
    next();
  } catch (error) {
    console.error('Input validation error:', error);
    res.status(400).json({ message: 'Invalid input data' });
  }
}

// Sanitize object recursively
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // Remove potential XSS attempts
    return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/javascript:/gi, '')
             .replace(/on\w+\s*=/gi, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
  }
  
  return obj;
}

// Rate limiting configurations
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use standard IP key generator with IPv6 support
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip} on endpoint: ${req.path}`);
    res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use standard IP key generator with IPv6 support
  keyGenerator: ipKeyGenerator
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Rate limit exceeded. Please wait before trying again.'
  }
});

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.openai.com https://api.anthropic.com wss:; " +
    "frame-ancestors 'none';"
  );
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

// CORS configuration for production
export function configureCORS() {
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:5000'];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS violation from origin: ${origin}`);
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  };
}

// Error handler that doesn't expose sensitive information
export function secureErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the full error for debugging
  console.error('Application Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Log security-relevant errors
  console.log(`Security error: ${err.message} for path: ${req.path} from IP: ${req.ip}`);

  // Return generic error message to client
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred processing your request'
    : err.message;

  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { details: err.stack })
  });
}

// Middleware to check for environment variable configuration
export function checkEnvironmentSecurity(req: Request, res: Response, next: NextFunction) {
  const requiredVars = [
    'SESSION_SECRET',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return res.status(500).json({ 
      error: 'Server configuration error. Please contact administrator.' 
    });
  }
  
  // Check for weak SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret && sessionSecret.length < 32) {
    console.error('SESSION_SECRET is too short. Minimum 32 characters required.');
    return res.status(500).json({ 
      error: 'Server configuration error. Please contact administrator.' 
    });
  }
  
  next();
}