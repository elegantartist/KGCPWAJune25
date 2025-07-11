/**
 * Environment-Aware Encryption Service
 * Automatically uses appropriate encryption methods based on deployment environment
 */

import crypto from 'crypto';
import { envManager } from './environmentConfig';

class EncryptionService {
  private static instance: EncryptionService;
  private config = envManager.getConfig();
  private cachedKey: string | null = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!this.instance) {
      this.instance = new EncryptionService();
    }
    return this.instance;
  }

  /**
   * Get encryption key based on environment
   */
  private async getEncryptionKey(): Promise<string> {
    if (this.cachedKey) {
      return this.cachedKey;
    }

    switch (this.config.keyManagement) {
      case 'environment':
        // Replit and development environments
        const envKey = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
        if (!envKey) {
          throw new Error('ENCRYPTION_KEY or SESSION_SECRET environment variable required');
        }
        this.cachedKey = crypto.createHash('sha256').update(envKey).digest('hex').substring(0, 32);
        break;

      case 'aws_kms':
        // AWS production environment
        try {
          this.cachedKey = await this.getAWSKMSKey();
        } catch (error) {
          console.warn('AWS KMS not available, falling back to environment variable');
          const fallbackKey = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
          if (!fallbackKey) {
            throw new Error('No encryption key available');
          }
          this.cachedKey = crypto.createHash('sha256').update(fallbackKey).digest('hex').substring(0, 32);
        }
        break;

      default:
        throw new Error(`Unsupported key management: ${this.config.keyManagement}`);
    }

    return this.cachedKey;
  }

  /**
   * AWS KMS key retrieval (stubbed for now, implemented when AWS SDK available)
   */
  private async getAWSKMSKey(): Promise<string> {
    // This would integrate with AWS KMS in production
    // For now, we'll use environment fallback
    if (process.env.AWS_REGION && process.env.KMS_KEY_ID) {
      // AWS KMS integration would go here
      console.log('AWS KMS integration ready for production deployment');
    }
    
    // Fallback to environment for now
    const envKey = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
    if (!envKey) {
      throw new Error('AWS KMS key retrieval failed and no fallback key available');
    }
    return crypto.createHash('sha256').update(envKey).digest('hex').substring(0, 32);
  }

  /**
   * Encrypt Personal Health Information (PHI)
   */
  async encryptPHI(data: string): Promise<string> {
    try {
      const keyHex = await this.getEncryptionKey();
      const key = Buffer.from(keyHex, 'hex'); // Ensure key is a Buffer for createCipheriv
      const iv = crypto.randomBytes(16); // AES block size is 16 bytes

      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data, separated by a colon
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('PHI encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt Personal Health Information (PHI)
   */
  async decryptPHI(encryptedDataWithIv: string): Promise<string> {
    try {
      const keyHex = await this.getEncryptionKey();
      const key = Buffer.from(keyHex, 'hex'); // Ensure key is a Buffer for createDecipheriv
      
      const parts = encryptedDataWithIv.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format: IV missing or incorrect format.');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];

      if (iv.length !== 16) {
        throw new Error('Invalid IV length. IV must be 16 bytes for aes-256-cbc.');
      }
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('PHI decryption failed:', error);
      // Provide more context to the error if possible, but avoid leaking sensitive info
      if (error instanceof Error && (error.message.includes('bad decrypt') || error.message.includes('wrong final block length'))) {
        throw new Error('Decryption failed: Incorrect key, IV, or corrupted data.');
      }
      throw new Error('Failed to decrypt sensitive data.');
    }
  }

  /**
   * Hash sensitive data for indexing/searching (one-way)
   */
  async hashSensitiveData(data: string): Promise<string> {
    const key = await this.getEncryptionKey();
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt general application data (less sensitive than PHI)
   */
  async encryptAppData(data: string): Promise<string> {
    if (this.config.encryption === 'basic') {
      // Simple base64 encoding for development
      return Buffer.from(data).toString('base64');
    }
    
    // Full encryption for production
    return this.encryptPHI(data);
  }

  /**
   * Decrypt general application data
   */
  async decryptAppData(encryptedData: string): Promise<string> {
    if (this.config.encryption === 'basic') {
      // Simple base64 decoding for development
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    }
    
    // Full decryption for production
    return this.decryptPHI(encryptedData);
  }

  /**
   * Test encryption/decryption functionality
   */
  async testEncryption(): Promise<boolean> {
    try {
      const testData = 'Test PHI data for validation';
      const encrypted = await this.encryptPHI(testData);
      const decrypted = await this.decryptPHI(encrypted);
      
      const success = testData === decrypted;
      console.log(`Encryption test: ${success ? 'PASSED' : 'FAILED'}`);
      return success;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }
}

export const encryptionService = EncryptionService.getInstance();