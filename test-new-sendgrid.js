const sgMail = require('@sendgrid/mail');

// Test script for new SendGrid setup
console.log('🧪 Testing SendGrid Configuration for KGC');
console.log('==========================================');

if (!process.env.SENDGRID_API_KEY) {
  console.log('❌ No SENDGRID_API_KEY found in environment');
  console.log('📝 Steps to fix:');
  console.log('   1. Go to SendGrid Dashboard → Settings → API Keys');
  console.log('   2. Create new API key with "Mail Send" permissions');
  console.log('   3. Add it to Replit Secrets as SENDGRID_API_KEY');
  process.exit(1);
}

console.log(`✅ API Key found: ${process.env.SENDGRID_API_KEY.substring(0, 8)}...`);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Test email similar to KGC authentication
const testMsg = {
  to: 'admin@keepgoingcare.com', // Change this to your email for testing
  from: 'welcome@keepgoingcare.com',
  subject: 'KGC Authentication Test - Your Access PIN',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Keep Going Care - Authentication</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2E8BC0; margin: 0;">Keep Going Care</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Personal Health Assistant</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <h2 style="color: #333; margin-bottom: 10px;">Your Access PIN</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #2E8BC0; letter-spacing: 3px;">123456</span>
            </div>
            <p style="color: #666; margin: 10px 0;">This PIN expires in 15 minutes</p>
          </div>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">How to Access Your Dashboard:</h3>
            <ol style="color: #666; line-height: 1.8;">
              <li>Enter your email address on the login page</li>
              <li>Check this email for your 6-digit PIN</li>
              <li>Enter the PIN to access your dashboard</li>
              <li>Your session will remain active for 24 hours</li>
            </ol>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center;">
            <p><strong>Keep Going Care</strong> - Class I Software as Medical Device (SaMD)</p>
            <p>Anthrocyt AI Pty Ltd | Australia</p>
            <p style="font-size: 12px; margin-top: 15px;">This email was sent from an automated system. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `
};

console.log('\n📧 Sending test email...');
console.log(`   To: ${testMsg.to}`);
console.log(`   From: ${testMsg.from}`);
console.log(`   Subject: ${testMsg.subject}`);

sgMail.send(testMsg)
  .then(() => {
    console.log('\n✅ SUCCESS! SendGrid test email sent successfully');
    console.log('📱 Check your inbox for the test authentication email');
    console.log('\n🎉 Your SendGrid setup is working correctly!');
    console.log('💡 You can now update your SENDGRID_API_KEY in Replit Secrets');
  })
  .catch((error) => {
    console.log('\n❌ FAILED! SendGrid error:');
    console.log(`   Status: ${error.code || 'Unknown'}`);
    console.log(`   Message: ${error.message || 'No message'}`);
    
    if (error.response && error.response.body) {
      console.log('   Details:', JSON.stringify(error.response.body, null, 2));
    }
    
    console.log('\n🔧 Common fixes:');
    console.log('   1. Verify your API key has "Mail Send" permissions');
    console.log('   2. Authenticate your domain or single sender email');
    console.log('   3. Check if your SendGrid account is active');
    console.log('   4. Ensure welcome@keepgoingcare.com is verified');
  });