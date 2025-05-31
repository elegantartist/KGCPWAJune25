import twilio from 'twilio';

let twilioClient: any = null;
let twilioError: string | null = null;

// Initialize Twilio client with proper error handling
try {
  // Use provided credentials or fallback to environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC98235870e0ec6b51ecaa97f94f95fb7e';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '24bc79bd8fe6429222b17b6af9f52cdb';
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER || '+19402363750';

  if (!accountSid || !authToken || !phoneNumber) {
    twilioError = "Twilio credentials not configured";
    console.warn("Twilio SMS service not configured - SMS features will be disabled");
  } else {
    // Validate Account SID format
    if (!accountSid.startsWith('AC')) {
      twilioError = "Invalid Twilio Account SID format - must start with 'AC'";
      console.error("Twilio Account SID appears to be an API Key instead of Account SID");
    } else {
      twilioClient = twilio(accountSid, authToken);
      
      // Update environment for consistency
      process.env.TWILIO_ACCOUNT_SID = accountSid;
      process.env.TWILIO_AUTH_TOKEN = authToken;
      process.env.TWILIO_PHONE_NUMBER = phoneNumber;
      
      console.log("Twilio SMS service initialized successfully with Account SID:", accountSid.substring(0, 10) + '...');
    }
  }
} catch (error: any) {
  twilioError = `Twilio initialization failed: ${error.message}`;
  console.error("Twilio SMS service initialization error:", error.message);
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  /**
   * Send verification code via SMS
   */
  static async sendVerificationCode(
    phoneNumber: string,
    verificationCode: string,
    userName?: string,
    isDoctor: boolean = false
  ): Promise<SMSResult> {
    // Check if Twilio is properly configured
    if (twilioError || !twilioClient) {
      console.warn(`SMS sending disabled: ${twilioError || 'Twilio not configured'}`);
      return {
        success: false,
        error: `SMS service unavailable: ${twilioError || 'Twilio not configured'}`
      };
    }

    try {
      // Format phone number for international use
      const formattedPhone = phoneNumber.startsWith('0') 
        ? '+61' + phoneNumber.substring(1) 
        : phoneNumber.startsWith('+') 
          ? phoneNumber 
          : '+61' + phoneNumber;

      const message = userName
        ? `Hello ${isDoctor ? 'Dr. ' : ''}${userName}, your Keep Going Care verification code is: ${verificationCode}. This code expires in 10 minutes. Do not share this code.`
        : `Your Keep Going Care verification code is: ${verificationCode}. This code expires in 10 minutes. Do not share this code.`;

      console.log(`Sending SMS to ${formattedPhone} from ${process.env.TWILIO_PHONE_NUMBER}`);

      const smsResponse = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`SMS verification code sent to ${phoneNumber}, Message ID: ${smsResponse.sid}`);
      
      return {
        success: true,
        messageId: smsResponse.sid
      };

    } catch (error: any) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  /**
   * Send admin notification SMS
   */
  static async sendAdminNotification(
    message: string
  ): Promise<SMSResult> {
    try {
      const adminPhoneNumber = '0433509441'; // Admin emergency contact
      
      const smsResponse = await twilioClient.messages.create({
        body: `KGC Admin Alert: ${message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: adminPhoneNumber
      });

      console.log(`Admin notification SMS sent, Message ID: ${smsResponse.sid}`);
      
      return {
        success: true,
        messageId: smsResponse.sid
      };

    } catch (error: any) {
      console.error('Admin SMS notification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send admin notification'
      };
    }
  }

  /**
   * Send welcome SMS to new doctor
   */
  static async sendWelcomeSMS(
    phoneNumber: string,
    doctorName: string,
    welcomeLink: string
  ): Promise<SMSResult> {
    try {
      const message = `Welcome to Keep Going Care, Dr. ${doctorName}! Your secure access link has been sent to your email. For support, contact admin@anthrocytai.com or 0433509441.`;

      const smsResponse = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`Welcome SMS sent to Dr. ${doctorName} at ${phoneNumber}, Message ID: ${smsResponse.sid}`);
      
      return {
        success: true,
        messageId: smsResponse.sid
      };

    } catch (error: any) {
      console.error('Welcome SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send welcome SMS'
      };
    }
  }

  /**
   * Send emergency alert SMS
   */
  static async sendEmergencyAlert(
    phoneNumber: string,
    patientName: string,
    alertType: string,
    message: string
  ): Promise<SMSResult> {
    try {
      const emergencyMessage = `URGENT KGC ALERT - ${alertType}: Patient ${patientName} requires immediate attention. ${message}. Contact admin@anthrocytai.com or 0433509441.`;

      const smsResponse = await twilioClient.messages.create({
        body: emergencyMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`Emergency SMS sent for patient ${patientName}, Message ID: ${smsResponse.sid}`);
      
      return {
        success: true,
        messageId: smsResponse.sid
      };

    } catch (error: any) {
      console.error('Emergency SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send emergency SMS'
      };
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): { valid: boolean; formatted?: string; error?: string } {
    try {
      // Remove any non-digit characters except +
      const cleaned = phoneNumber.replace(/[^\d+]/g, '');
      
      // Check for Australian mobile format
      if (cleaned.match(/^(\+61|61|0)[4-5]\d{8}$/)) {
        // Format to international format
        let formatted = cleaned;
        if (formatted.startsWith('0')) {
          formatted = '+61' + formatted.substring(1);
        } else if (formatted.startsWith('61')) {
          formatted = '+' + formatted;
        }
        
        return { valid: true, formatted };
      }
      
      // Check for international format
      if (cleaned.match(/^\+[1-9]\d{1,14}$/)) {
        return { valid: true, formatted: cleaned };
      }
      
      return { 
        valid: false, 
        error: 'Please enter a valid phone number in international format (e.g., +61400000000)' 
      };
      
    } catch (error) {
      return { 
        valid: false, 
        error: 'Invalid phone number format' 
      };
    }
  }
}

export default SMSService;