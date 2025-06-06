import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const SECRET_KEY = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_HOURS = 24;

export interface TokenPayload {
  userId: number;
  role: 'admin' | 'doctor' | 'patient';
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function createAccessToken(data: { userId: number; role: string }): string {
  const payload = {
    userId: data.userId,
    role: data.role,
    exp: Math.floor(Date.now() / 1000) + (ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60)
  };
  
  return jwt.sign(payload, SECRET_KEY, { algorithm: ALGORITHM });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: [ALGORITHM] }) as TokenPayload;
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export function authMiddleware(requiredRoles?: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token required' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Check role authorization if specified
    if (requiredRoles && !requiredRoles.includes(payload.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    req.user = payload;
    next();
  };
}

export function getCurrentUser(req: AuthenticatedRequest): TokenPayload | null {
  return req.user || null;
}