/**
 * Email and SMS Template Service for KGC
 * 
 * Handles secure email and SMS templates for doctor and patient onboarding
 * with agreement checkboxes and proper content formatting
 */

export interface EmailTemplate {
  subject: string;
  content: string;
  requiresAgreement: boolean;
  videoLinks?: string[];
}

export interface SMSTemplate {
  content: string;
  timing?: string;
}

export class EmailTemplateService {
  
  /**
   * Doctor Welcome Email Template
   */
  static getDoctorWelcomeTemplate(doctorName: string): EmailTemplate {
    return {
      subject: "Welcome to Keep Going Care - Enhance Patient Outcomes and Earn CPD",
      requiresAgreement: true,
      videoLinks: [
        "https://youtu.be/RVquUxB50zM", // KGC Explainer for doctors
        "https://youtu.be/AitZI0VTYj8"  // Mini Clinical Audit Explainer
      ],
      content: `Dear Dr. ${doctorName},

Welcome to Keep Going Care (KGC), a new Type 1 Software as a Medical Device (SaMD) designed to support your metabolic syndrome patients in Australia. KGC is built to seamlessly integrate with your care, empowering patients to make sustainable lifestyle modifications and reduce their risk of heart attack and stroke, all within the TGA regulatory framework.

What KGC Is:
KGC acts as a personalised health assistant for your patients. It combines your clinical guidance, delivered through Care Plan Directives (CPDs) you enter via the Doctor Dashboard, with Australian health guidelines and patient preferences. Using evidence-based techniques from Cognitive Behavioural Therapy (CBT) and Motivational Interviewing (MI), KGC provides non-diagnostic, educational support tailored to each individual.

How KGC Works for You and Your Patients:
1. Set Patient Directives: Easily enter personalised CPDs for Diet, Exercise/Wellness Routine, and Medication via your dedicated Doctor Dashboard. These directives form the foundation of the patient's experience within the app.

2. Receive Patient Progress Reports (PPRs): Gain valuable insights into your patients' engagement and self-reported progress through PPRs generated from their daily self-scores (1-10) and usage of the unique "Keep Going" motivation button.

3. Support Patient Adherence: KGC provides a supportive, engaging platform that helps keep patients motivated, subtly encouraging adherence to their care plan through personalised interactions and helpful features like curated health content and local service directories (presented via a friendly AI interface, our Supervisor Agent).

4. Safety and Escalation: KGC monitors patient engagement and query scope. If a patient stops using the app for 24+ hours or asks questions outside the scope of a Type 1 SaMD, KGC will notify you using the contact details provided. In the event of a medical emergency expressed by the patient (indicating risk of death, serious injury, or self-harm), KGC is programmed to recommend calling 000.

Participate in the Mini Clinical Audit (MCA):
We invite you to participate in our Mini Clinical Audit, directly accessible through your Doctor Dashboard. By prescribing KGC to a minimum of 5 appropriate patients (those at risk of heart attack and stroke, suitable for primary prevention, and comfortable using technology), monitoring their progress via PPRs for 3 months, and measuring simple health outcomes, you can earn 5 hours of accredited CPD under the ACRRM and RACGP "Measuring Outcomes" category.

We encourage you to watch this short welcome video to see KGC in action: https://youtu.be/RVquUxB50zM

Terms and Conditions Summary:
By using Keep Going Care, you agree to our Terms and Conditions. Please note the following key points:

* Data Privacy: All private health data is managed securely in accordance with applicable Australian state and federal privacy laws.
* Software as a Medical Device (SaMD): KGC is a Type 1 SaMD providing non-diagnostic, educational support. It is not intended for diagnosis or treatment of any medical condition.
* AI and LLM Limitations: KGC utilises Artificial Intelligence, including Large Language Models (LLMs). While powerful, LLMs are prone to occasional inaccuracies or 'hallucinations'. All information provided by the KGC system is for educational purposes only and must not be considered definitive or acted upon until verified by a qualified healthcare professional.
* Verification is Key: You, as the healthcare professional, remain responsible for all clinical decisions and for verifying any information presented by the KGC system in relation to your patient's care.

We are excited to partner with you in supporting your patients' health journeys. You can access your Doctor Dashboard here: [DOCTOR_DASHBOARD_LINK]

Sincerely,
The Keep Going Care Team
Anthrocyt AI Pty Ltd

Mini Clinical Audit Explainer: https://youtu.be/AitZI0VTYj8`
    };
  }

  /**
   * Patient Welcome Email Template
   */
  static getPatientWelcomeTemplate(patientName: string): EmailTemplate {
    return {
      subject: "Welcome to Keep Going Care! Your Partner in a Healthier Lifestyle",
      requiresAgreement: true,
      videoLinks: ["https://youtu.be/ET8aoaQjJn0"],
      content: `Hi ${patientName},

Welcome to Keep Going Care (KGC)! Your doctor has recommended KGC as a supportive tool to help you manage your metabolic health and work towards a healthier lifestyle. We're here to help you reduce your risk of heart attack and stroke by making positive changes you can stick with.

What KGC Is:
Think of KGC as your friendly, personalised health assistant, available right on your device. It's a system designed to support you with educational advice and motivation for diet, exercise, and taking your medication as prescribed by your doctor.

How KGC Works for You:
KGC uses the plan your doctor has set for you (called Care Plan Directives, or CPDs), along with trusted Australian health information and your own preferences, to give you advice and ideas using supportive techniques.

You'll interact with our main assistant, who can help you with:

* Personalised Support: Get tips and ideas tailored to your doctor's plan for your diet, exercise, and medication routine.
* Motivation When You Need It: Use the special "Keep Going" button. If you're feeling stressed, tempted, or losing motivation, tapping this button will bring up your personal motivational image, a calming video, and a breathing exercise to help you refocus.
* Inspiration: Find ideas for healthy recipes or new exercise routines that fit your preferences and fitness level (safely!).
* Connecting Locally: Discover local gyms, yoga studios, or personal trainers if that's something you're interested in exploring.
* Daily Check-in: We'll ask you each day to quickly rate how you feel you're going with your diet, exercise/wellness routine, and medication (on a scale of 1 to 10). This helps KGC understand how to best support you and keeps your doctor informed of your progress.

We've created a short video to show you how KGC can help you on your journey: https://youtu.be/ET8aoaQjJn0

Terms and Conditions Summary:
By using Keep Going Care, you agree to our Terms and Conditions. Please take a moment to understand these key points:

* Your Health Data: We take your privacy seriously. Your private health data is managed securely in accordance with all relevant Australian state and federal privacy laws.
* Educational Support Only: Keep Going Care is designed to provide you with educational information and support for managing your lifestyle. It is not a tool for diagnosing health problems or providing medical treatment. Always consult with your doctor or other healthcare professionals for any health concerns or before making decisions about your treatment.
* About the Information Provided: KGC uses advanced technology, including AI. While we strive for accuracy, sometimes the information generated by AI can be incorrect. The information provided by Keep Going Care is for your guidance and motivation only. It should not replace advice from your doctor, and you should always check with a healthcare professional if you are unsure about anything related to your health or care plan.
* Not for Emergencies: Keep Going Care cannot help in a medical emergency. If you are experiencing a medical emergency (like chest pain, severe difficulty breathing, or thoughts of harming yourself), please call Triple Zero (000) immediately or go to your nearest hospital emergency department.

We're genuinely here to support you every step of the way. Let's Keep Going together!

You can access your KGC application here: [PATIENT_APP_LINK]

Best regards,
The Keep Going Care Team`
    };
  }

  /**
   * Daily SMS Reminder Template
   */
  static getDailySMSTemplate(patientName: string): SMSTemplate {
    return {
      content: `Hi ${patientName}, friendly reminder to log your daily scores for Diet, Exercise, & Medication in the KGC app. Keep going strong!`,
      timing: "7:00 PM AEST daily"
    };
  }

  /**
   * Generate agreement checkbox content
   */
  static getAgreementContent(): string {
    return `I have read and agree to the Keep Going Care Terms and Conditions, including:
- Data privacy handling in accordance with Australian privacy laws
- Understanding that KGC is educational support only, not medical diagnosis or treatment
- Recognition that AI may occasionally provide inaccurate information
- Agreement that healthcare professionals remain responsible for all clinical decisions
- Understanding that KGC is not for medical emergencies (call 000 for emergencies)`;
  }

  /**
   * Validate email template parameters
   */
  static validateTemplateParams(name: string, email?: string): boolean {
    if (!name || name.trim().length === 0) {
      return false;
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return false;
    }
    
    return true;
  }
}

export const emailTemplateService = EmailTemplateService;