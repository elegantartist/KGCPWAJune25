import { emailService } from './server/services/emailService.js';

async function sendPatientWelcomeEmail() {
  console.log('Sending welcome email to Tom Jones using the same EmailService that works for doctors...');
  
  // Get the correct Replit domain from environment
  const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 
                       `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  const baseUrl = `https://${replitDomain}`;
  const loginUrl = `${baseUrl}/login`;
  
  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header with KGC Logo -->
      <div style="text-align: center; padding: 40px 20px 20px; background: linear-gradient(135deg, #2E8BC0 0%, #1e40af 100%);">
        <div style="background-color: white; padding: 15px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="width: 120px; height: 60px; background-color: #2E8BC0; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
            <span style="color: white; font-weight: bold; font-size: 16px;">KGC</span>
          </div>
        </div>
        <h1 style="color: white; margin: 20px 0 10px; font-size: 28px; font-weight: 600;">Welcome to Keep Going Care!</h1>
        <p style="color: white; margin: 0; font-size: 16px; opacity: 0.9;">Your Partner in a Healthier Lifestyle</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px 30px;">
        <h2 style="color: #2E8BC0; margin: 0 0 20px; font-size: 24px;">Hi Tom Jones,</h2>
        
        <p style="color: #374151; line-height: 1.6; margin: 0 0 20px; font-size: 16px;">
          Welcome to <strong>Keep Going Care (KGC)</strong>, your personal health assistant designed to support you on your wellness journey. We're excited to partner with you in achieving your health goals!
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #2E8BC0; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <h3 style="color: #2E8BC0; margin: 0 0 10px; font-size: 18px;">🎥 Get Started - Watch Your Orientation Video</h3>
          <p style="color: #374151; margin: 0 0 15px; line-height: 1.6;">Learn how to make the most of your KGC experience:</p>
          <a href="https://youtu.be/ET8aoaQjJn0" style="display: inline-block; background-color: #2E8BC0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Watch Orientation Video</a>
        </div>

        <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #059669; margin: 0 0 15px; font-size: 18px;">🔑 Access Your KGC Application</h3>
          <p style="color: #374151; margin: 0 0 15px; line-height: 1.6;">Ready to start your health journey? Access your personalised dashboard:</p>
          <a href="${loginUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Access Your KGC Application</a>
        </div>

        <!-- Important Information -->
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #d97706; margin: 0 0 15px; font-size: 18px;">⚠️ Important Information</h3>
          <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li><strong>Class I SaMD:</strong> KGC is a Type 1 Software as a Medical Device providing educational support. It is not intended for diagnosis or treatment.</li>
            <li><strong>Privacy:</strong> Your health data is managed securely in accordance with Australian privacy laws.</li>
            <li><strong>AI Limitations:</strong> KGC uses AI technology. All information is for educational purposes and should be verified with your healthcare professional.</li>
          </ul>
        </div>

        <p style="color: #374151; line-height: 1.6; margin: 20px 0 0; font-size: 16px;">
          If you have any questions or need assistance, please don't hesitate to reach out to your healthcare provider.
        </p>

        <div style="margin: 30px 0; padding: 20px 0; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px; text-align: center;">
            Sincerely,<br>
            <strong>The Keep Going Care Team</strong><br>
            Anthrocyt AI Pty Ltd
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const result = await emailService.sendEmail({
      to: 'tom.jones.test2025@keepgoingcare.com',
      from: 'welcome@keepgoingcare.com',
      subject: 'Welcome to Keep Going Care! Your Partner in a Healthier Lifestyle',
      html: emailHtml
    });

    if (result.success) {
      console.log('✅ Welcome email sent successfully to Tom Jones!');
      console.log('Patient welcome email is now working using the same system as doctor emails.');
    } else {
      console.log('❌ Failed to send welcome email.');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

sendPatientWelcomeEmail();