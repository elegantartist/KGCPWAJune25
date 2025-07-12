// Placeholder for custom error types used across services

export class ServiceError extends Error {
  public readonly code?: string | number;
  public readonly details?: any;

  constructor(message: string, code?: string | number, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AppError extends ServiceError {
  constructor(message = "An application error occurred", code: string | number = "APP_ERROR", details?: any) {
    super(message, code, details);
  }
}

export class APIError extends ServiceError {
  constructor(message = "An API error occurred", code: string | number = "API_ERROR", details?: any) {
    super(message, code, details);
  }
}

export class LLMError extends ServiceError {
  constructor(message = "An LLM processing error occurred", code: string | number = "LLM_ERROR", details?: any) {
    super(message, code, details);
  }
}

export class SecurityError extends ServiceError { // Added SecurityError
  constructor(message = "A security error occurred", code: string | number = "SECURITY_ERROR", details?: any) {
    super(message, code, details);
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message = "Authentication failed", details?: any) {
    super(message, "AUTH_ERROR", details);
  }
}

export class AuthorizationError extends ServiceError {
  constructor(message = "Authorization denied", details?: any) {
    super(message, "AUTH_Z_ERROR", details);
  }
}

export class NotFoundError extends ServiceError {
  constructor(message = "Resource not found", details?: any) {
    super(message, "NOT_FOUND", details);
  }
}

export class ValidationError extends ServiceError {
  constructor(message = "Validation failed", details?: any) {
    super(message, "VALIDATION_ERROR", details);
  }
}

// Updated default export to include SecurityError
export default {
    ServiceError,
    AppError,
    APIError,
    LLMError,
    SecurityError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError
};
