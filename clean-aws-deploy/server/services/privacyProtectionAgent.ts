/**
 * Privacy Protection Agent (PPA)
 * 
 * This agent is responsible for:
 * 1. Detecting and anonymizing PII in patient data before sending to external LLMs
 * 2. Maintaining a secure mapping between original data and anonymized placeholders
 * 3. De-anonymizing responses from external LLMs before showing to patients
 * 
 * The PPA ensures no PII leaves the controlled environment, acting as a secure chokepoint
 * for all sensitive data passing through the system.
 */

import { v4 as uuidv4 } from 'uuid';

// Types of PII we detect and anonymize
export enum PIIType {
  NAME = 'NAME',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  MEDICARE = 'MEDICARE',
  ADDRESS = 'ADDRESS',
  POSTCODE = 'POSTCODE',
  LOCATION = 'LOCATION',
  OTHER = 'OTHER'
}

// Interface for tracking PII replacements
interface PIIMapping {
  original: string;
  anonymized: string;
  type: PIIType;
}

export class PrivacyProtectionAgent {
  private static instance: PrivacyProtectionAgent;
  private sessionMappings: Map<string, PIIMapping[]> = new Map();
  
  // Private constructor for singleton pattern
  private constructor() {}
  
  // Get the singleton instance
  public static getInstance(): PrivacyProtectionAgent {
    if (!PrivacyProtectionAgent.instance) {
      PrivacyProtectionAgent.instance = new PrivacyProtectionAgent();
    }
    return PrivacyProtectionAgent.instance;
  }
  
  /**
   * Anonymize text by detecting and replacing PII
   * @param text The original text containing PII
   * @param sessionId A unique session ID to track replacements
   * @returns Anonymized text safe to send to external services
   */
  public anonymize(text: string, sessionId: string = uuidv4()): { anonymizedText: string, sessionId: string } {
    if (!text) return { anonymizedText: '', sessionId };
    
    // Create a new mapping array for this session if it doesn't exist
    if (!this.sessionMappings.has(sessionId)) {
      this.sessionMappings.set(sessionId, []);
    }
    
    let anonymizedText = text;
    
    // Get the mappings for this session
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    // 1. First apply existing mappings to maintain consistency
    mappings.forEach(mapping => {
      // Use a regex with word boundaries to ensure we're not replacing parts of words
      const regex = new RegExp(`\\b${this.escapeRegExp(mapping.original)}\\b`, 'gi');
      anonymizedText = anonymizedText.replace(regex, mapping.anonymized);
    });
    
    // 2. Detect and anonymize names (already handled by existing mappings)
    
    // 3. Detect and anonymize email addresses
    anonymizedText = this.anonymizeEmails(anonymizedText, sessionId);
    
    // 4. Detect and anonymize Australian phone numbers
    anonymizedText = this.anonymizeAustralianPhones(anonymizedText, sessionId);
    
    // 5. Detect and anonymize Medicare numbers
    anonymizedText = this.anonymizeMedicareNumbers(anonymizedText, sessionId);
    
    // 6. Detect and anonymize addresses
    anonymizedText = this.anonymizeAddresses(anonymizedText, sessionId);
    
    // 7. Detect and anonymize Australian postcodes
    anonymizedText = this.anonymizePostcodes(anonymizedText, sessionId);
    
    return { anonymizedText, sessionId };
  }
  
  /**
   * De-anonymize text by replacing placeholders with original PII
   * @param text The anonymized text containing placeholders
   * @param sessionId The session ID to retrieve mappings
   * @returns De-anonymized text with original PII restored
   */
  public deAnonymize(text: string, sessionId: string): string {
    if (!text) return '';
    if (!this.sessionMappings.has(sessionId)) return text;
    
    let deAnonymizedText = text;
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    // Replace all anonymized placeholders with original values
    mappings.forEach(mapping => {
      const regex = new RegExp(this.escapeRegExp(mapping.anonymized), 'g');
      deAnonymizedText = deAnonymizedText.replace(regex, mapping.original);
    });
    
    return deAnonymizedText;
  }
  
  /**
   * Clear session mappings to free up memory
   * @param sessionId The session ID to clear
   */
  public clearSession(sessionId: string): void {
    this.sessionMappings.delete(sessionId);
  }
  
  /**
   * Get all mappings for a session (for debugging)
   * @param sessionId The session ID
   * @returns Array of PII mappings
   */
  public getMappings(sessionId: string): PIIMapping[] {
    return this.sessionMappings.get(sessionId) || [];
  }
  
  /**
   * Add a custom mapping for anonymization
   * @param original The original text to anonymize
   * @param type The type of PII
   * @param sessionId The session ID
   * @returns The anonymized placeholder
   */
  public addCustomMapping(original: string, type: PIIType, sessionId: string): string {
    // Create session if it doesn't exist
    if (!this.sessionMappings.has(sessionId)) {
      this.sessionMappings.set(sessionId, []);
    }
    
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    // Check if mapping already exists
    const existingMapping = mappings.find(m => m.original === original);
    if (existingMapping) return existingMapping.anonymized;
    
    // Create a new anonymized placeholder
    const anonymized = this.generatePlaceholder(type);
    
    // Add mapping to session
    mappings.push({ original, anonymized, type });
    
    return anonymized;
  }
  
  // Helper method to escape special regex characters
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // Helper method to generate placeholders based on PII type
  private generatePlaceholder(type: PIIType): string {
    const typeLabels = {
      [PIIType.NAME]: 'PATIENT_NAME',
      [PIIType.EMAIL]: 'EMAIL_ADDRESS',
      [PIIType.PHONE]: 'PHONE_NUMBER',
      [PIIType.MEDICARE]: 'MEDICARE_NUMBER',
      [PIIType.ADDRESS]: 'ADDRESS',
      [PIIType.POSTCODE]: 'POSTCODE',
      [PIIType.LOCATION]: 'LOCATION',
      [PIIType.OTHER]: 'PERSONAL_INFO'
    };
    
    return `[${typeLabels[type]}]`;
  }
  
  // Anonymize email addresses
  private anonymizeEmails(text: string, sessionId: string): string {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailRegex) || [];
    
    let anonymizedText = text;
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    matches.forEach(email => {
      // Check if we already have a mapping for this email
      const existingMapping = mappings.find(m => m.original === email);
      
      if (existingMapping) {
        // Use existing mapping
        anonymizedText = anonymizedText.replace(email, existingMapping.anonymized);
      } else {
        // Create new mapping
        const anonymized = this.generatePlaceholder(PIIType.EMAIL);
        mappings.push({ original: email, anonymized, type: PIIType.EMAIL });
        anonymizedText = anonymizedText.replace(email, anonymized);
      }
    });
    
    return anonymizedText;
  }
  
  // Anonymize Australian phone numbers
  private anonymizeAustralianPhones(text: string, sessionId: string): string {
    // Australian phone number formats: +61 412 345 678, 0412 345 678, (02) 9876 5432, etc.
    const phoneRegex = /(\+61\s?\d{1,2}\s?\d{3,4}\s?\d{3,4})|(\(0\d{1,2}\)\s?\d{4}\s?\d{4})|(0\d{1,2}\s?\d{4}\s?\d{4})|(0\d{3}\s?\d{3}\s?\d{3})/g;
    const matches = text.match(phoneRegex) || [];
    
    let anonymizedText = text;
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    matches.forEach(phone => {
      // Check if we already have a mapping for this phone
      const existingMapping = mappings.find(m => m.original === phone);
      
      if (existingMapping) {
        // Use existing mapping
        anonymizedText = anonymizedText.replace(phone, existingMapping.anonymized);
      } else {
        // Create new mapping
        const anonymized = this.generatePlaceholder(PIIType.PHONE);
        mappings.push({ original: phone, anonymized, type: PIIType.PHONE });
        anonymizedText = anonymizedText.replace(phone, anonymized);
      }
    });
    
    return anonymizedText;
  }
  
  // Anonymize Medicare numbers
  private anonymizeMedicareNumbers(text: string, sessionId: string): string {
    // Medicare numbers are 10-11 digits, often with spaces: 2123 45670 1
    const medicareRegex = /\b\d{4}\s?\d{5}\s?\d{1}\b/g;
    const matches = text.match(medicareRegex) || [];
    
    let anonymizedText = text;
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    matches.forEach(medicare => {
      // Check if we already have a mapping for this medicare number
      const existingMapping = mappings.find(m => m.original === medicare);
      
      if (existingMapping) {
        // Use existing mapping
        anonymizedText = anonymizedText.replace(medicare, existingMapping.anonymized);
      } else {
        // Create new mapping
        const anonymized = this.generatePlaceholder(PIIType.MEDICARE);
        mappings.push({ original: medicare, anonymized, type: PIIType.MEDICARE });
        anonymizedText = anonymizedText.replace(medicare, anonymized);
      }
    });
    
    return anonymizedText;
  }
  
  // Anonymize addresses
  private anonymizeAddresses(text: string, sessionId: string): string {
    // This is a simplified address detection - a more sophisticated approach would use NLP
    // We're looking for patterns like "123 Main Street, Sydney NSW 2000"
    const addressRegex = /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|terrace|ter|place|pl|square|sq)\b(?:[^,]*,[^,]*)/gi;
    const matches = text.match(addressRegex) || [];
    
    let anonymizedText = text;
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    matches.forEach(address => {
      // Check if we already have a mapping for this address
      const existingMapping = mappings.find(m => m.original === address);
      
      if (existingMapping) {
        // Use existing mapping
        anonymizedText = anonymizedText.replace(address, existingMapping.anonymized);
      } else {
        // Create new mapping
        const anonymized = this.generatePlaceholder(PIIType.ADDRESS);
        mappings.push({ original: address, anonymized, type: PIIType.ADDRESS });
        anonymizedText = anonymizedText.replace(address, anonymized);
      }
    });
    
    return anonymizedText;
  }
  
  // Anonymize Australian postcodes
  private anonymizePostcodes(text: string, sessionId: string): string {
    // Australian postcodes are 4 digits, but we need to avoid anonymizing other 4-digit numbers
    // This is a simplified approach, a more sophisticated one would use context
    const postcodeRegex = /\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}\b|\b\d{4}\s+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/g;
    const matches = text.match(postcodeRegex) || [];
    
    let anonymizedText = text;
    const mappings = this.sessionMappings.get(sessionId) || [];
    
    matches.forEach(postcode => {
      // Check if we already have a mapping for this postcode
      const existingMapping = mappings.find(m => m.original === postcode);
      
      if (existingMapping) {
        // Use existing mapping
        anonymizedText = anonymizedText.replace(postcode, existingMapping.anonymized);
      } else {
        // Create new mapping
        const anonymized = this.generatePlaceholder(PIIType.POSTCODE);
        mappings.push({ original: postcode, anonymized, type: PIIType.POSTCODE });
        anonymizedText = anonymizedText.replace(postcode, anonymized);
      }
    });
    
    return anonymizedText;
  }
}

// Export singleton instance
export const privacyProtectionAgent = PrivacyProtectionAgent.getInstance();