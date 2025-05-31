// Simple SMS test script to verify Twilio integration
import { Twilio } from 'twilio';

// Use your Twilio credentials
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testSMS() {
  try {
    console.log('Testing SMS with Twilio...');
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...');
    console.log('From Number:', process.env.TWILIO_PHONE_NUMBER);
    
    // Format Australian phone number
    const testPhoneNumber = '0433509441';
    const formattedPhone = '+61' + testPhoneNumber.substring(1);
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('Sending to:', formattedPhone);
    console.log('Verification code:', testCode);
    
    const message = `Your Keep Going Care verification code is: ${testCode}. This code expires in 10 minutes. Do not share this code.`;
    
    const smsResponse = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    console.log('✅ SMS sent successfully!');
    console.log('Message SID:', smsResponse.sid);
    console.log('Status:', smsResponse.status);
    
  } catch (error) {
    console.error('❌ SMS test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('More info:', error.moreInfo);
  }
}

testSMS();