/**
 * Production-Ready Security Manager
 * Handles authentication, authorization, and security monitoring
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { envManager } from './environmentConfig';
import { auditLogger } from './auditLogger';

export interface AccessContext {
  userId: number;
  role: string;
  isAdminAccess: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface SessionData {
  userId?: number;
  doctorId?: number;
  patientId?: number;
  userRole?: string;
  lastActivity?: number;
}

// Failed login attempt tracking
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();
const FAILED_LOGIN_LIMIT = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

class SecurityManager {
  private static instance: SecurityManager;
  private config = envManager.getConfig();

  private constructor() {
    // Cleanup failed login attempts periodically
    setInterval(() => this.cleanupFailedAttempts(), CLEANUP_INTERVAL);
  }

  static getInstance(): SecurityManager {
    if (!this.instance) {
      this.instance = new SecurityManager();
    }
    return this.instance;
  }

  /**
   * Enhanced authentication middleware with role-based access control
   */
  createAuthMiddleware(allowedRoles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Assuming req.user is populated by JWT authMiddleware from './auth.ts'
      // And req.session is populated by express-session
      // We'll store a simple flag or minimal user data in req.session upon login if needed,
      // but primary user details for the request come from req.user (JWT).

      const ipAddress = this.getClientIP(req);
      const userAgent = req.get('User-Agent') || 'Unknown';

      // Check if IP is blocked due to failed login attempts
      if (this.isIPBlocked(ipAddress)) {
        await auditLogger.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          ipAddress,
          userAgent,
          details: { reason: 'IP blocked due to failed login attempts' }
        });
        return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
      }

      // Check if session exists (user has logged in and express-session created a session)
      // and if req.user (from JWT) exists.
      // The JWT middleware already handles token presence and validity.
      // express-session handles session presence.
      if (!req.session || !req.user) { // req.user should be populated by JWT auth if token is valid
        await auditLogger.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'MEDIUM',
          ipAddress,
          userAgent,
          details: { reason: 'No valid session or user token' }
        });
        return res.status(401).json({ error: 'Authentication required' });
      }

      // User data from JWT token (already verified by JWT middleware if it's placed before this)
      const jwtUser = req.user as any; // Cast from Express.User | undefined to any for now
                                      // Or ideally use the TokenPayload type from auth.ts

      // Admin can access any resource for testing/compliance
      if (jwtUser.role === 'admin') {
        const targetUserId = req.params.userId ? parseInt(req.params.userId) : jwtUser.userId;
        req.accessContext = {
          userId: targetUserId,
          role: jwtUser.role,
          isAdminAccess: !!req.params.userId && req.params.userId !== jwtUser.userId.toString(),
          ipAddress,
          userAgent
        };

        if (req.accessContext.isAdminAccess) {
          await auditLogger.logSecurityEvent({
            eventType: 'ADMIN_ACCESS',
            severity: 'MEDIUM',
            userId: jwtUser.userId, // Admin's ID
            targetUserId: targetUserId, // ID of user being accessed
            ipAddress,
            userAgent,
            details: {
              endpoint: req.path,
              method: req.method,
              complianceNote: 'Admin accessing user data for testing/support'
            }
          });
        }
        return next();
      }

      // Role-based access control
      if (!allowedRoles.includes(jwtUser.role)) {
        await auditLogger.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          userId: jwtUser.userId,
          ipAddress,
          userAgent,
          details: {
            requiredRoles: allowedRoles,
            userRole: jwtUser.role,
            endpoint: req.path
          }
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Populate accessContext for regular users
      req.accessContext = {
        userId: jwtUser.userId,
        role: jwtUser.role,
        isAdminAccess: false,
        ipAddress,
        userAgent
      };

      next();
    };
  }

  // createSessionTimeoutMiddleware() is removed as express-session handles global timeout.
  // If role-specific active timeouts are needed, a new, simpler middleware
  // working with req.session.lastActivity (set upon login/activity) could be added.

  /**
   * Track and handle failed login attempts
   */
  async trackFailedLogin(identifier: string, ipAddress: string, userAgent: string): Promise<boolean> {
    const key = `${ipAddress}:${identifier}`;
    const attempts = failedLoginAttempts.get(key) || { count: 0, lastAttempt: 0, blocked: false };
    
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    if (attempts.count >= FAILED_LOGIN_LIMIT) {
      attempts.blocked = true;
      
      // Trigger security alert
      await auditLogger.triggerSecurityAlert({
        type: 'SUSPICIOUS_LOGIN_ACTIVITY',
        severity: 'HIGH',
        ipAddress,
        userIdentifier: identifier,
        details: {
          attemptCount: attempts.count,
          blockDuration: BLOCK_DURATION,
          userAgent
        }
      });
    }
    
    failedLoginAttempts.set(key, attempts);
    return attempts.blocked;
  }

  /**
   * Clear failed login attempts on successful login
   */
  clearFailedAttempts(identifier: string, ipAddress: string): void {
    const key = `${ipAddress}:${identifier}`;
    failedLoginAttempts.delete(key);
  }

  /**
   * Check if an IP address is currently blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    const entries = Array.from(failedLoginAttempts.entries());
    for (const [key, attempts] of entries) {
      if (key.startsWith(ipAddress) && attempts.blocked) {
        const timeSinceBlock = Date.now() - attempts.lastAttempt;
        if (timeSinceBlock < BLOCK_DURATION) {
          return true;
        } else {
          // Unblock after duration expires
          failedLoginAttempts.delete(key);
        }
      }
    }
    return false;
  }

  /**
   * Update session activity timestamp
   */
  updateSessionActivity(req: Request): void {
    const session = req.session as SessionData;
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Get client IP address considering proxies
   */
  getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Cleanup expired failed login attempts
   */
  private cleanupFailedAttempts(): void {
    const now = Date.now();
    const entries = Array.from(failedLoginAttempts.entries());
    for (const [key, attempts] of entries) {
      if (now - attempts.lastAttempt > BLOCK_DURATION) {
        failedLoginAttempts.delete(key);
      }
    }
  }

  /**
   * Create secure logout handler
   */
  createLogoutHandler() {
    return async (req: Request, res: Response) => {
      const session = req.session as SessionData;
      const ipAddress = this.getClientIP(req);
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      if (session?.userId) {
        // Log logout for audit trail
        await auditLogger.logAuthenticationEvent({
          eventType: 'LOGOUT',
          userId: session.userId,
          success: true,
          ipAddress,
          userAgent,
          details: { reason: 'User initiated logout' }
        });
        
        // Destroy session
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).json({ error: 'Logout failed' });
          }
          
          res.clearCookie('connect.sid');
          res.json({ success: true, message: 'Logged out successfully' });
        });
      } else {
        res.json({ success: true, message: 'No active session' });
      }
    };
  }
}

export const securityManager = SecurityManager.getInstance();

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      accessContext?: AccessContext;
    }
  }
}