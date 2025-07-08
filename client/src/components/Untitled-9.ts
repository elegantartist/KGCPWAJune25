/**
 * Custom Error Classes
 *
 * This file defines custom error types for the application, allowing for more
 * specific error handling and clearer, more informative logging.
 */

/**
 * Base class for all operational errors in the application.
 * Operational errors are known issues that can occur during runtime (e.g., API down, invalid input)
 * and are not necessarily bugs.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(name: string, statusCode: number, description: string, isOperational: boolean) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}

export class APIError extends AppError {
  constructor(name: string, statusCode = 500, description = 'Internal Server Error', isOperational = true) {
    super(name, statusCode, description, isOperational);
  }
}

export class LLMError extends APIError {
  constructor(description = 'The AI service is currently unavailable. Please try again later.') {
    super('LLMError', 503, description, true);
  }
}

export class SecurityError extends APIError {
  constructor(description = 'Your request could not be processed due to a security policy.') {
    super('SecurityError', 400, description, true);
  }
}