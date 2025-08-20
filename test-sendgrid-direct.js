// Direct SendGrid test to verify actual service status
import sgMail from '@sendgrid/mail';

// Set API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'reuben.collins@keepgoingcare.com',
  from: 'welcome@keepgoingcare.com',
  subject: 'KGC Test Email',
  text: 'This is a test email to verify SendGrid functionality.',
  html: '<p>This is a test email to verify SendGrid functionality.</p>',
};

console.log('Testing SendGrid with API key:', process.env.SENDGRID_API_KEY ? 'Present' : 'Missing');
console.log('Sending test email...');

sgMail
  .send(msg)
  .then(() => {
    console.log('✅ Email sent successfully!');
  })
  .catch((error) => {
    console.error('❌ SendGrid error:', error.message);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
  });