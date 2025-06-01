import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export class AuthTokenService {
  static generateToken(userId: number, role: string): string {
    return jwt.sign(
      { userId, role, type: 'auth' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static generateSetupToken(email: string, role: string): string {
    return jwt.sign(
      { email, role, type: 'setup' },
      JWT_SECRET,
      { expiresIn: '48h' }
    );
  }
}