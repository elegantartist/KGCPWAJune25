import sgMail from '@sendgrid/mail';
import { EmailTemplateService } from './emailTemplateService';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export interface WelcomeEmailData {
    email: string;
    name: string;
    role: 'doctor' | 'patient';
    uin: string;
    dashboardUrl?: string;
}

export class EmailService {
    private static instance: EmailService;
    
    static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    // Generic sendEmail method for direct use (e.g., by EmergencyDetectionService)
    async sendEmail(options: { to: string; from?: string; subject: string; text?: string; html?: string }): Promise<boolean> {
        try {
            const msg = {
                to: options.to,
                from: options.from || 'noreply@keepgoingcare.com', // Default sender
                subject: options.subject,
                text: options.text,
                html: options.html,
            };

            await sgMail.send(msg);
            console.log(`Email sent successfully to ${options.to}`);
            return true;
        } catch (error) {
            console.error('Generic email sending error:', error);
            return false;
        }
    }
    
    async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
        try {
            const { email, name, role, uin, dashboardUrl } = data;
            
            const template = role === 'doctor' 
                ? EmailTemplateService.getDoctorWelcomeTemplate(name)
                : EmailTemplateService.getPatientWelcomeTemplate(name);
            
            let content = template.content;
            content = content.replace('[DOCTOR_DASHBOARD_LINK]', dashboardUrl || 'https://keepgoingcare.com/doctor-dashboard');
            content = content.replace('[PATIENT_APP_LINK]', dashboardUrl || 'https://keepgoingcare.com/patient-dashboard');
            
            const htmlContent = this.convertToHTML(content, uin, template.requiresAgreement, template.videoLinks);
            
            const msg = {
                to: email,
                from: 'noreply@keepgoingcare.com',
                subject: template.subject,
                html: htmlContent
            };
            
            await sgMail.send(msg);
            console.log(`Welcome email sent to ${email} (${role}) with UIN: ${uin}`);
            return true;
        } catch (error) {
            console.error('Email sending error:', error);
            return false;
        }
    }
    
    private convertToHTML(content: string, uin: string, requiresAgreement: boolean, videoLinks?: string[]): string {
        const videoSection = videoLinks ? 
            videoLinks.map(link => `<p><a href="${link}" style="color: #2E8BC0;">Watch Video</a></p>`).join('') : '';
        
        const agreementSection = requiresAgreement ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0;">
                <h3>Agreement Required</h3>
                <p>${EmailTemplateService.getAgreementContent()}</p>
                <p><strong>I agree to these terms</strong> (confirmed by account activation)</p>
            </div>` : '';
        
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #2E8BC0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .uin-box { background: #e7f3ff; border: 2px solid #2E8BC0; padding: 15px; margin: 20px 0; text-align: center; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        pre { white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Keep Going Care</h1>
        <p>Software as a Medical Device (SaMD)</p>
    </div>
    
    <div class="content">
        <div class="uin-box">
            <h3>Your Unique Identification Number (UIN)</h3>
            <h2 style="color: #2E8BC0; margin: 0;">${uin}</h2>
            <p><em>Keep this UIN secure for all support communications</em></p>
        </div>
        
        <pre>${content}</pre>
        
        ${videoSection}
        ${agreementSection}
        
        <p><strong>Security Note:</strong> Your session will automatically logout after 5 minutes of inactivity for enhanced security.</p>
    </div>
    
    <div class="footer">
        <p>Keep Going Care - Anthrocyt AI Pty Ltd</p>
        <p>This email contains confidential medical device information.</p>
    </div>
</body>
</html>`;
    }
}

export const emailService = EmailService.getInstance();