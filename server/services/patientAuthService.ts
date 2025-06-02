/**
 * Patient Authentication Service
 * Handles SMS-based authentication for patients
 */

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class PatientAuthService {
  /**
   * Send welcome email with SMS login link
   */
  static async sendWelcomeEmail(patientEmail: string, patientName: string): Promise<{ success: boolean, message: string }> {
    try {
      const { emailService } = await import('./emailService');
      
      // Get the correct Replit domain from environment or construct it
      const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 
                           `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const baseUrl = `https://${replitDomain}`;
      const loginUrl = `${baseUrl}/patient-login`;
      
      const emailSubject = 'Welcome to Keep Going Care! Your Partner in a Healthier Lifestyle';
      const emailHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="text-align: center; padding: 40px 20px 20px; background: linear-gradient(135deg, #2E8BC0 0%, #1e40af 100%);">
      <div style="background-color: white; padding: 15px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <img src="${baseUrl}/shared/logo" alt="KGC Logo" style="max-width: 120px; height: 60px; margin: 0 auto 10px;">
      </div>
      <h1 style="color: white; margin: 20px 0 10px; font-size: 28px; font-weight: 600;">Welcome to Keep Going Care!</h1>
      <p style="color: white; margin: 0; font-size: 16px; opacity: 0.9;">Your Partner in a Healthier Lifestyle</p>
    </div>

    <div style="padding: 40px 30px;">
      <h2 style="color: #2E8BC0; margin: 0 0 20px; font-size: 24px;">Hi ${patientName},</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 20px; font-size: 16px;">
        Welcome to <strong>Keep Going Care (KGC)</strong>! Your doctor has recommended KGC as a supportive tool to help you manage your metabolic health and work towards a healthier lifestyle. We're here to help you reduce your risk of heart attack and stroke identified by your doctor, by making positive changes you can stick with based on your doctor's care plan designed for you.
      </p>
      <h3 style="color: #1f2937; margin: 25px 0 15px 0; font-size: 18px; font-weight: 600;">What KGC Is:</h3>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Think of KGC as your friendly, personalised health assistant, available right on your device. It's a system designed to support you with educational advice and motivation for diet, exercise, and taking your medication as prescribed by your doctor.
      </p>
      <h3 style="color: #1f2937; margin: 25px 0 15px 0; font-size: 18px; font-weight: 600;">How KGC Works for You:</h3>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
        KGC uses the plan your doctor has set for you (called Care Plan Directives, or CPDs), along with trusted Australian health information and your own preferences, to give you advice and ideas using supportive techniques.
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
        You'll interact with our main assistant, who can help you with:
      </p>
      <ul style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; padding-left: 20px;">
        <li style="margin-bottom: 10px;"><strong>Personalised Support:</strong> Get tips and ideas tailored to your doctor's plan for your diet, exercise, and medication routine.</li>
        <li style="margin-bottom: 10px;"><strong>Motivation When You Need It:</strong> Use the special "Keep Going" button. If you're feeling stressed, tempted, or losing motivation, tapping this button will bring up your personal motivational image, a calming video, and a breathing exercise to help you refocus.</li>
        <li style="margin-bottom: 10px;"><strong>Inspiration:</strong> Find ideas for healthy recipes or new exercise routines that fit your preferences and fitness level (safely!).</li>
        <li style="margin-bottom: 10px;"><strong>Connecting Locally:</strong> Discover local gyms, yoga studios, or personal trainers if that's something you're interested in exploring.</li>
        <li style="margin-bottom: 10px;"><strong>Daily Check-in:</strong> We'll ask you each day to quickly rate how you feel you're going with your diet, exercise/wellness routine, and medication (on a scale of 1 to 10). This helps KGC understand how to best support you and keeps your doctor informed of your progress with their care plan (CPDs).</li>
      </ul>

      <div style="text-align: center; margin: 25px 0;">
        <a href="https://youtu.be/ET8aoaQjJn0" style="background-color: #2E8BC0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          📹 Watch How KGC Can Help You
        </a>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Terms and Conditions Agreement Required</h4>
        <p style="color: #92400e; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;">
          <strong>Terms and Conditions Summary:</strong><br>
          By using Keep Going Care, you agree to our Terms and Conditions. Please note the following key points:
        </p>
        <ul style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;"><strong>Your Health Data:</strong> We take your privacy seriously. Your private health data is managed securely in accordance with all relevant Australian state and federal privacy laws.</li>
          <li style="margin-bottom: 8px;"><strong>Educational Support Only:</strong> Keep Going Care is designed to provide you with educational information and support for managing your lifestyle. It is not a tool for diagnosing health problems or providing medical treatment. Always consult with your doctor or other healthcare professionals for any health concerns or before making decisions about your treatment.</li>
          <li style="margin-bottom: 8px;"><strong>About the Information Provided:</strong> KGC uses advanced technology, including AI. While we strive for accuracy, sometimes the information generated by AI can be incorrect. The information provided by Keep Going Care is for your guidance and motivation only. It should not replace advice from your doctor, and you should always check with a healthcare professional if you are unsure about anything related to your health or care plan.</li>
          <li style="margin-bottom: 8px;"><strong>Not for Emergencies:</strong> Keep Going Care cannot help in a medical emergency. If you are experiencing a medical emergency (like chest pain, severe difficulty breathing, or thoughts of harming yourself), please call Triple Zero (000) immediately or go to your nearest hospital emergency department.</li>
        </ul>
        <p style="color: #92400e; margin: 15px 0 0 0; font-size: 14px; font-weight: 600;">
          By using Keep Going Care, you confirm that you have read and agree to these terms.
        </p>
      </div>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 20px 0;">
        We're genuinely here to support you every step of the way. Let's Keep Going together!
      </p>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${loginUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
          🔐 Access Your KGC Application
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 15px 0 25px 0;">
        Secure login with SMS verification for your privacy and security.
      </p>

      <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0;">
        Best regards,<br>
        <strong>The Keep Going Care Team</strong><br>
        Anthrocyt AI Pty Ltd
      </p>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2025 Keep Going Care. All rights reserved.<br>
        This is a secure, TGA-compliant healthcare communication.
      </p>
    </div>
  </div>
`;

      const result = await emailService.sendEmail({
        to: patientEmail,
        from: 'welcome@keepgoingcare.com',
        subject: emailSubject,
        html: emailHtml
      });

      if (result.success) {
        return {
          success: true,
          message: 'Welcome email sent successfully'
        };
      } else {
        return {
          success: false,
          message: result.error || 'Failed to send welcome email'
        };
      }
    } catch (error) {
      console.error('Error sending patient welcome email:', error);
      return {
        success: false,
        message: 'Failed to send welcome email'
      };
    }
  }
}