import { MailService } from '@sendgrid/mail';

const mailService = new MailService();

const initializeEmailService = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (apiKey) {
    mailService.setApiKey(apiKey);
  }
};

// Initialize on module load
initializeEmailService();

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private defaultFromEmail = 'welcome@keepgoingcare.com';

  async sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      await mailService.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      
      console.log(`Email sent successfully to ${params.to}`);
      return { success: true };
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      return { 
        success: false, 
        error: error.response?.body?.errors?.[0]?.message || error.message || 'Unknown email error'
      };
    }
  }

  private convertToHtml(content: string): string {
    // Convert plain text to HTML with proper formatting and KGC branding
    const html = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: #2E8BC0; text-decoration: none;">$1</a>');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Keep Going Care</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://keepgoingcare.com.au/logo.png" alt="Keep Going Care" style="max-width: 200px; height: auto;">
            </div>
            <div style="color: #333; font-size: 16px;">
              ${html}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center;">
              <p>Keep Going Care - Class I Software as Medical Device (SaMD)</p>
              <p>Anthrocyt AI Pty Ltd | Australia</p>
              <p style="font-size: 12px;">This email was sent from an automated system. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();