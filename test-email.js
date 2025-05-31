/**
 * Quick test to verify SendGrid email functionality
 */

import { emailService } from './server/services/emailService.js';

async function testEmail() {
  console.log('Testing SendGrid email functionality...');
  
  try {
    const result = await emailService.sendEmail({
      to: 'tom.jones@keepgoingcare.com', // Use the test patient email
      from: 'welcome@keepgoingcare.com',
      subject: 'KGC Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Test Successful!</h2>
          <p>This confirms that SendGrid is working properly for Keep Going Care.</p>
          <p>The welcome email system should now be functioning correctly.</p>
        </div>
      `
    });
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('SendGrid integration is working properly.');
    } else {
      console.log('❌ Email failed to send.');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ Email test failed with error:', error.message);
  }
}

testEmail();