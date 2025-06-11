// 5-minute auto-logout middleware for enhanced security
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

interface SessionData {
    userId: number;
    lastActivity: number;
    role: string;
}

// Store active sessions in memory (use Redis in production)
const activeSessions = new Map<string, SessionData>();

export class SessionTimeoutMiddleware {
    private static readonly TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
    private static readonly CLEANUP_INTERVAL = 60 * 1000; // Clean up expired sessions every minute
    
    static {
        // Start cleanup interval
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.CLEANUP_INTERVAL);
    }
    
    /**
     * Create session timeout middleware
     */
    static create() {
        return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
            // Skip timeout check for login and public routes
            if (req.path.includes('/auth/') || req.path.includes('/login')) {
                return next();
            }
            
            // Check if user is authenticated
            if (!req.user) {
                return next();
            }
            
            const sessionId = this.getSessionId(req);
            const session = activeSessions.get(sessionId);
            const now = Date.now();
            
            if (session) {
                // Check if session has expired
                if (now - session.lastActivity > this.TIMEOUT_DURATION) {
                    activeSessions.delete(sessionId);
                    console.log(`Session expired for user ${req.user.userId} (${req.user.role})`);
                    return res.status(401).json({ 
                        message: 'Session expired due to inactivity. Please login again.',
                        code: 'SESSION_EXPIRED'
                    });
                }
                
                // Update last activity time
                session.lastActivity = now;
            } else {
                // Create new session
                activeSessions.set(sessionId, {
                    userId: req.user.userId,
                    lastActivity: now,
                    role: req.user.role
                });
            }
            
            next();
        };
    }
    
    /**
     * Get session ID from request
     */
    private static getSessionId(req: AuthenticatedRequest): string {
        return `${req.user!.userId}-${req.user!.role}`;
    }
    
    /**
     * Clean up expired sessions
     */
    private static cleanupExpiredSessions(): void {
        const now = Date.now();
        const expiredSessions: string[] = [];
        
        activeSessions.forEach((session, sessionId) => {
            if (now - session.lastActivity > this.TIMEOUT_DURATION) {
                expiredSessions.push(sessionId);
            }
        });
        
        expiredSessions.forEach(sessionId => {
            activeSessions.delete(sessionId);
        });
        
        if (expiredSessions.length > 0) {
            console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }
    
    /**
     * Force logout user
     */
    static forceLogout(userId: number, role: string): void {
        const sessionId = `${userId}-${role}`;
        activeSessions.delete(sessionId);
    }
    
    /**
     * Get active sessions count
     */
    static getActiveSessionsCount(): number {
        return activeSessions.size;
    }
    
    /**
     * Get session info for user
     */
    static getSessionInfo(userId: number, role: string): SessionData | null {
        const sessionId = `${userId}-${role}`;
        return activeSessions.get(sessionId) || null;
    }
}

export const sessionTimeoutMiddleware = SessionTimeoutMiddleware.create();