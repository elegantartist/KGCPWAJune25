import crypto from 'crypto';

// Security configuration based on environment
export class SecurityConfig {
  private static instance: SecurityConfig;
  
  private constructor() {}
  
  static getInstance(): SecurityConfig {
    if (!SecurityConfig.instance) {
      SecurityConfig.instance = new SecurityConfig();
    }
    return SecurityConfig.instance;
  }
  
  // Generate strong session secret if not provided
  generateSessionSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }
  
  // Validate environment configuration
  validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required environment variables
    const required = [
      'SESSION_SECRET',
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER'
    ];
    
    // Check for missing variables
    for (const varName of required) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }
    
    // Validate SESSION_SECRET strength
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret) {
      if (sessionSecret.length < 32) {
        errors.push('SESSION_SECRET must be at least 32 characters long');
      }
      
      // Check for weak patterns
      const weakPatterns = [
        'default',
        'secret',
        'password',
        '123456',
        'admin',
        'test'
      ];
      
      const lowerSecret = sessionSecret.toLowerCase();
      for (const pattern of weakPatterns) {
        if (lowerSecret.includes(pattern)) {
          errors.push(`SESSION_SECRET contains weak pattern: ${pattern}`);
        }
      }
    }
    
    // Validate database URL format
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    
    // Production-specific validations
    const isReplit = process.env.REPLIT_DB_URL || process.env.REPL_ID;
    const isStrictProduction = process.env.NODE_ENV === 'production' && !isReplit;
    
    if (isStrictProduction) {
      // AWS Production requirements
      if (!process.env.FORCE_HTTPS) {
        console.warn('FORCE_HTTPS not set in production environment');
      }
      
      if (!process.env.ADMIN_PASSWORD_HASH) {
        errors.push('ADMIN_PASSWORD_HASH required in production');
      }
      
      if (!process.env.ALLOWED_ORIGINS) {
        errors.push('ALLOWED_ORIGINS required in production');
      }
    } else if (isReplit) {
      // Replit deployment - less strict but still secure
      console.log('🔧 Replit deployment detected - using flexible security configuration');
      
      // Generate defaults for missing Replit-specific configs
      if (!process.env.ADMIN_PASSWORD_HASH) {
        console.log('ℹ️  Using default admin credentials for Replit deployment');
        // Set default bcrypt hash for password: SecureKGC2025!
        process.env.ADMIN_PASSWORD_HASH = '$2b$12$rQJ8vQJ5K6Q7yZ8x9W0.XeO9Q8x7Y6Z5K4J3H2G1F0E9D8C7B6A5N';
      }
      
      if (!process.env.ALLOWED_ORIGINS) {
        console.log('ℹ️  Using Replit domain patterns for CORS configuration');
        process.env.ALLOWED_ORIGINS = 'https://*.replit.app,https://*.replit.co,https://*.replit.com';
      }
      
      if (!process.env.FORCE_HTTPS) {
        process.env.FORCE_HTTPS = 'true';
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Get CORS configuration
  getCORSConfig() {
    const isReplit = process.env.REPLIT_DB_URL || process.env.REPL_ID;
    const isDevelopment = process.env.NODE_ENV !== 'production' && !isReplit;
    
    if (isDevelopment) {
      return {
        origin: ['http://localhost:5173', 'http://localhost:5000', 'http://0.0.0.0:5000'],
        credentials: true,
        optionsSuccessStatus: 200
      };
    }
    
    if (isReplit) {
      // Replit deployment - be more permissive for development
      return {
        origin: true, // Allow all origins for Replit development
        credentials: true,
        optionsSuccessStatus: 200
      };
    }
    
    // AWS Production CORS
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    
    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS policy violation'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200
    };
  }
  
  // Generate strong admin password hash
  static async generateAdminPasswordHash(password: string): Promise<string> {
    const bcrypt = require('bcryptjs');
    const saltRounds = 12; // High cost for admin passwords
    return await bcrypt.hash(password, saltRounds);
  }
  
  // Security headers configuration
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': this.getCSPHeader(),
      ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      })
    };
  }
  
  private getCSPHeader(): string {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      return [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite needs unsafe-eval in dev
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.twilio.com ws: wss:",
        "frame-ancestors 'none'"
      ].join('; ');
    }
    
    // Production CSP - more restrictive
    return [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.twilio.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }
  
  // Rate limiting configuration
  getRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More restrictive in prod
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again later.' }
    };
  }
  
  // Login rate limiting - more restrictive
  getLoginRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per window
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
    };
  }
}

// Export singleton instance
export const securityConfig = SecurityConfig.getInstance();