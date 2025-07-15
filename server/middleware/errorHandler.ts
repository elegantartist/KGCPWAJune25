import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

/**
 * Centralized error handling middleware for the Express application.
 * This middleware catches all errors passed via `next(error)` and sends
 * a standardized, structured JSON response.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error with context from the request
  logger.error('An unhandled error occurred in an API route', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors specifically
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Invalid request data.',
      details: err.flatten().fieldErrors,
    });
  }

  // Generic fallback for all other errors
  res.status(500).json({
    error: 'An internal server error occurred.',
    message: 'The server encountered an unexpected condition. Please try again later.',
  });
};