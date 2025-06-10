/**
 * Environment-Aware Configuration System
 * Automatically detects and configures security features based on deployment environment
 */

export interface SecurityConfig {
  name: string;
  keyManagement: 'environment' | 'aws_kms';
  sessionStorage: 'memory' | 'redis' | 'database';
  auditLevel: 'basic' | 'enhanced' | 'full';
  alerting: 'console' | 'database' | 'cloudwatch' | 'siem';
  encryption: 'basic' | 'enhanced';
  backupStrategy: 'none' | 'daily' | 'hourly';
  complianceMode: boolean;
}

class EnvironmentDetector {
  static detect(): string {
    // Replit environment detection
    if (process.env.REPLIT_DB_URL || process.env.REPL_ID) {
      return 'replit';
    }
    
    // AWS environment detection
    if (process.env.AWS_REGION || process.env.AWS_EXECUTION_ENV) {
      return 'aws';
    }
    
    // Production indicators
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }
    
    return 'development';
  }
}

const configurations: Record<string, SecurityConfig> = {
  development: {
    name: 'Development',
    keyManagement: 'environment',
    sessionStorage: 'memory',
    auditLevel: 'basic',
    alerting: 'console',
    encryption: 'basic',
    backupStrategy: 'none',
    complianceMode: false
  },
  
  replit: {
    name: 'Replit Development',
    keyManagement: 'environment',
    sessionStorage: 'memory',
    auditLevel: 'enhanced',
    alerting: 'database',
    encryption: 'basic',
    backupStrategy: 'daily',
    complianceMode: true
  },
  
  aws: {
    name: 'AWS Production',
    keyManagement: 'aws_kms',
    sessionStorage: 'redis',
    auditLevel: 'full',
    alerting: 'cloudwatch',
    encryption: 'enhanced',
    backupStrategy: 'hourly',
    complianceMode: true
  },
  
  production: {
    name: 'Production',
    keyManagement: 'aws_kms',
    sessionStorage: 'database',
    auditLevel: 'full',
    alerting: 'siem',
    encryption: 'enhanced',
    backupStrategy: 'hourly',
    complianceMode: true
  }
};

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: SecurityConfig;
  private environment: string;

  private constructor() {
    this.environment = EnvironmentDetector.detect();
    this.config = configurations[this.environment];
    
    console.log(`Environment detected: ${this.config.name}`);
    console.log(`Security Level: ${this.config.auditLevel.toUpperCase()}`);
  }

  static getInstance(): EnvironmentManager {
    if (!this.instance) {
      this.instance = new EnvironmentManager();
    }
    return this.instance;
  }

  getConfig(): SecurityConfig {
    return this.config;
  }

  getEnvironment(): string {
    return this.environment;
  }

  isProduction(): boolean {
    return this.environment === 'aws' || this.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment === 'development' || this.environment === 'replit';
  }

  requiresCompliance(): boolean {
    return this.config.complianceMode;
  }

  supportsAWSServices(): boolean {
    return this.environment === 'aws' || this.environment === 'production';
  }
}

export const envManager = EnvironmentManager.getInstance();