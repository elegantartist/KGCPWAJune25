# Security Checklist

## Overview
This document provides comprehensive security guidelines and checklists for the KGC Healthcare Platform. It covers OWASP Top 10 vulnerabilities, secrets management, access controls, audit logging, and dependency management, with special considerations for Australian healthcare compliance.

## OWASP Top 10 Security Controls

### A01:2021 – Broken Access Control

#### Implementation Checklist
- [ ] **Role-Based Access Control (RBAC) Implemented**
  ```typescript
  // Middleware example
  export const requireRole = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  };
  ```

- [ ] **Resource-Level Authorization**
  ```typescript
  // Patient data access control
  export const requirePatientAccess = async (req: Request, res: Response, next: NextFunction) => {
    const { patientId } = req.params;
    const user = req.user;
    
    // Patients can only access their own data
    if (user.role === 'patient' && user.id !== patientId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Doctors can only access their assigned patients
    if (user.role === 'doctor') {
      const hasAccess = await checkDoctorPatientRelation(user.id, patientId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Patient not assigned' });
      }
    }
    
    next();
  };
  ```

- [ ] **Session Management Security**
  - Session timeout: 2 hours for patients, 8 hours for doctors
  - Secure session cookies (httpOnly, secure, sameSite)
  - Session invalidation on role changes
  - Concurrent session limits

- [ ] **API Endpoint Protection**
  - All endpoints require authentication
  - Rate limiting per user/IP
  - Input validation on all parameters
  - Response filtering based on user permissions

#### Testing Checklist
- [ ] Attempt to access resources without authentication
- [ ] Try to access other users' data
- [ ] Test privilege escalation scenarios
- [ ] Verify session timeout functionality
- [ ] Test concurrent session handling

### A02:2021 – Cryptographic Failures

#### Implementation Checklist
- [ ] **Data Encryption at Rest**
  ```typescript
  // PII encryption service
  import crypto from 'crypto';
  
  export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;
    
    constructor(encryptionKey: string) {
      this.key = Buffer.from(encryptionKey, 'base64');
    }
    
    encrypt(data: string): { encrypted: string; iv: string; tag: string } {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.key);
      cipher.setAAD(Buffer.from('healthcare-data'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    }
    
    decrypt(encrypted: string, iv: string, tag: string): string {
      const decipher = crypto.createDecipher(this.algorithm, this.key);
      decipher.setAAD(Buffer.from('healthcare-data'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    }
  }
  ```

- [ ] **Data Encryption in Transit**
  - TLS 1.3 minimum for all connections
  - Certificate pinning for external APIs
  - Encrypted database connections
  - Secure WebSocket connections (wss://)

- [ ] **Key Management**
  - Encryption keys stored in AWS Secrets Manager
  - Key rotation every 90 days
  - Separate keys for different data types
  - Hardware security modules (HSM) for production

- [ ] **Password Security**
  ```typescript
  import bcrypt from 'bcryptjs';
  
  export class PasswordService {
    private static readonly SALT_ROUNDS = 12;
    
    static async hash(password: string): Promise<string> {
      // Validate password strength
      if (!this.validatePassword(password)) {
        throw new Error('Password does not meet security requirements');
      }
      
      return bcrypt.hash(password, this.SALT_ROUNDS);
    }
    
    static async verify(password: string, hash: string): Promise<boolean> {
      return bcrypt.compare(password, hash);
    }
    
    private static validatePassword(password: string): boolean {
      // Minimum 12 characters, mixed case, numbers, special characters
      const minLength = 12;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      return password.length >= minLength && 
             hasUppercase && hasLowercase && 
             hasNumbers && hasSpecialChar;
    }
  }
  ```

#### Testing Checklist
- [ ] Verify TLS configuration with SSL Labs test
- [ ] Test password hashing strength
- [ ] Validate encryption key storage security
- [ ] Check for hardcoded secrets in code
- [ ] Test key rotation procedures

### A03:2021 – Injection

#### Implementation Checklist
- [ ] **SQL Injection Prevention**
  ```typescript
  // Use parameterized queries with Drizzle ORM
  import { eq, and } from 'drizzle-orm';
  import { users, dailyScores } from './schema';
  
  // Good: Parameterized query
  export const getUserScores = async (userId: string, date: string) => {
    return db.select()
      .from(dailyScores)
      .where(and(
        eq(dailyScores.userId, userId),
        eq(dailyScores.date, date)
      ));
  };
  
  // Never do this (vulnerable to injection):
  // const query = `SELECT * FROM daily_scores WHERE user_id = '${userId}'`;
  ```

- [ ] **NoSQL Injection Prevention**
  ```typescript
  // Validate and sanitize MongoDB queries
  import { ObjectId } from 'mongodb';
  
  export const sanitizeMongoQuery = (query: any) => {
    // Remove dangerous operators
    const dangerousOperators = ['$where', '$regex', '$expr'];
    
    const sanitized = { ...query };
    dangerousOperators.forEach(op => delete sanitized[op]);
    
    // Validate ObjectIds
    if (sanitized._id && !ObjectId.isValid(sanitized._id)) {
      throw new Error('Invalid ObjectId');
    }
    
    return sanitized;
  };
  ```

- [ ] **Command Injection Prevention**
  ```typescript
  // Avoid shell execution, use native libraries
  import { spawn } from 'child_process';
  import { promisify } from 'util';
  
  // Safe: Use allowlist of commands
  const allowedCommands = ['pdf-generator', 'image-processor'];
  
  export const executeCommand = async (command: string, args: string[]) => {
    if (!allowedCommands.includes(command)) {
      throw new Error('Command not allowed');
    }
    
    // Validate arguments
    const sanitizedArgs = args.filter(arg => 
      /^[a-zA-Z0-9._-]+$/.test(arg)
    );
    
    return new Promise((resolve, reject) => {
      const process = spawn(command, sanitizedArgs);
      // Handle process execution safely
    });
  };
  ```

- [ ] **Input Validation**
  ```typescript
  import { z } from 'zod';
  
  // Healthcare-specific validation schemas
  export const PatientScoreSchema = z.object({
    overallScore: z.number().min(1).max(10),
    energyLevel: z.number().min(1).max(10),
    moodScore: z.number().min(1).max(10),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(500).optional(),
    symptoms: z.array(z.string()).max(10).optional()
  });
  
  export const validateInput = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Validation failed',
            details: error.errors
          });
        }
        next(error);
      }
    };
  };
  ```

#### Testing Checklist
- [ ] Test SQL injection in all input fields
- [ ] Test command injection in file upload features
- [ ] Validate input sanitization effectiveness
- [ ] Test ORM query safety
- [ ] Check for template injection vulnerabilities

### A04:2021 – Insecure Design

#### Implementation Checklist
- [ ] **Threat Modeling Completed**
  - Data flow diagrams created
  - Trust boundaries identified
  - Attack vectors documented
  - Mitigation strategies implemented

- [ ] **Security by Design Principles**
  ```typescript
  // Secure default configurations
  export const securityDefaults = {
    session: {
      rolling: true,
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const
    },
    
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      standardHeaders: true,
      legacyHeaders: false
    },
    
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://keepgoingcare.com']
        : ['http://localhost:5173'],
      credentials: true
    }
  };
  ```

- [ ] **Healthcare-Specific Security Controls**
  ```typescript
  // Emergency detection and safety boundaries
  export const emergencyDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const message = req.body.message?.toLowerCase() || '';
    
    const emergencyKeywords = [
      'suicide', 'kill myself', 'end my life', 'harm myself',
      'overdose', 'emergency', 'urgent help', 'crisis'
    ];
    
    const hasEmergencyKeyword = emergencyKeywords.some(keyword => 
      message.includes(keyword)
    );
    
    if (hasEmergencyKeyword) {
      // Log emergency detection
      logger.warn('Emergency keywords detected', {
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
        message: '[REDACTED]'
      });
      
      // Return emergency resources
      return res.status(200).json({
        emergency: true,
        message: 'If this is a medical emergency, please call 000 immediately.',
        resources: [
          'Lifeline: 13 11 14',
          'Beyond Blue: 1300 22 4636',
          'Emergency Services: 000'
        ]
      });
    }
    
    next();
  };
  ```

#### Testing Checklist
- [ ] Verify security controls are enabled by default
- [ ] Test emergency detection functionality
- [ ] Validate healthcare compliance boundaries
- [ ] Review architecture for security gaps
- [ ] Test fail-safe mechanisms

### A05:2021 – Security Misconfiguration

#### Implementation Checklist
- [ ] **Production Hardening**
  ```typescript
  // Security headers middleware
  import helmet from 'helmet';
  
  export const securityHeaders = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Required for some AI APIs
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
  ```

- [ ] **Environment Configuration**
  ```bash
  # Production environment variables
  NODE_ENV=production
  DEBUG=false
  LOG_LEVEL=info
  
  # Security settings
  SESSION_SECRET=${SECURE_RANDOM_SECRET}
  ENCRYPTION_KEY=${SECURE_ENCRYPTION_KEY}
  
  # Healthcare compliance
  AUDIT_LOGGING=enabled
  DATA_RESIDENCY_REGION=AU
  PII_ANONYMIZATION=enabled
  
  # External services
  OPENAI_API_KEY=${OPENAI_PRODUCTION_KEY}
  TWILIO_ACCOUNT_SID=${TWILIO_PRODUCTION_SID}
  DATABASE_URL=${PRODUCTION_DATABASE_URL}
  ```

- [ ] **Error Handling**
  ```typescript
  // Production error handler
  export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log full error details for debugging
    logger.error('Application error', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: req.url,
      method: req.method,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'Internal server error',
        requestId: req.id // For support reference
      });
    }
    
    // Development: return detailed error
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  };
  ```

#### Testing Checklist
- [ ] Verify security headers are present
- [ ] Check error messages don't leak sensitive info
- [ ] Validate production vs development configurations
- [ ] Test CSP policy effectiveness
- [ ] Check for exposed debugging endpoints

### A06:2021 – Vulnerable and Outdated Components

#### Dependency Management Checklist
- [ ] **Automated Vulnerability Scanning**
  ```bash
  # Package.json scripts for security
  {
    "scripts": {
      "audit": "npm audit",
      "audit:fix": "npm audit fix",
      "audit:force": "npm audit fix --force",
      "security:check": "npm audit && snyk test",
      "security:monitor": "snyk monitor"
    }
  }
  ```

- [ ] **Dependency Update Policy**
  ```yaml
  Critical Security Updates:
    Timeline: Within 24 hours
    Process: Emergency deployment pipeline
    Validation: Automated tests + manual verification
    
  High Priority Updates:
    Timeline: Within 1 week
    Process: Standard deployment pipeline
    Validation: Full test suite
    
  Medium/Low Priority Updates:
    Timeline: Monthly maintenance window
    Process: Batch updates with testing
    Validation: Regression testing
  ```

- [ ] **Automated Monitoring**
  ```bash
  # GitHub Actions workflow for dependency monitoring
  name: Security Audit
  
  on:
    schedule:
      - cron: '0 0 * * *' # Daily
    push:
      branches: [main]
  
  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Run npm audit
          run: |
            npm audit --audit-level high
            npm audit --json > audit-results.json
        - name: Upload audit results
          uses: actions/upload-artifact@v3
          with:
            name: security-audit
            path: audit-results.json
  ```

#### Testing Checklist
- [ ] Run npm audit regularly
- [ ] Check for known vulnerabilities in dependencies
- [ ] Validate dependency licenses
- [ ] Test application after dependency updates
- [ ] Monitor for zero-day vulnerabilities

### A07:2021 – Identification and Authentication Failures

#### Implementation Checklist
- [ ] **Multi-Factor Authentication**
  ```typescript
  // SMS-based MFA implementation
  export class MFAService {
    static async sendVerificationCode(phoneNumber: string): Promise<string> {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      await twilioClient.messages.create({
        body: `Your KGC verification code is: ${code}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      // Store code with expiration
      await redis.setex(`mfa:${phoneNumber}`, 300, code); // 5 minutes
      
      return code;
    }
    
    static async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
      const storedCode = await redis.get(`mfa:${phoneNumber}`);
      
      if (!storedCode || storedCode !== code) {
        return false;
      }
      
      // Remove used code
      await redis.del(`mfa:${phoneNumber}`);
      return true;
    }
  }
  ```

- [ ] **Password Policy Enforcement**
  ```typescript
  export const passwordRequirements = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    preventReuse: 5, // Last 5 passwords
    
    validate(password: string, user: User): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      
      if (password.length < this.minLength) {
        errors.push(`Password must be at least ${this.minLength} characters`);
      }
      
      if (this.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain uppercase letters');
      }
      
      // Additional validation rules...
      
      return {
        valid: errors.length === 0,
        errors
      };
    }
  };
  ```

- [ ] **Session Security**
  ```typescript
  import session from 'express-session';
  import connectPgSimple from 'connect-pg-simple';
  
  const PgSession = connectPgSimple(session);
  
  export const sessionConfig = {
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      sameSite: 'strict'
    },
    name: 'kgc.sid' // Don't use default session name
  };
  ```

#### Testing Checklist
- [ ] Test password complexity requirements
- [ ] Verify MFA implementation
- [ ] Test session timeout functionality
- [ ] Check for session fixation vulnerabilities
- [ ] Validate account lockout mechanisms

### A08:2021 – Software and Data Integrity Failures

#### Implementation Checklist
- [ ] **Dependency Integrity**
  ```bash
  # Package-lock.json integrity checking
  npm ci --audit-level=high
  
  # Subresource Integrity for CDN assets
  <script src="https://cdn.example.com/library.js" 
          integrity="sha384-hash-here" 
          crossorigin="anonymous"></script>
  ```

- [ ] **Code Signing and Verification**
  ```yaml
  # GitHub Actions workflow security
  name: Secure Build
  
  on:
    push:
      branches: [main]
  
  jobs:
    build:
      runs-on: ubuntu-latest
      permissions:
        id-token: write # for OIDC
        contents: read
        
      steps:
        - uses: actions/checkout@v4
          with:
            token: ${{ secrets.GITHUB_TOKEN }}
        
        - name: Verify commit signature
          run: git verify-commit HEAD
          
        - name: Build with integrity check
          run: |
            npm ci --audit-level=high
            npm run build
            
        - name: Sign artifacts
          run: |
            # Sign build artifacts for deployment verification
            gpg --armor --detach-sign dist/
  ```

- [ ] **Data Integrity Monitoring**
  ```typescript
  // Database integrity checks
  export class DataIntegrityService {
    static async verifyUserData(userId: string): Promise<boolean> {
      const user = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user.length) {
        throw new Error('User not found');
      }
      
      // Verify referential integrity
      const scoresCount = await db.select({ count: count() })
        .from(dailyScores)
        .where(eq(dailyScores.userId, userId));
        
      // Verify data consistency
      const lastScore = await db.select()
        .from(dailyScores)
        .where(eq(dailyScores.userId, userId))
        .orderBy(desc(dailyScores.date))
        .limit(1);
        
      // Healthcare-specific integrity checks
      if (lastScore.length && lastScore[0].overallScore > 10) {
        logger.warn('Data integrity violation: invalid score value', {
          userId,
          score: lastScore[0].overallScore
        });
        return false;
      }
      
      return true;
    }
  }
  ```

#### Testing Checklist
- [ ] Verify dependency integrity checks
- [ ] Test data validation mechanisms
- [ ] Check for unauthorized code modifications
- [ ] Validate backup integrity
- [ ] Test recovery procedures

### A09:2021 – Security Logging and Monitoring Failures

#### Implementation Checklist
- [ ] **Comprehensive Audit Logging**
  ```typescript
  import winston from 'winston';
  
  // Healthcare-compliant audit logging
  export const auditLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta,
          compliance: 'healthcare-audit-log',
          retention: '7-years' // Healthcare record keeping requirement
        });
      })
    ),
    transports: [
      new winston.transports.File({ 
        filename: 'logs/audit.log',
        maxsize: 10485760, // 10MB
        maxFiles: 10
      }),
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ]
  });
  
  // Audit logging middleware
  export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      auditLogger.info('API request completed', {
        userId: req.user?.id,
        userRole: req.user?.role,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        // Healthcare-specific audit fields
        patientDataAccessed: req.url.includes('/api/patients/'),
        healthDataModified: ['POST', 'PUT', 'PATCH'].includes(req.method) && req.url.includes('/api/scores/')
      });
    });
    
    next();
  };
  ```

- [ ] **Security Event Monitoring**
  ```typescript
  // Security event detection
  export class SecurityMonitor {
    private static suspiciousPatterns = [
      /(?:union|select|insert|update|delete|drop|create|alter)/i,
      /(?:script|javascript|vbscript|onload|onerror)/i,
      /(?:\.\./){3,}/,
      /(?:admin|administrator|root|superuser)/i
    ];
    
    static detectSuspiciousActivity(req: Request): boolean {
      const { url, body, query, headers } = req;
      
      // Check for SQL injection patterns
      const checkString = JSON.stringify({ url, body, query });
      
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(checkString)) {
          auditLogger.warn('Suspicious activity detected', {
            userId: req.user?.id,
            ip: req.ip,
            pattern: pattern.source,
            url: req.url,
            timestamp: new Date().toISOString()
          });
          return true;
        }
      }
      
      return false;
    }
    
    static logSecurityEvent(event: string, details: any): void {
      auditLogger.warn(`Security event: ${event}`, {
        event,
        ...details,
        timestamp: new Date().toISOString(),
        severity: 'high'
      });
      
      // Send to external monitoring system
      if (process.env.NODE_ENV === 'production') {
        // Send to Datadog, New Relic, or similar
      }
    }
  }
  ```

- [ ] **Healthcare-Specific Monitoring**
  ```typescript
  // Monitor healthcare compliance events
  export const healthcareMonitor = {
    logPatientDataAccess(userId: string, patientId: string, action: string) {
      auditLogger.info('Patient data access', {
        userId,
        patientId,
        action,
        timestamp: new Date().toISOString(),
        complianceType: 'patient-data-access',
        retention: 'permanent'
      });
    },
    
    logEmergencyDetection(userId: string, keywords: string[]) {
      auditLogger.warn('Emergency keywords detected', {
        userId,
        keywords: '[REDACTED]', // Don't log actual content for privacy
        timestamp: new Date().toISOString(),
        complianceType: 'emergency-detection',
        actionTaken: 'emergency-resources-provided'
      });
    },
    
    logPrivacyBreach(details: any) {
      auditLogger.error('Privacy breach detected', {
        ...details,
        timestamp: new Date().toISOString(),
        complianceType: 'privacy-breach',
        severity: 'critical',
        notificationRequired: true
      });
    }
  };
  ```

#### Testing Checklist
- [ ] Verify audit logs capture all critical events
- [ ] Test log integrity and tamper detection
- [ ] Validate monitoring alert functionality
- [ ] Check log retention and archival
- [ ] Test incident response procedures

### A10:2021 – Server-Side Request Forgery (SSRF)

#### Implementation Checklist
- [ ] **URL Validation and Allowlisting**
  ```typescript
  // Safe HTTP client with URL validation
  import axios from 'axios';
  import { URL } from 'url';
  
  export class SafeHttpClient {
    private static allowedHosts = [
      'api.openai.com',
      'api.anthropic.com',
      'api.twilio.com',
      'api.sendgrid.com'
    ];
    
    private static blockedNetworks = [
      '127.0.0.0/8',    // Loopback
      '10.0.0.0/8',     // Private
      '172.16.0.0/12',  // Private
      '192.168.0.0/16', // Private
      '169.254.0.0/16', // Link-local
      '::1/128',        // IPv6 loopback
      'fc00::/7'        // IPv6 private
    ];
    
    static async request(url: string, options: any = {}) {
      // Parse and validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (error) {
        throw new Error('Invalid URL format');
      }
      
      // Check against allowlist
      if (!this.allowedHosts.includes(parsedUrl.hostname)) {
        throw new Error(`Host not allowed: ${parsedUrl.hostname}`);
      }
      
      // Prevent access to internal networks
      if (this.isBlockedNetwork(parsedUrl.hostname)) {
        throw new Error('Access to internal network blocked');
      }
      
      // Make safe request
      return axios({
        url,
        timeout: 30000,
        maxRedirects: 3,
        ...options
      });
    }
    
    private static isBlockedNetwork(hostname: string): boolean {
      // Implementation would check IP against blocked networks
      // This is a simplified version
      return /^(127\.|10\.|172\.16\.|192\.168\.)/.test(hostname);
    }
  }
  ```

- [ ] **Webhook Validation**
  ```typescript
  // Secure webhook handling
  export const webhookHandler = (req: Request, res: Response) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');
    
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Process webhook safely
    processWebhook(req.body);
    res.status(200).json({ status: 'processed' });
  };
  ```

#### Testing Checklist
- [ ] Test URL validation effectiveness
- [ ] Attempt SSRF attacks against internal services
- [ ] Verify webhook signature validation
- [ ] Test redirect following limitations
- [ ] Check for DNS rebinding vulnerabilities

---

## Secrets Management

### Secret Classification
```yaml
Critical Secrets (Immediate rotation if compromised):
  - Database credentials
  - JWT signing keys
  - Encryption keys
  - Admin passwords

High Priority Secrets (24-hour rotation):
  - API keys for external services
  - Service account credentials
  - OAuth client secrets

Medium Priority Secrets (Weekly rotation):
  - Webhook secrets
  - Third-party integration tokens
  - Non-critical API keys

Low Priority Secrets (Monthly rotation):
  - Development/staging credentials
  - Monitoring service keys
  - Analytics tokens
```

### Secret Storage Implementation
```typescript
// AWS Secrets Manager integration
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class SecureSecretManager {
  private client: SecretsManagerClient;
  private cache = new Map<string, { value: any; expiry: number }>();
  
  constructor() {
    this.client = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'ap-southeast-2' 
    });
  }
  
  async getSecret(secretName: string): Promise<any> {
    // Check cache first (with TTL)
    const cached = this.cache.get(secretName);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }
      
      const secretValue = JSON.parse(response.SecretString);
      
      // Cache for 5 minutes
      this.cache.set(secretName, {
        value: secretValue,
        expiry: Date.now() + 5 * 60 * 1000
      });
      
      return secretValue;
    } catch (error) {
      auditLogger.error('Failed to retrieve secret', {
        secretName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

### Secret Rotation Procedures
```bash
#!/bin/bash
# Automated secret rotation script

SECRET_NAME="prod/KGC/sec"
BACKUP_SECRET_NAME="prod/KGC/sec-backup"

echo "Starting secret rotation for: $SECRET_NAME"

# 1. Backup current secret
aws secretsmanager create-secret \
  --name "$BACKUP_SECRET_NAME-$(date +%Y%m%d)" \
  --secret-string "$(aws secretsmanager get-secret-value --secret-id $SECRET_NAME --query SecretString --output text)"

# 2. Generate new secrets
NEW_SESSION_SECRET=$(openssl rand -base64 64)
NEW_ENCRYPTION_KEY=$(openssl rand -base64 32)

# 3. Update secret with new values
NEW_SECRET_JSON=$(cat <<EOF
{
  "SESSION_SECRET": "$NEW_SESSION_SECRET",
  "ENCRYPTION_KEY": "$NEW_ENCRYPTION_KEY",
  "DATABASE_URL": "$DATABASE_URL",
  "OPENAI_API_KEY": "$OPENAI_API_KEY",
  "ANTHROPIC_API_KEY": "$ANTHROPIC_API_KEY",
  "TWILIO_ACCOUNT_SID": "$TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN": "$TWILIO_AUTH_TOKEN",
  "SENDGRID_API_KEY": "$SENDGRID_API_KEY"
}
EOF
)

aws secretsmanager update-secret \
  --secret-id "$SECRET_NAME" \
  --secret-string "$NEW_SECRET_JSON"

# 4. Deploy application with new secrets
./tools/scripts/deploy_aws.sh

# 5. Verify application health
sleep 60
curl -f https://api.keepgoingcare.com/api/health

# 6. Clean up old backup (keep last 5)
aws secretsmanager list-secrets \
  --filters Key="name",Values="$BACKUP_SECRET_NAME" \
  --query 'SecretList[5:].Name' \
  --output text | xargs -I {} aws secretsmanager delete-secret --secret-id {}

echo "Secret rotation completed successfully"
```

---

## Least Privilege Access Control

### Role-Based Access Matrix
```yaml
Patient Role:
  Can Access:
    - Own profile and health data
    - Own daily scores and progress
    - AI chat for personal guidance
    - Own care plan directives (read-only)
  
  Cannot Access:
    - Other patients' data
    - Doctor management features
    - System administration
    - Other users' AI conversations

Doctor Role:
  Can Access:
    - Assigned patients' health data
    - Create/modify care plan directives
    - View patient progress reports
    - Doctor dashboard and tools
  
  Cannot Access:
    - Non-assigned patients' data
    - System administration
    - Other doctors' patient assignments
    - Raw AI conversation logs

Admin Role:
  Can Access:
    - User management
    - System configuration
    - Audit logs and reports
    - Performance metrics
  
  Cannot Access:
    - Individual patient health data (without explicit consent)
    - AI conversation content
    - Doctor-patient communications
```

### Implementation Examples
```typescript
// Fine-grained permission system
export enum Permission {
  // User management
  READ_USER_PROFILE = 'read:user:profile',
  UPDATE_USER_PROFILE = 'update:user:profile',
  DELETE_USER_ACCOUNT = 'delete:user:account',
  
  // Health data
  READ_HEALTH_DATA = 'read:health:data',
  WRITE_HEALTH_DATA = 'write:health:data',
  
  // Care plans
  READ_CARE_PLANS = 'read:care:plans',
  WRITE_CARE_PLANS = 'write:care:plans',
  
  // System administration
  READ_AUDIT_LOGS = 'read:audit:logs',
  MANAGE_SYSTEM = 'manage:system'
}

export const rolePermissions: Record<UserRole, Permission[]> = {
  patient: [
    Permission.READ_USER_PROFILE,
    Permission.UPDATE_USER_PROFILE,
    Permission.READ_HEALTH_DATA,
    Permission.WRITE_HEALTH_DATA,
    Permission.READ_CARE_PLANS
  ],
  
  doctor: [
    Permission.READ_USER_PROFILE,
    Permission.READ_HEALTH_DATA,
    Permission.READ_CARE_PLANS,
    Permission.WRITE_CARE_PLANS
  ],
  
  admin: [
    Permission.READ_USER_PROFILE,
    Permission.DELETE_USER_ACCOUNT,
    Permission.READ_AUDIT_LOGS,
    Permission.MANAGE_SYSTEM
  ]
};

// Permission checking middleware
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userPermissions = rolePermissions[user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      auditLogger.warn('Permission denied', {
        userId: user.id,
        userRole: user.role,
        requiredPermission: permission,
        url: req.url,
        method: req.method
      });
      
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

---

## Audit Log Expectations

### Healthcare Audit Requirements
```typescript
// Comprehensive audit logging structure
export interface HealthcareAuditLog {
  // Core audit fields
  timestamp: string;
  userId: string;
  userRole: 'patient' | 'doctor' | 'admin';
  sessionId: string;
  
  // Action details
  action: string;
  resource: string;
  resourceId?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  
  // Request details
  ipAddress: string;
  userAgent: string;
  url: string;
  
  // Healthcare-specific fields
  patientDataAccessed?: boolean;
  healthDataModified?: boolean;
  emergencyKeywordsDetected?: boolean;
  privacyProtectionApplied?: boolean;
  
  // Compliance fields
  complianceType: 'patient-access' | 'data-modification' | 'emergency-detection' | 'privacy-breach';
  retentionPeriod: '7-years' | 'permanent';
  auditTrailIntegrity: string; // Hash for tamper detection
  
  // Result details
  statusCode: number;
  success: boolean;
  errorMessage?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

// Audit logging service
export class HealthcareAuditService {
  static async logEvent(event: Partial<HealthcareAuditLog>): Promise<void> {
    const auditEntry: HealthcareAuditLog = {
      timestamp: new Date().toISOString(),
      auditTrailIntegrity: this.generateIntegrityHash(event),
      success: event.statusCode ? event.statusCode < 400 : true,
      ...event
    } as HealthcareAuditLog;
    
    // Store in audit log table
    await db.insert(auditLogs).values(auditEntry);
    
    // Send to external audit system if required
    if (process.env.NODE_ENV === 'production') {
      await this.sendToExternalAudit(auditEntry);
    }
  }
  
  private static generateIntegrityHash(event: any): string {
    const content = JSON.stringify(event, Object.keys(event).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  private static async sendToExternalAudit(auditEntry: HealthcareAuditLog): Promise<void> {
    // Send to external audit system (e.g., AWS CloudTrail, Splunk)
    // This ensures audit logs are preserved even if main system is compromised
  }
}
```

### Monitoring and Alerting
```typescript
// Audit log monitoring and alerting
export class AuditMonitoring {
  static async checkForAnomalies(): Promise<void> {
    // Check for unusual access patterns
    const unusualActivity = await db
      .select({
        userId: auditLogs.userId,
        count: count(),
        actions: sql`array_agg(DISTINCT ${auditLogs.action})`
      })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.timestamp, sql`NOW() - INTERVAL '1 hour'`),
          eq(auditLogs.patientDataAccessed, true)
        )
      )
      .groupBy(auditLogs.userId)
      .having(gt(count(), 100)); // More than 100 patient data accesses per hour
    
    if (unusualActivity.length > 0) {
      await this.alertSecurityTeam('Unusual patient data access patterns detected', {
        users: unusualActivity
      });
    }
    
    // Check for failed login attempts
    const failedLogins = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'LOGIN_FAILED'),
          gte(auditLogs.timestamp, sql`NOW() - INTERVAL '15 minutes')`)
        )
      );
    
    if (failedLogins[0].count > 50) {
      await this.alertSecurityTeam('High number of failed login attempts', {
        count: failedLogins[0].count,
        timeframe: '15 minutes'
      });
    }
  }
  
  private static async alertSecurityTeam(message: string, details: any): Promise<void> {
    auditLogger.error('Security alert', { message, details });
    
    // Send to monitoring system
    // Could integrate with PagerDuty, Slack, etc.
  }
}
```

---

## Dependency Update Policy

### Automated Dependency Management
```json
{
  "dependabot": {
    "version": 2,
    "updates": [
      {
        "package-ecosystem": "npm",
        "directory": "/",
        "schedule": {
          "interval": "weekly",
          "day": "sunday",
          "time": "02:00"
        },
        "open-pull-requests-limit": 5,
        "reviewers": ["security-team"],
        "assignees": ["tech-lead"],
        "commit-message": {
          "prefix": "deps:",
          "include": "scope"
        }
      }
    ]
  },
  
  "renovate": {
    "extends": ["config:base"],
    "schedule": ["before 6am on sunday"],
    "packageRules": [
      {
        "matchPackagePatterns": ["*"],
        "matchUpdateTypes": ["major"],
        "assignees": ["tech-lead", "security-team"]
      },
      {
        "matchPackagePatterns": ["*"],
        "matchUpdateTypes": ["minor", "patch"],
        "automerge": true,
        "requiredStatusChecks": null
      }
    ],
    "vulnerabilityAlerts": {
      "enabled": true,
      "assignees": ["security-team"]
    }
  }
}
```

### Manual Review Process
```yaml
Critical Security Updates:
  Trigger: CVE score >= 7.0 or actively exploited
  Review: Immediate security team review
  Testing: Emergency testing protocol
  Deployment: Hotfix deployment within 24 hours
  
Major Updates:
  Trigger: Major version bumps
  Review: Tech lead + security review
  Testing: Full regression testing
  Deployment: Scheduled maintenance window
  
Minor/Patch Updates:
  Trigger: Weekly automated check
  Review: Automated if tests pass
  Testing: CI/CD pipeline validation
  Deployment: Automated after tests pass
```

### Testing Protocol
```bash
#!/bin/bash
# Dependency update testing script

echo "Testing dependency updates..."

# 1. Security audit
npm audit --audit-level high
if [ $? -ne 0 ]; then
    echo "❌ Security audit failed"
    exit 1
fi

# 2. Type checking
pnpm type-check
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed"
    exit 1
fi

# 3. Unit tests
pnpm test:unit
if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed"
    exit 1
fi

# 4. Integration tests
pnpm test:integration
if [ $? -ne 0 ]; then
    echo "❌ Integration tests failed"
    exit 1
fi

# 5. Healthcare-specific tests
pnpm test:healthcare
if [ $? -ne 0 ]; then
    echo "❌ Healthcare compliance tests failed"
    exit 1
fi

# 6. Build verification
pnpm build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ All tests passed - dependency update approved"
```

---

## Security Monitoring Dashboard

### Key Metrics to Track
```yaml
Authentication Metrics:
  - Failed login attempts (rate and patterns)
  - Successful logins by role and location
  - MFA bypass attempts
  - Session duration and timeout patterns

Access Control Metrics:
  - Permission denied events
  - Role escalation attempts  
  - Cross-patient data access attempts
  - Admin action frequency

Data Protection Metrics:
  - PII/PHI access frequency
  - Data export requests
  - Encryption failures
  - Privacy protection agent errors

System Security Metrics:
  - Vulnerability scan results
  - Dependency security status
  - SSL certificate expiration
  - Security header compliance

Healthcare Compliance Metrics:
  - Emergency detection trigger rate
  - AI boundary violation attempts
  - Audit log integrity status
  - Data retention compliance
```

### Alerting Thresholds
```typescript
export const securityAlertThresholds = {
  failedLogins: {
    warning: 10, // per 15 minutes
    critical: 50 // per 15 minutes
  },
  
  unauthorizedAccess: {
    warning: 1, // any unauthorized access
    critical: 5 // within 1 hour
  },
  
  emergencyDetections: {
    info: 1, // log all emergency detections
    warning: 5 // per hour (may indicate system abuse)
  },
  
  auditLogFailures: {
    warning: 1, // any audit log failure
    critical: 5 // consecutive failures
  },
  
  vulnerabilityScore: {
    warning: 4.0, // CVSS score
    critical: 7.0 // CVSS score
  }
};
```

This security checklist ensures the KGC Healthcare Platform maintains robust security posture while complying with Australian healthcare regulations and protecting patient data throughout all system operations.