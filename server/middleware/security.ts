import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Rate limiting for video search endpoints
export const videoSearchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per window
  message: {
    error: 'Too many video search requests',
    message: 'Please wait before searching again',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin users in development
    return process.env.NODE_ENV === 'development' && req.user?.role === 'admin';
  }
});

// Rate limiting for AI-enhanced searches (more restrictive due to cost)
export const aiEnhancedSearchLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 AI requests per hour
  message: {
    error: 'AI search quota exceeded',
    message: 'AI-enhanced search temporarily limited. Please try again later.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Input validation for recipe search
export const validateRecipeSearch = [
  body('mealType')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Invalid meal type'),
  
  body('cuisineType')
    .optional()
    .isLength({ max: 50 })
    .matches(/^[a-zA-Z\s-]+$/)
    .withMessage('Invalid cuisine type'),
  
  body('dietaryPreferences')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Too many dietary preferences'),
  
  body('dietaryPreferences.*')
    .optional()
    .isLength({ max: 30 })
    .matches(/^[a-zA-Z\s-]+$/)
    .withMessage('Invalid dietary preference'),
  
  body('ingredients')
    .optional()
    .isArray({ max: 15 })
    .withMessage('Too many ingredients'),
  
  body('ingredients.*')
    .optional()
    .isLength({ max: 50 })
    .matches(/^[a-zA-Z\s-,]+$/)
    .withMessage('Invalid ingredient'),
  
  body('maxCookingTime')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Invalid cooking time'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Invalid limit')
];

// Input validation for exercise/wellness search
export const validateExerciseSearch = [
  body('category')
    .isIn(['exercise', 'wellness'])
    .withMessage('Category must be exercise or wellness'),
  
  body('intensity')
    .optional()
    .isIn(['low', 'moderate', 'high'])
    .withMessage('Invalid intensity level'),
  
  body('duration')
    .optional()
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .isLength({ max: 50 })
    .withMessage('Invalid duration'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Too many tags'),
  
  body('tags.*')
    .optional()
    .isLength({ max: 30 })
    .matches(/^[a-zA-Z\s-]+$/)
    .withMessage('Invalid tag'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Invalid limit')
];

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid input',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
  }
  next();
};

// Sanitize request body by removing potentially dangerous properties
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // Remove any properties that start with underscore or contain suspicious patterns
    const sanitized = Object.keys(req.body).reduce((acc, key) => {
      if (!key.startsWith('_') && !key.includes('$') && !key.includes('.')) {
        acc[key] = req.body[key];
      }
      return acc;
    }, {} as any);
    
    req.body = sanitized;
  }
  next();
};

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.tavily.com"],
      mediaSrc: ["'self'", "https://youtube.com", "https://www.youtube.com"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow YouTube embeds
});

// CORS configuration
export const corsConfig = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, /\.replit\.app$/]
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});

// Request size limiting middleware
export const limitRequestSize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 50 * 1024; // 50KB limit for API requests
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request body exceeds size limit'
    });
  }
  
  next();
};

// Secure logging function that removes sensitive data
export const secureLog = (message: string, data?: any) => {
  if (data) {
    const sanitizedData = { ...data };
    
    // Remove sensitive fields
    delete sanitizedData.password;
    delete sanitizedData.token;
    delete sanitizedData.authorization;
    
    // Truncate large objects
    if (sanitizedData.user) {
      sanitizedData.user = {
        id: sanitizedData.user.id,
        role: sanitizedData.user.role
      };
    }
    
    console.log(`[SECURE] ${message}:`, sanitizedData);
  } else {
    console.log(`[SECURE] ${message}`);
  }
};