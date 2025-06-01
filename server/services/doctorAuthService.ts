import jwt from 'jsonwebtoken';
import { emailService } from './emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const TOKEN_EXPIRY = '24h';

export class DoctorAuthService {
  static generateAccessToken(doctorId: number, email: string, phoneNumber: string): string {
    return jwt.sign(
      { 
        doctorId, 
        email, 
        phoneNumber,
        type: 'doctor_setup'
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
  }

  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static async sendWelcomeEmail(email: string, doctorName: string, setupToken: string): Promise<{ success: boolean; message?: string }> {
    const subject = 'Welcome to Keep Going Care - Complete Your Setup';
    
    const content = `Dear Dr. ${doctorName},

Welcome to Keep Going Care (KGC), your new digital healthcare platform.

To complete your setup, please use the following access token:
${setupToken}

This token will expire in 24 hours for security purposes.

Once you're set up, you'll be able to:
- Add and manage your patients
- Monitor patient progress
- Access comprehensive health tracking tools
- Utilise our AI-powered health insights

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Keep Going Care Team`;

    return await emailService.sendEmail({
      to: email,
      from: 'welcome@keepgoingcare.com',
      subject,
      text: content,
      html: emailService['convertToHtml'](content) as string
    });
  }
}