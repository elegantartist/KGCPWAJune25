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
      const session = req.session as SessionData;
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

      if (!session?.userRole || !session?.userId) {
        await auditLogger.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'MEDIUM',
          ipAddress,
          userAgent,
          details: { reason: 'No valid session' }
        });
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Update session activity
      this.updateSessionActivity(req);

      // Admin can access any resource for testing/compliance
      if (session.userRole === 'admin') {
        const targetUserId = req.params.userId ? parseInt(req.params.userId) : session.userId;
        req.accessContext = {
          userId: targetUserId,
          role: session.userRole,
          isAdminAccess: !!req.params.userId && req.params.userId !== session.userId.toString(),
          ipAddress,
          userAgent
        };

        // Log admin access for compliance
        if (req.accessContext.isAdminAccess) {
          await auditLogger.logSecurityEvent({
            eventType: 'ADMIN_ACCESS',
            severity: 'MEDIUM',
            userId: session.userId,
            targetUserId: targetUserId,
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
      if (!allowedRoles.includes(session.userRole)) {
        await auditLogger.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          userId: session.userId,
          ipAddress,
          userAgent,
          details: {
            requiredRoles: allowedRoles,
            userRole: session.userRole,
            endpoint: req.path
          }
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Users can only access their own data
      req.accessContext = {
        userId: session.userId,
        role: session.userRole,
        isAdminAccess: false,
        ipAddress,
        userAgent
      };

      next();
    };
  }

  /**
   * Session timeout middleware with role-based timeout periods
   */
  createSessionTimeoutMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const session = req.session as SessionData;
      
      if (session?.lastActivity) {
        const now = Date.now();
        const inactivityTime = now - session.lastActivity;
        
        // Different timeout periods by role
        const timeoutLimits = {
          patient: 30 * 60 * 1000,    // 30 minutes
          doctor: 60 * 60 * 1000,     // 1 hour
          admin: 120 * 60 * 1000      // 2 hours
        };
        
        const timeoutLimit = timeoutLimits[session.userRole as keyof typeof timeoutLimits] || timeoutLimits.patient;
        
        if (inactivityTime > timeoutLimit) {
          const userId = session.userId;
          req.session.destroy(() => {});
          
          // Log session timeout
          auditLogger.logAuthenticationEvent({
            eventType: 'LOGOUT',
            userId,
            success: true,
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent') || 'Unknown',
            details: { reason: 'Session timeout due to inactivity' }
          });
          
          return res.status(401).json({ 
            error: 'Session expired due to inactivity',
            requiresReauth: true 
          });
        }
        
        session.lastActivity = now;
      }
      
      next();
    };
  }

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