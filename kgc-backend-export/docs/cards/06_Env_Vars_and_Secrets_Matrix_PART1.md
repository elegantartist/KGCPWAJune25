SIZE: 16784 bytes

# Knowledge Card 06: Environment Variables and Secrets Matrix

## Environment Configuration Matrix

### Development Environment
```bash
# Application Configuration
NODE_ENV=development
PORT=5000
DEBUG=true
LOG_LEVEL=debug

# Security Configuration (Relaxed for Development)
SESSION_SECRET=dev-session-secret-change-in-production
ENCRYPTION_KEY=dev-encryption-key-32-characters
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/kgc_dev
REDIS_URL=redis://localhost:6379

# AI Service Configuration (Development Keys)
OPENAI_API_KEY=sk-dev-placeholder-openai-key
ANTHROPIC_API_KEY=sk-ant-dev-placeholder-anthropic-key

# Communication Services (Development)
TWILIO_ACCOUNT_SID=dev_twilio_account_sid
TWILIO_AUTH_TOKEN=dev_twilio_auth_token
TWILIO_PHONE_NUMBER=+15551234567

SENDGRID_API_KEY=SG.dev-placeholder-sendgrid-key
FROM_EMAIL=dev@keepgoingcare.com

# AWS Configuration (Development)
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=dev_access_key
AWS_SECRET_ACCESS_KEY=dev_secret_key
AWS_SECRET_NAME=dev/KGC/sec

# Feature Flags
ENABLE_AI_CHAT=true
ENABLE_SMS_AUTH=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_EMERGENCY_DETECTION=true

# Development Specific
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_ENV=development
ENABLE_MOCK_DATA=true
BYPASS_AUTH_FOR_TESTING=false
```

### Production Environment
```bash
# Application Configuration
NODE_ENV=production
PORT=5000
DEBUG=false
LOG_LEVEL=info

# Security Configuration (Retrieved from AWS Secrets Manager)
SESSION_SECRET=${AWS_SECRET:SESSION_SECRET}
ENCRYPTION_KEY=${AWS_SECRET:ENCRYPTION_KEY}
JWT_SECRET=${AWS_SECRET:JWT_SECRET}
CORS_ORIGIN=https://keepgoingcare.com,https://www.keepgoingcare.com

# Database Configuration
DATABASE_URL=${AWS_SECRET:DATABASE_URL}
REDIS_URL=${AWS_SECRET:REDIS_URL}

# AI Service Configuration
OPENAI_API_KEY=${AWS_SECRET:OPENAI_API_KEY}
ANTHROPIC_API_KEY=${AWS_SECRET:ANTHROPIC_API_KEY}

# Communication Services
TWILIO_ACCOUNT_SID=${AWS_SECRET:TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${AWS_SECRET:TWILIO_AUTH_TOKEN}
TWILIO_PHONE_NUMBER=${AWS_SECRET:TWILIO_PHONE_NUMBER}

SENDGRID_API_KEY=${AWS_SECRET:SENDGRID_API_KEY}
FROM_EMAIL=welcome@keepgoingcare.com

# AWS Configuration
AWS_REGION=ap-southeast-2
AWS_SECRET_NAME=prod/KGC/sec

# Production Security
FORCE_HTTPS=true
SECURE_COOKIES=true
CSRF_PROTECTION=true
RATE_LIMIT_ENABLED=true

# Feature Flags
ENABLE_AI_CHAT=true
ENABLE_SMS_AUTH=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_EMERGENCY_DETECTION=true
ENABLE_PRIVACY_PROTECTION=true

# Monitoring and Logging
LOG_FORMAT=json
AUDIT_LOG_RETENTION=7_years
PERFORMANCE_MONITORING=true
ERROR_REPORTING=true

# Healthcare Compliance
TGA_COMPLIANCE_MODE=true
AUSTRALIAN_DATA_RESIDENCY=true
PRIVACY_PROTECTION_LEVEL=maximum
```

## Secrets Management Strategy

### AWS Secrets Manager Structure
```json
{
  "prod/KGC/sec": {
    "SESSION_SECRET": "base64-encoded-512-bit-key",
    "ENCRYPTION_KEY": "base64-encoded-256-bit-key", 
    "JWT_SECRET": "base64-encoded-256-bit-key",
    "DATABASE_URL": "postgresql://username:password@host:5432/database",
    "REDIS_URL": "redis://username:password@host:6379",
    "OPENAI_API_KEY": "sk-proj-production-key",
    "ANTHROPIC_API_KEY": "sk-ant-production-key",
    "TWILIO_ACCOUNT_SID": "production-account-sid",
    "TWILIO_AUTH_TOKEN": "production-auth-token",
    "TWILIO_PHONE_NUMBER": "+61412345678",
    "SENDGRID_API_KEY": "SG.production-api-key"
  },
  
  "dev/KGC/sec": {
    "SESSION_SECRET": "development-session-secret",
    "ENCRYPTION_KEY": "development-encryption-key",
    "DATABASE_URL": "postgresql://dev:dev@localhost:5432/kgc_dev",
    "OPENAI_API_KEY": "sk-dev-development-key",
    "TWILIO_ACCOUNT_SID": "development-sid",
    "SENDGRID_API_KEY": "SG.development-key"
  }
}
```

### Secret Classification and Rotation Schedule
```typescript
interface SecretClassification {
  name: string;
  classification: 'critical' | 'high' | 'medium' | 'low';
  rotationSchedule: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  accessLevel: 'runtime_only' | 'admin_access' | 'emergency_access';
  auditRequired: boolean;
}

const SECRET_MATRIX: SecretClassification[] = [
  {
    name: 'SESSION_SECRET',
    classification: 'critical',
    rotationSchedule: 'monthly',
    accessLevel: 'runtime_only',
    auditRequired: true
  },
  {
    name: 'ENCRYPTION_KEY',
    classification: 'critical', 
    rotationSchedule: 'quarterly',
    accessLevel: 'runtime_only',
    auditRequired: true
  },
  {
    name: 'DATABASE_URL',
    classification: 'critical',
    rotationSchedule: 'quarterly',
    accessLevel: 'admin_access',
    auditRequired: true
  },
  {
    name: 'OPENAI_API_KEY',
    classification: 'high',
    rotationSchedule: 'quarterly',
    accessLevel: 'runtime_only',
    auditRequired: true
  },
  {
    name: 'ANTHROPIC_API_KEY',
    classification: 'high',
    rotationSchedule: 'quarterly',
    accessLevel: 'runtime_only',
    auditRequired: true
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    classification: 'high',
    rotationSchedule: 'quarterly',
    accessLevel: 'runtime_only',
    auditRequired: true
  },
  {
    name: 'SENDGRID_API_KEY',
    classification: 'medium',
    rotationSchedule: 'quarterly',
    accessLevel: 'runtime_only',
    auditRequired: false
  }
];
```

### Secret Access Implementation
```typescript
// Secure secret management service
class SecureSecretManager {
  private cache = new Map<string, CachedSecret>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  async getSecret(secretName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    try {
      // Retrieve from AWS Secrets Manager
      const secret = await this.retrieveFromAWS(secretName);
      
      // Cache with TTL
      this.cache.set(secretName, {
        value: secret,
        expiry: Date.now() + this.cacheTTL,
        accessed: Date.now()
      });
      
      // Audit secret access
      await this.auditSecretAccess(secretName);
      
      return secret;
    } catch (error) {
      // Fallback to environment variables in development
      if (process.env.NODE_ENV === 'development') {
        return process.env[secretName] || '';
      }
      throw error;
    }
  }
  
  async rotateSecret(secretName: string): Promise<void> {
    // Generate new secret value
    const newValue = this.generateSecretValue(secretName);
    
    // Update in AWS Secrets Manager
    await this.updateAWSSecret(secretName, newValue);
    
    // Clear cache to force refresh
    this.cache.delete(secretName);
    
    // Audit rotation
    await this.auditSecretRotation(secretName);
    
    // Notify applications (trigger restart if needed)
    await this.notifySecretRotation(secretName);
  }
  
  private generateSecretValue(secretName: string): string {
    switch (secretName) {
      case 'SESSION_SECRET':
      case 'JWT_SECRET':
        return crypto.randomBytes(64).toString('base64');
      case 'ENCRYPTION_KEY':
        return crypto.randomBytes(32).toString('base64');
      default:
        throw new Error(`Unknown secret type: ${secretName}`);
    }
  }
}
```

## Environment-Specific Configuration

### Development Configuration
```typescript
// config/development.ts
export const developmentConfig = {
  server: {
    port: 5000,
    host: '0.0.0.0',
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/kgc_dev',
    ssl: false,
    pool: {
      min: 2,
      max: 10
    }
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retryDelayOnFailover: 100
  },
  
  security: {
    session: {
      secret: process.env.SESSION_SECRET || 'dev-session-secret',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in dev
      secure: false,
      httpOnly: true,
      sameSite: 'lax'
    },
    
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // More lenient in development
      standardHeaders: true
    }
  },
  
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || 'dev-placeholder',
      model: 'gpt-4o',
      maxTokens: 4096,
      timeout: 30000
    },
    
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || 'dev-placeholder',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      timeout: 30000
    }
  },
  
  features: {
    mockData: true,
    bypassAuth: false, // Never bypass in production
    detailedErrors: true,
    debugLogging: true
  }
};
```

### Production Configuration
```typescript
// config/production.ts
export const productionConfig = {
  server: {
    port: process.env.PORT || 5000,
    host: '0.0.0.0',
    cors: {
      origin: [
        'https://keepgoingcare.com',
        'https://www.keepgoingcare.com',
        'https://app.keepgoingcare.com'
      ],
      credentials: true
    }
  },
  
  database: {
    url: await secretManager.getSecret('DATABASE_URL'),
    ssl: {
      rejectUnauthorized: false // For managed database services
    },
    pool: {
      min: 5,
      max: 20
    }
  },
  
  redis: {
    url: await secretManager.getSecret('REDIS_URL'),
    retryDelayOnFailover: 100,
    lazyConnect: true
  },
  
  security: {
    session: {
      secret: await secretManager.getSecret('SESSION_SECRET'),
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      secure: true,
      httpOnly: true,
      sameSite: 'strict'
    },
    
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Strict in production
      standardHeaders: true,
      legacyHeaders: false
    }
  },
  
  ai: {
    openai: {
      apiKey: await secretManager.getSecret('OPENAI_API_KEY'),
      model: 'gpt-4o',
      maxTokens: 4096,
      timeout: 30000,
      retries: 3
    },
    
    anthropic: {
      apiKey: await secretManager.getSecret('ANTHROPIC_API_KEY'),
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      timeout: 30000,
      retries: 3
    }
  },
  
  features: {
    mockData: false,
    bypassAuth: false,
    detailedErrors: false,
    debugLogging: false
  },
  
  monitoring: {
    enableMetrics: true,
    enableTracing: true,
    enableLogging: true,
    logLevel: 'info'
  }
};
```

## Service-Specific Environment Variables

### OpenAI Configuration
```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-production-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7
OPENAI_TIMEOUT=30000
OPENAI_RETRIES=3

# Rate limiting for OpenAI
OPENAI_RATE_LIMIT_RPM=500
OPENAI_RATE_LIMIT_TPM=30000
OPENAI_RATE_LIMIT_WINDOW=60000

# Usage monitoring
OPENAI_USAGE_TRACKING=true
OPENAI_COST_ALERTS=true
OPENAI_MONTHLY_BUDGET=1000
```

### Anthropic Configuration
```bash
# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-production-key-here
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7
ANTHROPIC_TIMEOUT=30000

# Rate limiting for Anthropic
ANTHROPIC_RATE_LIMIT_RPM=50
ANTHROPIC_RATE_LIMIT_TPM=40000
ANTHROPIC_RATE_LIMIT_WINDOW=60000

# Fallback configuration
AI_FALLBACK_ENABLED=true
AI_FALLBACK_ORDER=openai,anthropic,local
```

### Twilio SMS Configuration
```bash
# Twilio Account Configuration
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+61412345678

# SMS Configuration
SMS_VERIFICATION_CODE_LENGTH=6
SMS_CODE_EXPIRY=300000  # 5 minutes in milliseconds
SMS_MAX_ATTEMPTS=3
SMS_RATE_LIMIT=5        # 5 SMS per hour per phone number

# Australian SMS Settings
SMS_COUNTRY_CODE=+61
SMS_REGION=AU
SMS_COMPLIANCE_MODE=true

# Message Templates
SMS_VERIFICATION_TEMPLATE="Your KGC verification code is: {code}. Valid for 5 minutes."
SMS_REMINDER_TEMPLATE="Don't forget to submit your daily health scores! - KGC"
```

### SendGrid Email Configuration
```bash
# SendGrid API Configuration
SENDGRID_API_KEY=SG.production-api-key-here
SENDGRID_FROM_EMAIL=welcome@keepgoingcare.com
SENDGRID_FROM_NAME=Keep Going Care

# Email Templates
SENDGRID_TEMPLATE_WELCOME=d-1234567890abcdef
SENDGRID_TEMPLATE_PASSWORD_RESET=d-abcdef1234567890
SENDGRID_TEMPLATE_DATA_EXPORT=d-fedcba0987654321

# Email Configuration
EMAIL_RATE_LIMIT=10     # 10 emails per hour per user
EMAIL_BATCH_SIZE=100
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000  # 5 seconds

# Compliance
EMAIL_UNSUBSCRIBE_ENABLED=true
EMAIL_GDPR_COMPLIANT=true
EMAIL_CAN_SPAM_COMPLIANT=true
```

### Database Configuration
```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@host:5432/database
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=5000

# Neon Specific Configuration
DATABASE_PROVIDER=neon
DATABASE_REGION=ap-southeast-2
DATABASE_SSL_MODE=require

# Backup Configuration
DATABASE_BACKUP_ENABLED=true
DATABASE_BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
DATABASE_BACKUP_RETENTION_DAYS=30

# Performance
DATABASE_STATEMENT_TIMEOUT=30000
DATABASE_QUERY_TIMEOUT=10000
DATABASE_LOG_SLOW_QUERIES=true
DATABASE_SLOW_QUERY_THRESHOLD=1000  # 1 second
```

## Environment Validation

### Configuration Validation Schema
```typescript
// Environment validation using Zod
import { z } from 'zod';

const EnvironmentSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().min(1000).max(65535),
  DEBUG: z.coerce.boolean().optional(),
  
  // Security
  SESSION_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  CORS_ORIGIN: z.string(),
  
  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  
  // AI Services
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  
  // Communication
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string().min(32),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{1,14}$/),
  SENDGRID_API_KEY: z.string().startsWith('SG.'),
  
  // AWS
  AWS_REGION: z.string().min(1),
  AWS_SECRET_NAME: z.string().min(1),
  
  // Feature Flags
  ENABLE_AI_CHAT: z.coerce.boolean().default(true),
  ENABLE_SMS_AUTH: z.coerce.boolean().default(true),
  ENABLE_EMAIL_NOTIFICATIONS: z.coerce.boolean().default(true),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  
  // Healthcare Compliance
  TGA_COMPLIANCE_MODE: z.coerce.boolean().default(true),
  AUSTRALIAN_DATA_RESIDENCY: z.coerce.boolean().default(true)
});

export type Environment = z.infer<typeof EnvironmentSchema>;

// Environment validation function
export function validateEnvironment(): Environment {
  try {
    return EnvironmentSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}

// Configuration loading with validation
export async function loadConfiguration(): Promise<AppConfig> {
  // Validate environment variables
  const env = validateEnvironment();
  
  // Load secrets if in production
  if (env.NODE_ENV === 'production') {
    await loadProductionSecrets(env.AWS_SECRET_NAME);
  }
  
  // Build configuration object
  return buildAppConfig(env);
}
```

### Secret Validation and Health Checks
```typescript
// Secret health check service
class SecretHealthChecker {
  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabaseConnection(),
      this.checkRedisConnection(),
      this.checkOpenAIAPI(),
      this.checkAnthropicAPI(),
      this.checkTwilioAPI(),
      this.checkSendGridAPI(),
      this.checkAWSSecretsAccess()
    ]);
    
    const results = checks.map((check, index) => ({
      service: this.getServiceName(index),
      status: check.status,
      details: check.status === 'fulfilled' ? check.value : check.reason
    }));
    
    return {
      timestamp: new Date().toISOString(),
      overall: results.every(r => r.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      services: results
    };
  }
  
  private async checkOpenAIAPI(): Promise<ServiceHealth> {
    try {
      const apiKey = await secretManager.getSecret('OPENAI_API_KEY');
      
      // Test API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API returned ${response.status}`);
      }
      
      return { healthy: true, details: 'API accessible' };
    } catch (error) {
      return { healthy: false, details: error.message };
    }
  }
  
  private async checkAWSSecretsAccess(): Promise<ServiceHealth> {
    try {
      await secretManager.getSecret('SESSION_SECRET');
      return { healthy: true, details: 'Secrets accessible' };
    } catch (error) {
      return { healthy: false, details: 'Cannot access AWS Secrets Manager' };
    }
  }
}
```

This comprehensive environment and secrets matrix ensures secure, scalable, and compliant configuration management across all deployment environments while maintaining healthcare data protection standards.