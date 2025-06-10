/**
 * PII/PHI Data Management Service
 * Handles anonymization, tokenization, and secure data processing for LLM interactions
 */

import crypto from 'crypto';
import { encryptionService } from '../encryptionService';
import { auditLogger } from '../auditLogger';

// Types for PII/PHI handling
interface PIIData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  socialSecurityNumber?: string;
  medicalRecordNumber?: string;
}

interface PHIData {
  diagnosis?: string;
  medications?: string[];
  allergies?: string[];
  treatmentHistory?: string;
  labResults?: any[];
  vitalSigns?: any;
  healthMetrics?: any;
}

interface AnonymizedData {
  tokenizedData: Record<string, string>;
  originalMapping: Record<string, string>;
  sessionId: string;
  expiresAt: Date;
}

interface LLMRequest {
  prompt: string;
  context?: any;
  patientId?: number;
  doctorId?: number;
  sessionId?: string;
}

interface LLMResponse {
  content: string;
  metadata?: any;
  usage?: any;
}

class PIIPhiManager {
  private static instance: PIIPhiManager;
  private tokenMappings: Map<string, AnonymizedData> = new Map();
  private readonly TOKEN_EXPIRY_HOURS = 2;

  private constructor() {
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  static getInstance(): PIIPhiManager {
    if (!PIIPhiManager.instance) {
      PIIPhiManager.instance = new PIIPhiManager();
    }
    return PIIPhiManager.instance;
  }

  /**
   * Generate secure tokens for PII/PHI data
   */
  private generateToken(prefix: string = 'TOKEN'): string {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Create anonymized tokens for PII data
   */
  async anonymizePIIData(data: PIIData, sessionId?: string): Promise<AnonymizedData> {
    const currentSessionId = sessionId || crypto.randomUUID();
    const tokenizedData: Record<string, string> = {};
    const originalMapping: Record<string, string> = {};

    // Tokenize each PII field
    if (data.name) {
      const token = this.generateToken('NAME');
      tokenizedData.name = token;
      originalMapping[token] = data.name;
    }

    if (data.email) {
      const token = this.generateToken('EMAIL');
      tokenizedData.email = token;
      originalMapping[token] = data.email;
    }

    if (data.phoneNumber) {
      const token = this.generateToken('PHONE');
      tokenizedData.phoneNumber = token;
      originalMapping[token] = data.phoneNumber;
    }

    if (data.address) {
      const token = this.generateToken('ADDR');
      tokenizedData.address = token;
      originalMapping[token] = data.address;
    }

    if (data.dateOfBirth) {
      const token = this.generateToken('DOB');
      tokenizedData.dateOfBirth = token;
      originalMapping[token] = data.dateOfBirth;
    }

    if (data.socialSecurityNumber) {
      const token = this.generateToken('SSN');
      tokenizedData.socialSecurityNumber = token;
      originalMapping[token] = data.socialSecurityNumber;
    }

    if (data.medicalRecordNumber) {
      const token = this.generateToken('MRN');
      tokenizedData.medicalRecordNumber = token;
      originalMapping[token] = data.medicalRecordNumber;
    }

    const anonymizedData: AnonymizedData = {
      tokenizedData,
      originalMapping,
      sessionId: currentSessionId,
      expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    };

    // Store encrypted mapping
    const encryptedMapping = await encryptionService.encryptPHI(JSON.stringify(originalMapping));
    this.tokenMappings.set(currentSessionId, {
      ...anonymizedData,
      originalMapping: { encrypted: encryptedMapping }
    });

    // Audit log
    await auditLogger.logDataAccess({
      action: 'PII_ANONYMIZATION',
      userId: 0, // System action
      dataType: 'PII',
      details: { sessionId: currentSessionId, fieldsProcessed: Object.keys(tokenizedData) }
    });

    return anonymizedData;
  }

  /**
   * Create anonymized tokens for PHI data
   */
  async anonymizePHIData(data: PHIData, sessionId?: string): Promise<AnonymizedData> {
    const currentSessionId = sessionId || crypto.randomUUID();
    const tokenizedData: Record<string, string> = {};
    const originalMapping: Record<string, string> = {};

    // Tokenize sensitive health information
    if (data.diagnosis) {
      const token = this.generateToken('DIAG');
      tokenizedData.diagnosis = token;
      originalMapping[token] = data.diagnosis;
    }

    if (data.medications && Array.isArray(data.medications)) {
      const medicationTokens = data.medications.map(med => {
        const token = this.generateToken('MED');
        originalMapping[token] = med;
        return token;
      });
      tokenizedData.medications = JSON.stringify(medicationTokens);
    }

    if (data.allergies && Array.isArray(data.allergies)) {
      const allergyTokens = data.allergies.map(allergy => {
        const token = this.generateToken('ALLERGY');
        originalMapping[token] = allergy;
        return token;
      });
      tokenizedData.allergies = JSON.stringify(allergyTokens);
    }

    if (data.treatmentHistory) {
      const token = this.generateToken('TREATMENT');
      tokenizedData.treatmentHistory = token;
      originalMapping[token] = data.treatmentHistory;
    }

    // Anonymize health metrics (scores can remain but context is tokenized)
    if (data.healthMetrics) {
      const token = this.generateToken('METRICS');
      tokenizedData.healthMetrics = token;
      originalMapping[token] = JSON.stringify(data.healthMetrics);
    }

    const anonymizedData: AnonymizedData = {
      tokenizedData,
      originalMapping,
      sessionId: currentSessionId,
      expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    };

    // Store encrypted mapping
    const encryptedMapping = await encryptionService.encryptPHI(JSON.stringify(originalMapping));
    this.tokenMappings.set(currentSessionId, {
      ...anonymizedData,
      originalMapping: { encrypted: encryptedMapping }
    });

    // Audit log
    await auditLogger.logDataAccess({
      action: 'PHI_ANONYMIZATION',
      userId: 0, // System action
      dataType: 'PHI',
      details: { sessionId: currentSessionId, fieldsProcessed: Object.keys(tokenizedData) }
    });

    return anonymizedData;
  }

  /**
   * Prepare data for LLM processing by anonymizing sensitive information
   */
  async prepareLLMRequest(request: LLMRequest): Promise<{ sanitizedRequest: LLMRequest; sessionId: string }> {
    const sessionId = crypto.randomUUID();
    let sanitizedPrompt = request.prompt;
    let sanitizedContext = request.context;

    // Extract and tokenize PII/PHI from prompt
    const piiMatches = this.extractPIIFromText(sanitizedPrompt);
    if (Object.keys(piiMatches).length > 0) {
      const anonymized = await this.anonymizePIIData(piiMatches, sessionId);
      sanitizedPrompt = this.replaceTextWithTokens(sanitizedPrompt, anonymized.originalMapping);
    }

    // Handle context data anonymization
    if (sanitizedContext) {
      const contextPII = this.extractPIIFromObject(sanitizedContext);
      if (Object.keys(contextPII).length > 0) {
        const anonymized = await this.anonymizePIIData(contextPII, sessionId);
        sanitizedContext = this.replaceObjectWithTokens(sanitizedContext, anonymized.originalMapping);
      }
    }

    const sanitizedRequest: LLMRequest = {
      ...request,
      prompt: sanitizedPrompt,
      context: sanitizedContext,
      sessionId
    };

    return { sanitizedRequest, sessionId };
  }

  /**
   * De-anonymize LLM response by replacing tokens with original data
   */
  async processLLMResponse(response: LLMResponse, sessionId: string): Promise<LLMResponse> {
    const mappingData = this.tokenMappings.get(sessionId);
    if (!mappingData || new Date() > mappingData.expiresAt) {
      // If no mapping or expired, return response as-is
      return response;
    }

    // Decrypt the original mapping
    const encryptedMapping = (mappingData.originalMapping as any).encrypted;
    const decryptedMapping = await encryptionService.decryptPHI(encryptedMapping);
    const originalMapping = JSON.parse(decryptedMapping);

    // Replace tokens in response content
    let deanonymizedContent = response.content;
    for (const [token, originalValue] of Object.entries(originalMapping)) {
      deanonymizedContent = deanonymizedContent.replace(new RegExp(token as string, 'g'), originalValue as string);
    }

    // Audit log
    await auditLogger.logDataAccess({
      action: 'LLM_RESPONSE_DEANONYMIZATION',
      userId: 0, // System action
      dataType: 'PII_PHI',
      details: { sessionId, tokensProcessed: Object.keys(originalMapping).length }
    });

    return {
      ...response,
      content: deanonymizedContent
    };
  }

  /**
   * Extract PII patterns from text using regex
   */
  private extractPIIFromText(text: string): PIIData {
    const piiData: PIIData = {};

    // Email pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) {
      piiData.email = emails[0]; // Use first match
    }

    // Phone pattern (various formats)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex);
    if (phones && phones.length > 0) {
      piiData.phoneNumber = phones[0];
    }

    // SSN pattern
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const ssns = text.match(ssnRegex);
    if (ssns && ssns.length > 0) {
      piiData.socialSecurityNumber = ssns[0];
    }

    return piiData;
  }

  /**
   * Extract PII from object structure
   */
  private extractPIIFromObject(obj: any): PIIData {
    const piiData: PIIData = {};

    if (obj.name) piiData.name = obj.name;
    if (obj.email) piiData.email = obj.email;
    if (obj.phoneNumber) piiData.phoneNumber = obj.phoneNumber;
    if (obj.address) piiData.address = obj.address;
    if (obj.dateOfBirth) piiData.dateOfBirth = obj.dateOfBirth;

    return piiData;
  }

  /**
   * Replace text with tokens
   */
  private replaceTextWithTokens(text: string, mapping: Record<string, string>): string {
    let result = text;
    for (const [token, originalValue] of Object.entries(mapping)) {
      result = result.replace(new RegExp(originalValue, 'g'), token);
    }
    return result;
  }

  /**
   * Replace object values with tokens
   */
  private replaceObjectWithTokens(obj: any, mapping: Record<string, string>): any {
    const result = { ...obj };
    for (const [token, originalValue] of Object.entries(mapping)) {
      for (const key in result) {
        if (result[key] === originalValue) {
          result[key] = token;
        }
      }
    }
    return result;
  }

  /**
   * Clean up expired token mappings
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [sessionId, data] of this.tokenMappings.entries()) {
      if (now > data.expiresAt) {
        this.tokenMappings.delete(sessionId);
      }
    }
  }

  /**
   * Get token mapping for debugging (admin only)
   */
  async getTokenMapping(sessionId: string): Promise<Record<string, string> | null> {
    const mappingData = this.tokenMappings.get(sessionId);
    if (!mappingData || new Date() > mappingData.expiresAt) {
      return null;
    }

    const encryptedMapping = (mappingData.originalMapping as any).encrypted;
    const decryptedMapping = await encryptionService.decryptPHI(encryptedMapping);
    return JSON.parse(decryptedMapping);
  }

  /**
   * Force expire a session (for security)
   */
  expireSession(sessionId: string): void {
    this.tokenMappings.delete(sessionId);
    auditLogger.logSecurityEvent({
      eventType: 'DATA_ACCESS',
      severity: 'MEDIUM',
      userId: 0,
      ipAddress: 'system',
      userAgent: 'PIIPhiManager',
      details: { action: 'SESSION_EXPIRED', sessionId }
    });
  }
}

export const piiPhiManager = PIIPhiManager.getInstance();