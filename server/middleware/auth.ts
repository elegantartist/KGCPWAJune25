import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: string;
    name: string;
  };
}

export const authMiddleware = (roles: string[] = []) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token is required' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, decoded.userId),
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.user = {
        userId: user.id,
        role: user.role,
        name: user.name,
      };

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};
