/**
 * Privacy Service for KGC
 * 
 * This service handles anonymization of personally identifiable information (PII)
 * before sending data to LLMs, and de-anonymization after receiving responses.
 */

// Types of personal data that need to be anonymized
export enum PIIType {
  NAME = 'NAME',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  AGE = 'AGE',
  ADDRESS = 'ADDRESS',
  UIN = 'UIN'
}

// Structure to track original and anonymized values
interface AnonymizationMapping {
  original: string;
  anonymized: string;
  type: PIIType;
}

// Class for anonymizing and de-anonymizing personal data
export class PrivacyService {
  private mappings: Map<string, AnonymizationMapping> = new Map();
  
  /**
   * Clear all stored anonymization mappings
   */
  public clearMappings(): void {
    this.mappings.clear();
  }
  
  /**
   * Add a mapping between original value and anonymized placeholder
   * @param original Original value (e.g., name, email)
   * @param placeholder Anonymized placeholder (e.g., [PATIENT_NAME])
   * @param type Optional PII type
   */
  public addMapping(original: string, placeholder: string, type: PIIType = PIIType.NAME): void {
    if (!original || !placeholder) return;
    
    this.mappings.set(original, {
      original,
      anonymized: placeholder,
      type
    });
  }
  
  /**
   * Anonymize a user's personal information
   * @param data Object containing personal information
   * @returns Anonymized copy of the data
   */
  public anonymizeUserData<T extends Record<string, any>>(data: T): T {
    // Create a deep copy of the data to avoid modifying the original
    const anonymizedData = JSON.parse(JSON.stringify(data)) as T;
    
    // Process the data recursively
    this.processObjectForAnonymization(anonymizedData);
    
    return anonymizedData;
  }
  
  /**
   * Anonymize string text by replacing personally identifiable information
   * @param text Text that may contain personal information
   * @returns Anonymized version of the text with sensitive data replaced
   */
  public anonymize(text: string): string {
    if (!text) return text;
    
    let anonymizedText = text;
    
    // First, check for already mapped values
    // This ensures consistent anonymization across related messages
    this.mappings.forEach((mapping) => {
      if (mapping.original && anonymizedText.includes(mapping.original)) {
        const regex = new RegExp(`\\b${this.escapeRegExp(mapping.original)}\\b`, 'g');
        anonymizedText = anonymizedText.replace(regex, mapping.anonymized);
      }
    });
    
    // Check for common Australian PII patterns in text
    
    // Names (potential full names that match format: First Last)
    const nameRegex = /\b[A-Z][a-z]+(?: [A-Z][a-z]+)+\b/g;
    const potentialNames = anonymizedText.match(nameRegex) || [];
    
    for (const name of potentialNames) {
      if (!this.mappings.has(name)) {
        const placeholder = '[PATIENT_NAME]';
        this.addMapping(name, placeholder, PIIType.NAME);
        anonymizedText = anonymizedText.replace(new RegExp(`\\b${this.escapeRegExp(name)}\\b`, 'g'), placeholder);
      }
    }
    
    // Australian phone numbers
    const phoneRegex = /(?:\+?61|0)[2-478](?:[ -]?[0-9]){8}/g;
    const potentialPhones = anonymizedText.match(phoneRegex) || [];
    
    for (const phone of potentialPhones) {
      if (!this.mappings.has(phone)) {
        const placeholder = '[PATIENT_PHONE]';
        this.addMapping(phone, placeholder, PIIType.PHONE);
        anonymizedText = anonymizedText.replace(phone, placeholder);
      }
    }
    
    // Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const potentialEmails = anonymizedText.match(emailRegex) || [];
    
    for (const email of potentialEmails) {
      if (!this.mappings.has(email)) {
        const placeholder = '[PATIENT_EMAIL]';
        this.addMapping(email, placeholder, PIIType.EMAIL);
        anonymizedText = anonymizedText.replace(email, placeholder);
      }
    }
    
    // Medicare numbers (with and without spaces)
    const medicareRegex = /\b\d{4}[ ]?\d{5}[ ]?\d{1}\b/g;
    const potentialMedicare = anonymizedText.match(medicareRegex) || [];
    
    for (const medicare of potentialMedicare) {
      if (!this.mappings.has(medicare)) {
        const placeholder = '[MEDICARE_NUMBER]';
        this.addMapping(medicare, placeholder, PIIType.UIN);
        anonymizedText = anonymizedText.replace(medicare, placeholder);
      }
    }
    
    // Australian street addresses
    const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl)/g;
    const potentialAddresses = anonymizedText.match(addressRegex) || [];
    
    for (const address of potentialAddresses) {
      if (!this.mappings.has(address)) {
        const placeholder = '[PATIENT_ADDRESS]';
        this.addMapping(address, placeholder, PIIType.ADDRESS);
        anonymizedText = anonymizedText.replace(address, placeholder);
      }
    }
    
    // Australian postcodes
    const postcodeRegex = /\b(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}\b/g;
    const potentialPostcodes = anonymizedText.match(postcodeRegex) || [];
    
    for (const postcode of potentialPostcodes) {
      if (!this.mappings.has(postcode)) {
        const placeholder = '[PATIENT_POSTCODE]';
        this.addMapping(postcode, placeholder, PIIType.ADDRESS);
        anonymizedText = anonymizedText.replace(postcode, placeholder);
      }
    }
    
    return anonymizedText;
  }
  
  /**
   * De-anonymize response text by replacing placeholders with original values
   * @param text Text with anonymized placeholders
   * @returns Text with restored personal information
   */
  public deAnonymizeResponseText(text: string): string {
    if (!text) return text;
    
    let deanonymizedText = text;
    
    // Replace all anonymized values with original values
    this.mappings.forEach((mapping) => {
      // Only proceed if both original and anonymized values exist
      if (mapping.original && mapping.anonymized) {
        // Create a regex that matches the anonymized value as a whole word
        const regex = new RegExp(`\\b${this.escapeRegExp(mapping.anonymized)}\\b`, 'g');
        deanonymizedText = deanonymizedText.replace(regex, mapping.original);
      }
    });
    
    // Handle special placeholders even if they weren't in the original mappings
    const specialPlaceholders = [
      { pattern: /\[PATIENT_NAME\]/g, replacement: '[Patient]' },
      { pattern: /\[PATIENT_EMAIL\]/g, replacement: '[patient@email]' },
      { pattern: /\[PATIENT_UIN\]/g, replacement: '[Patient ID]' },
      { pattern: /\[DOCTOR_NAME\]/g, replacement: '[Doctor]' },
      { pattern: /\[DOCTOR_UIN\]/g, replacement: '[Doctor ID]' }
    ];
    
    specialPlaceholders.forEach(({ pattern, replacement }) => {
      deanonymizedText = deanonymizedText.replace(pattern, replacement);
    });
    
    return deanonymizedText;
  }
  
  /**
   * Process an object recursively to anonymize personal data
   * @param obj Object to process
   */
  private processObjectForAnonymization(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    
    // Process all properties in the object
    for (const key in obj) {
      const value = obj[key];
      
      // Skip null or undefined values
      if (value === null || value === undefined) continue;
      
      // Process nested objects recursively
      if (typeof value === 'object' && !Array.isArray(value)) {
        this.processObjectForAnonymization(value);
        continue;
      }
      
      // Process arrays
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object') {
            this.processObjectForAnonymization(item);
          }
        });
        continue;
      }
      
      // Anonymize string values if they match PII patterns
      if (typeof value === 'string') {
        const piiType = this.detectPIIType(key, value);
        
        if (piiType) {
          // Create anonymized value and store the mapping
          const anonymizedValue = this.getAnonymizedValue(value, piiType);
          // Store the mapping for later de-anonymization
          this.mappings.set(value, {
            original: value,
            anonymized: anonymizedValue,
            type: piiType
          });
          // Replace the value in the object
          obj[key] = anonymizedValue;
        }
      }
    }
  }
  
  /**
   * Detect if a field value contains PII based on field name and content
   * @param fieldName Name of the field
   * @param value Value to check
   * @returns PII type or null if not PII
   */
  private detectPIIType(fieldName: string, value: string): PIIType | null {
    // Normalize field name for comparison
    const normalizedFieldName = fieldName.toLowerCase();
    
    // Check field name patterns
    if (normalizedFieldName.includes('name')) {
      return PIIType.NAME;
    }
    
    if (normalizedFieldName.includes('email')) {
      return PIIType.EMAIL;
    }
    
    if (normalizedFieldName.includes('phone') || normalizedFieldName.includes('mobile')) {
      return PIIType.PHONE;
    }
    
    if (normalizedFieldName.includes('age') || normalizedFieldName.includes('dob') || normalizedFieldName.includes('birth')) {
      return PIIType.AGE;
    }
    
    if (normalizedFieldName.includes('address') || normalizedFieldName.includes('street') || 
        normalizedFieldName.includes('city') || normalizedFieldName.includes('suburb') || 
        normalizedFieldName.includes('postcode') || normalizedFieldName.includes('zip')) {
      return PIIType.ADDRESS;
    }
    
    if (normalizedFieldName.includes('uin') || normalizedFieldName.includes('id') || 
        normalizedFieldName.includes('identifier') || normalizedFieldName.includes('medicare')) {
      return PIIType.UIN;
    }
    
    // Check content patterns (Australian context)
    
    // Name detection (more flexible name pattern)
    if (/^[A-Z][a-z]+([ '-][A-Z][a-z]+)+$/.test(value)) {
      return PIIType.NAME;
    }
    
    // Email detection
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(value)) {
      return PIIType.EMAIL;
    }
    
    // Phone detection (Australian format)
    // Matches common AU formats like +61 4XX XXX XXX, 04XX XXX XXX, etc.
    if (/^(?:\+?61|0)[2-478](?:[ -]?[0-9]){8}$/.test(value.replace(/\s+/g, ''))) {
      return PIIType.PHONE;
    }
    
    // Medicare number detection (Australian context)
    if (/^\d{10}$/.test(value) || /^\d{4} \d{5} \d{1}$/.test(value)) {
      return PIIType.UIN;
    }
    
    // Australian address detection (simplified)
    if ((/\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl)/).test(value) && 
        value.length > 10) {
      return PIIType.ADDRESS;
    }
    
    // Australian postcode detection
    if (/^\d{4}$/.test(value) && parseInt(value) >= 800 && parseInt(value) <= 9999) {
      return PIIType.ADDRESS;
    }
    
    return null;
  }
  
  /**
   * Generate an anonymized replacement value based on PII type
   * @param originalValue Original value
   * @param type Type of PII
   * @returns Anonymized value
   */
  private getAnonymizedValue(originalValue: string, type: PIIType): string {
    switch (type) {
      case PIIType.NAME:
        // Check if it's a full name with spaces
        if (originalValue.includes(' ')) {
          const nameParts = originalValue.split(' ');
          // For first/last name format
          if (nameParts.length === 2) {
            return '[PATIENT_FIRST_NAME] [PATIENT_LAST_NAME]';
          }
          // For names with middle names or more parts
          return '[PATIENT_FULL_NAME]';
        }
        // Just a single name
        return '[PATIENT_NAME]';
      
      case PIIType.EMAIL:
        // Check if it's likely a patient or doctor email
        if (originalValue.toLowerCase().includes('doctor') || 
            originalValue.toLowerCase().includes('dr.') ||
            originalValue.toLowerCase().includes('practitioner')) {
          return '[DOCTOR_EMAIL]';
        }
        return '[PATIENT_EMAIL]';
      
      case PIIType.PHONE:
        // Check if it's likely a medical office phone
        if (originalValue.startsWith('+612') || originalValue.startsWith('02')) {
          return '[CLINIC_PHONE]';
        }
        return '[PATIENT_PHONE]';
      
      case PIIType.AGE:
        // For numeric age
        if (/^\d+$/.test(originalValue)) {
          return '[PATIENT_AGE]';
        }
        // For date of birth
        if (originalValue.includes('/') || originalValue.includes('-')) {
          return '[PATIENT_DOB]';
        }
        return '[PATIENT_AGE_INFO]';
      
      case PIIType.ADDRESS:
        // Address with street number detection
        if (/^\d+\s/.test(originalValue)) {
          return '[PATIENT_HOME_ADDRESS]';
        }
        // Suburb or postcode detection
        if (/^\d{4}$/.test(originalValue) || originalValue.length < 20) {
          return '[PATIENT_SUBURB]';
        }
        // Full address
        return '[PATIENT_ADDRESS]';
      
      case PIIType.UIN:
        // Medicare number pattern
        if (/^\d{4} \d{5} \d{1}$/.test(originalValue) || /^\d{10}$/.test(originalValue)) {
          return '[MEDICARE_NUMBER]';
        }
        // KGC patient identifier
        if (originalValue.startsWith('P')) {
          return '[PATIENT_UIN]';
        }
        // KGC doctor identifier
        if (originalValue.startsWith('D')) {
          return '[DOCTOR_UIN]';
        }
        return '[ID_NUMBER]';
      
      default:
        return '[REDACTED_PERSONAL_INFO]';
    }
  }
  
  /**
   * Escape special characters for use in regex
   * @param string String to escape
   * @returns Escaped string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Create and export a singleton instance
const privacyServiceInstance = new PrivacyService();
export { privacyServiceInstance as privacyService };