import { Request, Response, NextFunction } from 'express';

// Defines the contract for any validation function
export interface IValidationMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
}

// Defines the contract for the rate limiter
export interface IRateLimitMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
}

// Defines the contract for the sanitization function
export interface ISanitizationMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
}

// Defines the contract for security headers middleware
export interface ISecurityHeadersMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
}

// Defines the contract for audit logging middleware
export interface IAuditMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
}

// Defines the contract for validation error handling
export interface IValidationErrorHandler {
  (req: Request, res: Response, next: NextFunction): void;
}