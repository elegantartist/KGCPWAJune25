import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Global error handling middleware
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Log the complete error for debugging
  console.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req.session as any)?.userId,
    timestamp: new Date().toISOString()
  });

  // Handle different types of errors
  let statusCode = 500;
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (err instanceof z.ZodError) {
    // Validation errors
    statusCode = 400;
    message = 'Validation failed';
    details = {
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        received: e.received
      }))
    };
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Authentication required';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access denied';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message || message;
  }

  // Don't expose sensitive error details in production
  const response: any = {
    error: true,
    message: message,
    statusCode: statusCode
  };

  // Only include error details in development
  if (isDevelopment) {
    response.details = details || err.message;
    response.stack = err.stack;
  } else if (details) {
    response.details = details;
  }

  // Add request ID for tracking
  response.requestId = generateRequestId();

  res.status(statusCode).json(response);
}

// Generate unique request ID for error tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Async wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler
export function notFoundHandler(req: Request, res: Response) {
  console.log(`404 - Not Found: ${req.method} ${req.url} from IP: ${req.ip}`);
  
  res.status(404).json({
    error: true,
    message: 'Endpoint not found',
    statusCode: 404,
    path: req.url,
    method: req.method
  });
}