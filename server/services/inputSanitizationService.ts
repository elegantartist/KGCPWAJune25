/**
 * Input Sanitization Service for KGC
 * 
 * Provides secure input sanitization to prevent XSS and injection attacks
 * while preserving legitimate healthcare data
 */

export class InputSanitizationService {
  
  /**
   * Sanitize general text input (names, descriptions, etc.)
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }
    
    return email
      .trim()
      .toLowerCase()
      .replace(/[<>'"]/g, '') // Remove dangerous characters
      .substring(0, 254); // Email length limit
  }

  /**
   * Sanitize medical directives (preserve medical terminology)
   */
  static sanitizeDirective(directive: string): string {
    if (!directive || typeof directive !== 'string') {
      return '';
    }
    
    return directive
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets only
      .replace(/javascript:/gi, '') // Remove javascript
      .substring(0, 500); // Reasonable directive length
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: string | number): number | null {
    if (typeof input === 'number' && !isNaN(input)) {
      return input;
    }
    
    if (typeof input === 'string') {
      const num = parseFloat(input.replace(/[^\d.-]/g, ''));
      return isNaN(num) ? null : num;
    }
    
    return null;
  }

  /**
   * Validate and sanitize UIN (User Identification Number)
   */
  static sanitizeUIN(uin: string): string {
    if (!uin || typeof uin !== 'string') {
      return '';
    }
    
    return uin
      .trim()
      .replace(/[^A-Z0-9]/g, '') // Only alphanumeric uppercase
      .substring(0, 20); // Reasonable UIN length
  }

  /**
   * Sanitize phone numbers (preserve Australian format)
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }
    
    return phone
      .trim()
      .replace(/[^\d\s\+\(\)\-]/g, '') // Keep numbers, spaces, +, (), -
      .substring(0, 20); // Reasonable phone length
  }

  /**
   * Validate input length
   */
  static validateLength(input: string, maxLength: number): boolean {
    return input && input.length <= maxLength;
  }

  /**
   * Check for potentially malicious patterns
   */
  static containsMaliciousPatterns(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }
    
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\(/i,
      /expression\(/i
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize object properties recursively
   */
  static sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize form data for KGC specific forms
   */
  static sanitizeFormData(formData: any): any {
    const sanitized: any = {};
    
    // Handle common KGC form fields
    if (formData.name) {
      sanitized.name = this.sanitizeText(formData.name);
    }
    
    if (formData.email) {
      sanitized.email = this.sanitizeEmail(formData.email);
    }
    
    if (formData.directive) {
      sanitized.directive = this.sanitizeDirective(formData.directive);
    }
    
    if (formData.uin) {
      sanitized.uin = this.sanitizeUIN(formData.uin);
    }
    
    if (formData.phoneNumber) {
      sanitized.phoneNumber = this.sanitizePhone(formData.phoneNumber);
    }
    
    // Handle numeric fields
    ['targetValue', 'score', 'roleId'].forEach(field => {
      if (formData[field] !== undefined) {
        sanitized[field] = this.sanitizeNumber(formData[field]);
      }
    });
    
    // Copy other safe fields
    ['category', 'active'].forEach(field => {
      if (formData[field] !== undefined) {
        sanitized[field] = formData[field];
      }
    });
    
    return sanitized;
  }
}

export const inputSanitizationService = InputSanitizationService;