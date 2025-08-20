import sgMail from '@sendgrid/mail';
import { randomInt } from 'crypto';

// Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface PINSession {
  pin: string;
  email: string;
  dashboardType: 'admin' | 'doctor' | 'patient';
  userId?: number;
  expiresAt: Date;
  attempts: number;
}

class EmailAuthService {
  private pinSessions = new Map<string, PINSession>();
  private readonly PIN_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 3;
  private readonly FROM_EMAIL = 'welcome@keepgoingcare.com';

  constructor() {
    // Clean up expired PINs every 5 minutes
    setInterval(() => {
      this.cleanupExpiredPins();
    }, 5 * 60 * 1000);
  }

  /**
   * Generate a 6-digit PIN
   */
  private generatePIN(): string {
    // Only use predictable PIN in local development mode
    if (process.env.NODE_ENV === 'development' && !process.env.REPLIT_DB_URL) {
      return '123456';
    }
    // Always use random PIN in Replit and production for security
    return randomInt(100000, 999999).toString();
  }

  /**
   * Generate session ID for PIN tracking
   */
  private generateSessionId(): string {
    return `pin_${Date.now()}_${randomInt(1000, 9999)}`;
  }

  /**
   * Send PIN via email for dashboard access
   */
  async sendDashboardPIN(
    email: string, 
    dashboardType: 'admin' | 'doctor' | 'patient',
    userId?: number
  ): Promise<{ sessionId: string; success: boolean; error?: string }> {
    try {
      const pin = this.generatePIN();
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + this.PIN_EXPIRY_MINUTES * 60 * 1000);

      // Store PIN session
      this.pinSessions.set(sessionId, {
        pin,
        email,
        dashboardType,
        userId,
        expiresAt,
        attempts: 0
      });

      // Prepare email content based on dashboard type
      const dashboardName = this.getDashboardDisplayName(dashboardType);
      const userGreeting = this.getUserGreeting(email, dashboardType);

      const emailContent = {
        to: email,
        from: this.FROM_EMAIL,
        subject: `KGC ${dashboardName} Access - Your 6-Digit PIN`,
        html: this.generateEmailHTML(pin, dashboardName, userGreeting),
        text: this.generateEmailText(pin, dashboardName, userGreeting)
      };

      await sgMail.send(emailContent);

      console.log(`📧 PIN email sent to ${email} for ${dashboardType} dashboard`);
      
      return { sessionId, success: true };
    } catch (error: any) {
      console.error('SendGrid email error (detailed):', error);
      console.error('Error response body:', error.response?.body);
      console.error('Error message:', error.message);
      return { 
        sessionId: '', 
        success: false, 
        error: `Failed to send authentication email: ${error.message || 'Unknown error'}` 
      };
    }
  }

  /**
   * Verify PIN and grant dashboard access
   */
  async verifyPIN(sessionId: string, pin: string): Promise<{
    success: boolean;
    dashboardType?: 'admin' | 'doctor' | 'patient';
    userId?: number;
    email?: string;
    error?: string;
  }> {
    const session = this.pinSessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      this.pinSessions.delete(sessionId);
      return { success: false, error: 'PIN has expired. Please request a new one.' };
    }

    // Check max attempts
    if (session.attempts >= this.MAX_ATTEMPTS) {
      this.pinSessions.delete(sessionId);
      return { success: false, error: 'Too many attempts. Please request a new PIN.' };
    }

    // Verify PIN
    if (session.pin !== pin.trim()) {
      session.attempts++;
      return { 
        success: false, 
        error: `Invalid PIN. ${this.MAX_ATTEMPTS - session.attempts} attempts remaining.` 
      };
    }

    // PIN verified successfully
    const result = {
      success: true,
      dashboardType: session.dashboardType,
      userId: session.userId,
      email: session.email
    };

    // Clean up session after successful verification
    this.pinSessions.delete(sessionId);

    console.log(`✅ PIN verified for ${session.email} - ${session.dashboardType} dashboard access granted`);
    
    return result;
  }

  /**
   * Get dashboard display name for emails
   */
  private getDashboardDisplayName(dashboardType: string): string {
    switch (dashboardType) {
      case 'admin': return 'Administrator Dashboard';
      case 'doctor': return 'Doctor Dashboard';
      case 'patient': return 'Patient Dashboard';
      default: return 'Dashboard';
    }
  }

  /**
   * Get personalized user greeting
   */
  private getUserGreeting(email: string, dashboardType: string): string {
    switch (email) {
      case 'admin@keepgoingcare.com':
        return 'Hello Administrator';
      case 'marijke.collins@keepgoingcare.com':
        return 'Hello Dr. Marijke Collins';
      case 'reuben.collins@keepgoingcare.com':
        return 'Hello Reuben Collins';
      default:
        return `Hello ${dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)}`;
    }
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(pin: string, dashboardName: string, userGreeting: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KGC Dashboard Access</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2E8BC0 0%, #1E5F8C 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Keep Going Care</h1>
        <p style="color: #E8F4F8; margin: 10px 0 0 0; font-size: 16px;">Healthcare Platform Access</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
        <h2 style="color: #2E8BC0; margin-top: 0;">${userGreeting}</h2>
        
        <p>You have requested access to the <strong>${dashboardName}</strong>.</p>
        
        <div style="background: #f8f9fa; border: 2px solid #2E8BC0; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
          <h3 style="color: #2E8BC0; margin-top: 0;">Your 6-Digit Access PIN</h3>
          <div style="font-size: 36px; font-weight: bold; color: #1E5F8C; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${pin}
          </div>
          <p style="color: #666; font-size: 14px; margin-bottom: 0;">Enter this PIN to access your dashboard</p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Security Notice:</strong></p>
          <ul style="margin: 10px 0 0 0; color: #856404;">
            <li>This PIN expires in 15 minutes</li>
            <li>Maximum 3 attempts allowed</li>
            <li>Do not share this PIN with anyone</li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If you did not request this access, please ignore this email or contact support immediately.
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>© 2025 Keep Going Care. All rights reserved.</p>
        <p>This is an automated security email from welcome@keepgoingcare.com</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate plain text email content
   */
  private generateEmailText(pin: string, dashboardName: string, userGreeting: string): string {
    return `
${userGreeting}

You have requested access to the ${dashboardName}.

Your 6-Digit Access PIN: ${pin}

SECURITY NOTICE:
- This PIN expires in 15 minutes
- Maximum 3 attempts allowed  
- Do not share this PIN with anyone

If you did not request this access, please ignore this email or contact support immediately.

© 2025 Keep Going Care. All rights reserved.
This is an automated security email from welcome@keepgoingcare.com
    `.trim();
  }

  /**
   * Clean up expired PIN sessions
   */
  private cleanupExpiredPins(): void {
    const now = new Date();
    let cleanedCount = 0;

    // Convert to array first to avoid iterator issues
    const entries = Array.from(this.pinSessions.entries());
    
    for (const [sessionId, session] of entries) {
      if (now > session.expiresAt) {
        this.pinSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired PIN sessions`);
    }
  }

  /**
   * Get current active sessions count (for monitoring)
   */
  getActiveSessionsCount(): number {
    return this.pinSessions.size;
  }

  /**
   * Force expire a session (for admin use)
   */
  expireSession(sessionId: string): boolean {
    return this.pinSessions.delete(sessionId);
  }
}

// Export singleton instance
export const emailAuthService = new EmailAuthService();