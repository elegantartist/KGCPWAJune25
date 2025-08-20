import { Request, Response, NextFunction } from 'express';

// Helmet-like security headers middleware (lightweight implementation)
export function helmetMiddleware(req: Request, res: Response, next: NextFunction) {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Development CSP - more permissive for Vite
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite needs these in dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.twilio.com ws: wss:",
      "frame-ancestors 'none'"
    ].join('; '));
  } else {
    // Production CSP - more restrictive
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.twilio.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));
    
    // HTTPS enforcement in production
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
}