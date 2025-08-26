import { db } from '../db';
import { users, doctorPatients, emergencyAlerts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { emailService } from './emailService';

/**
 * Emergency Detection Service
 * Monitors patient messages for emergency situations and alerts doctors immediately
 */

interface EmergencyDetectionResult {
  isEmergency: boolean;
  emergencyType?: 'self_harm' | 'death_risk' | 'serious_injury' | 'medical_emergency';
  confidence: number;
  alertMessage?: string;
}

export class EmergencyDetectionService {
  // Emergency keywords and phrases that indicate immediate danger
  private emergencyPatterns = [
    // Self-harm indicators
    { pattern: /\b(want to hurt myself|going to hurt myself|hurt myself|end my life|kill myself|suicide|suicidal)\b/i, type: 'self_harm', weight: 0.9 },
    { pattern: /\b(don't want to live|want to die|planning to die|end it all|no point living)\b/i, type: 'self_harm', weight: 0.8 },
    
    // Death risk indicators
    { pattern: /\b(chest pain|can't breathe|difficulty breathing|severe pain|losing consciousness)\b/i, type: 'death_risk', weight: 0.9 },
    { pattern: /\b(heart attack|stroke|choking|overdose|poisoned|bleeding heavily)\b/i, type: 'death_risk', weight: 0.95 },
    
    // Serious injury indicators
    { pattern: /\b(broken bone|severe injury|deep cut|head injury|unconscious|collapsed)\b/i, type: 'serious_injury', weight: 0.8 },
    { pattern: /\b(can't move|paralyzed|severe bleeding|internal bleeding|fell badly)\b/i, type: 'serious_injury', weight: 0.85 },
    
    // Medical emergency indicators
    { pattern: /\b(emergency|urgent help|call ambulance|need ambulance|medical emergency)\b/i, type: 'medical_emergency', weight: 0.9 },
    { pattern: /\b(severe allergic reaction|anaphylaxis|diabetic emergency|seizure)\b/i, type: 'medical_emergency', weight: 0.95 }
  ];

  /**
   * Analyze patient message for emergency indicators
   */
  async detectEmergency(patientMessage: string, patientId: number): Promise<EmergencyDetectionResult> {
    try {
      const message = patientMessage.toLowerCase().trim();
      let maxConfidence = 0;
      let detectedType: any = null;

      // Check against all emergency patterns
      for (const { pattern, type, weight } of this.emergencyPatterns) {
        if (pattern.test(message)) {
          if (weight > maxConfidence) {
            maxConfidence = weight;
            detectedType = type;
          }
        }
      }

      // If emergency detected with high confidence, trigger alerts
      if (maxConfidence >= 0.7) {
        await this.createEmergencyAlert(patientId, detectedType, maxConfidence, patientMessage);
        
        return {
          isEmergency: true,
          emergencyType: detectedType,
          confidence: maxConfidence,
          alertMessage: this.getEmergencyResponseMessage(detectedType)
        };
      }

      return {
        isEmergency: false,
        confidence: maxConfidence
      };

    } catch (error) {
      console.error('Emergency detection error:', error);
      return {
        isEmergency: false,
        confidence: 0
      };
    }
  }

  /**
   * Create emergency alert and notify doctor immediately
   */
  private async createEmergencyAlert(patientId: number, emergencyType: string, confidence: number, originalMessage: string) {
    try {
      // Get patient details
      const [patient] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        uin: users.uin
      })
      .from(users)
      .where(eq(users.id, patientId));

      if (!patient) {
        console.error(`Patient with ID ${patientId} not found for emergency alert`);
        return;
      }

      // Find the patient's doctor
      const [doctorRelation] = await db.select({
        doctorId: doctorPatients.doctorId
      })
      .from(doctorPatients)
      .where(and(
        eq(doctorPatients.patientId, patientId),
        eq(doctorPatients.active, true)
      ));

      if (!doctorRelation) {
        console.error(`No active doctor found for patient ${patientId} in emergency situation`);
        return;
      }

      // Get doctor details
      const [doctor] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber
      })
      .from(users)
      .where(eq(users.id, doctorRelation.doctorId));

      if (!doctor) {
        console.error(`Doctor with ID ${doctorRelation.doctorId} not found for emergency alert`);
        return;
      }

      // Create emergency alert record
      await db.insert(emergencyAlerts).values({
        patientId: patient.id,
        doctorId: doctor.id,
        emergencyType,
        confidence,
        patientMessage: originalMessage,
        alertSent: true,
        resolved: false
      });

      // Prepare alert messages
      const alertSubject = `URGENT: Emergency Detected - Patient ${patient.name} (${patient.uin})`;
      const alertMessage = `EMERGENCY ALERT from Keep Going Care

Patient: ${patient.name} (${patient.uin || 'No UIN'})
Emergency Type: ${this.getEmergencyTypeDescription(emergencyType)}
Confidence: ${Math.round(confidence * 100)}%
Time: ${new Date().toLocaleString('en-AU')}

Patient's message: "${originalMessage}"

IMMEDIATE ACTION REQUIRED:
- Contact patient immediately at their registered phone number
- If you cannot reach them, consider calling emergency services (000)
- This is an automated alert from KGC's emergency detection system

Contact KGC Support: support@keepgoingcare.com.au
Patient Dashboard: ${process.env.BASE_URL || 'https://keepgoingcare.com.au'}/doctor-dashboard`;

      // Send email alert to doctor
      if (doctor.email) {
        try {
          await emailService.sendEmail({
            to: doctor.email,
            from: 'alerts@keepgoingcare.com.au',
            subject: alertSubject,
            text: alertMessage,
            html: this.formatEmergencyEmailHtml(patient, doctor, emergencyType, confidence, originalMessage)
          });
          
          console.log(`EMERGENCY ALERT EMAIL sent to Dr. ${doctor.name} (${doctor.email}) about patient ${patient.name}`);
        } catch (emailError) {
          console.error('Failed to send emergency email alert:', emailError);
        }
      }

      // Log for immediate monitoring
      console.log(`🚨 EMERGENCY DETECTED 🚨`);
      console.log(`Patient: ${patient.name} (${patient.uin})`);
      console.log(`Doctor: ${doctor.name} (${doctor.email})`);
      console.log(`Type: ${emergencyType}`);
      console.log(`Message: "${originalMessage}"`);
      console.log(`Alert sent at: ${new Date().toISOString()}`);

    } catch (error) {
      console.error('Error creating emergency alert:', error);
    }
  }

  /**
   * Get appropriate emergency response message for patient
   */
  private getEmergencyResponseMessage(emergencyType: string): string {
    switch (emergencyType) {
      case 'self_harm':
        return `I'm very concerned about what you've shared. Your safety is the most important thing right now. 

**Please call 000 immediately if you're in immediate danger.**

For crisis support:
• Lifeline: 13 11 14 (24/7)
• Beyond Blue: 1300 22 4636

I've notified your doctor who will contact you shortly. You don't have to go through this alone.`;

      case 'death_risk':
      case 'medical_emergency':
        return `This sounds like a medical emergency that requires immediate attention.

**Please call 000 right now** or have someone call for you.

If you're unable to call:
• Ask someone nearby to call 000
• Go to your nearest emergency department immediately

I've alerted your doctor, but emergency services should be your first priority right now.`;

      case 'serious_injury':
        return `This sounds like a serious injury that needs immediate medical attention.

**Please call 000 immediately** if:
• You have severe pain
• You can't move normally
• There's significant bleeding
• You feel faint or dizzy

Your doctor has been notified and will contact you, but please seek emergency care first if needed.`;

      default:
        return `I'm concerned about your message and have notified your doctor immediately. If this is an emergency, please call 000 right away.`;
    }
  }

  /**
   * Get human-readable emergency type description
   */
  private getEmergencyTypeDescription(emergencyType: string): string {
    switch (emergencyType) {
      case 'self_harm': return 'Self-harm or suicide risk';
      case 'death_risk': return 'Life-threatening medical emergency';
      case 'serious_injury': return 'Serious injury requiring medical attention';
      case 'medical_emergency': return 'Medical emergency';
      default: return 'Emergency situation';
    }
  }

  /**
   * Format emergency alert email as HTML
   */
  private formatEmergencyEmailHtml(patient: any, doctor: any, emergencyType: string, confidence: number, originalMessage: string): string {
    return `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY ALERT</h1>
            <p style="margin: 5px 0 0 0; font-size: 16px;">Keep Going Care Emergency Detection System</p>
          </div>
          
          <div style="background-color: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #dc2626; margin-top: 0;">Immediate Action Required</h2>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #333;">Patient Details:</h3>
              <p><strong>Name:</strong> ${patient.name}</p>
              <p><strong>UIN:</strong> ${patient.uin || 'Not assigned'}</p>
              <p><strong>Email:</strong> ${patient.email}</p>
            </div>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #333;">Emergency Details:</h3>
              <p><strong>Type:</strong> ${this.getEmergencyTypeDescription(emergencyType)}</p>
              <p><strong>Confidence:</strong> ${Math.round(confidence * 100)}%</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString('en-AU')}</p>
            </div>
            
            <div style="background-color: #fef9c3; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0;">
              <h4 style="margin-top: 0; color: #92400e;">Patient's Message:</h4>
              <p style="font-style: italic; color: #92400e;">"${originalMessage}"</p>
            </div>
            
            <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 15px 0;">
              <h4 style="margin-top: 0; color: #166534;">Immediate Actions:</h4>
              <ul style="color: #166534; margin: 0;">
                <li>Contact patient immediately at their registered phone number</li>
                <li>If unable to reach patient, consider calling emergency services (000)</li>
                <li>Document your response in the patient's care plan</li>
                <li>Follow up to ensure patient safety</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p>This is an automated alert from Keep Going Care Emergency Detection System</p>
            <p>Anthrocyt AI Pty Ltd | Support: support@keepgoingcare.com.au</p>
            <p><strong>Time sent:</strong> ${new Date().toLocaleString('en-AU')}</p>
          </div>
        </body>
      </html>
    `;
  }
}

export const emergencyDetectionService = new EmergencyDetectionService();