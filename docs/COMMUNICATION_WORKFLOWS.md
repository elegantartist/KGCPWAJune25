# KGC Application - Communication & Onboarding Workflows

This document outlines the user roles, onboarding sequence, and the specific email and SMS templates used for communication within the Keep Going Care (KGC) application.

## 1. User Roles & Onboarding Flow

The application follows a specific hierarchical user creation flow:

1.  **Admin (Super User)**: The Admin has the highest level of access. Their primary role in the onboarding process is to create new Doctor accounts via the Admin Dashboard, using the doctor's full name, email address, and mobile phone number.
2.  **Doctor**: Once created by an Admin, a Doctor receives a welcome email and can log in to their Doctor Dashboard. From there, they can create new Patient accounts and set the initial Care Plan Directives (CPDs) for them.
3.  **Patient**: Once created by their Doctor, a Patient receives a welcome email and can log in to the KGC application to begin their health journey.

## 2. Communication Templates

These templates are used for the 2FA authentication and user engagement system, powered by Twilio SendGrid.

### 2.1. Welcome Email - For Doctors

*   **Trigger**: Sent automatically when an Admin creates a new Doctor account.
*   **Subject**: Welcome to Keep Going Care - Enhance Patient Outcomes and Earn CPD

> Dear Dr. [Doctor's Name],
>
> Welcome to Keep Going Care (KGC), a new Class I Software as a Medical Device (SaMD) designed to support your metabolic syndrome patients. KGC is built to seamlessly integrate with your care, empowering patients to make sustainable lifestyle modifications, all within the TGA regulatory framework.
>
> **What KGC Is:**
> KGC acts as a personalised health assistant for your patients. It combines your clinical guidance, delivered through Care Plan Directives (CPDs) you enter via the Doctor Dashboard and patient preferences. Using evidence-based techniques, the application delivers educational support tailored to each of your patients.
>
> **How KGC Works for You and Your Patients:**
> 1.  **Set Patient Directives:** Easily enter personalised CPDs for Diet, Exercise/Wellness Routine, and Medication via your dedicated Doctor Dashboard. These directives form the foundation of the patient's experience within the application.
> 2.  **Receive Patient Progress Reports (PPRs):** Gain valuable insights into your patients' engagement and self-reported progress through PPRs generated from their daily self-scores (1-10) and usage of the unique "Keep Going" motivation button.
> 3.  **Support Patient Adherence:** KGC provides a supportive, engaging platform that helps keep patients motivated, subtly encouraging adherence to their care plan through personalised interactions and helpful features like curated health content and local service directories (presented via a friendly chatbot interface).
> 4.  **Safety and Escalation:** KGC monitors patient engagement and query scope. If a patient stops using the app for 24+ hours or asks questions outside the scope of a Class I SaMD, KGC will notify you using the contact details provided. In the event of a medical emergency expressed by the patient (indicating risk of death, serious injury, or self-harm), KGC is programmed to recommend calling 000.
>
> **Participate in the Mini Clinical Audit (MCA):**
> We invite you to participate in our Mini Clinical Audit, directly accessible through your Doctor Dashboard. By prescribing KGC to a minimum of 5 appropriate patients (those at risk of heart attack and stroke, suitable for primary prevention, and comfortable using technology), monitoring their progress via PPRs and updating their CPDs for 3 months, and measuring simple health outcomes (blood pressure, weight and subjective feelings about their adherence and compliance to your care plan, you can earn 5 hours of accredited CPD under the ACRRM and RACGP "Measuring Outcomes" category. This audit is a valuable opportunity to assess the impact of digital health support on patient engagement and lifestyle changes.
>
> **KGC Explainer Video:** [https://youtu.be/RVquUxB50zM](https://youtu.be/RVquUxB50zM)
> **Mini Clinical Audit Explainer:** [https://youtu.be/AitZI0VTYj8](https://youtu.be/AitZI0VTYj8)
>
> **Terms and Conditions Summary:**
> By using Keep Going Care, you agree to our Terms and Conditions. Please note the following key points:
>
> *   **Data Privacy:** All private health data is managed securely in accordance with applicable Australian state and federal privacy laws.
> *   **Software as a Medical Device (SaMD):** KGC is a Type 1 SaMD providing non-diagnostic, educational support. It is not intended for diagnosis or treatment of any medical condition.
> *   **AI and LLM Limitations:** KGC utilises Artificial Intelligence, including Large Language Models (LLMs). While powerful, LLMs are prone to occasional inaccuracies or 'hallucinations'. All information provided by the KGC system is for educational purposes only and must not be considered definitive or acted upon until verified by a qualified healthcare professional.
> *   **Verification is Key:** You, as the healthcare professional, remain responsible for all clinical decisions and for verifying any information presented by the KGC system in relation to your patient's care.
>
> Sincerely,
> The Keep Going Care Team
> Anthrocyt AI Pty Ltd

### 2.2. Welcome Email - For Patients

*   **Trigger**: Sent automatically when a Doctor creates a new Patient account.
*   **Subject**: Welcome to Keep Going Care! Your Partner in a Healthier Lifestyle

> Hi [Patient's Name],
>
> Welcome to Keep Going Care (KGC)! Your doctor has recommended KGC as a supportive tool to help you manage your metabolic health and work towards a healthier lifestyle. We're here to help you reduce your risk of heart attack and stroke identified by your doctor, by making positive changes you can stick with based on your doctor’s care plan designed for you.
>
> **What KGC Is:**
> Think of KGC as your friendly, personalised health assistant, available right on your device. It's a system designed to support you with educational advice and motivation for diet, exercise, and taking your medication as prescribed by your doctor.
>
> **How KGC Works for You:**
> KGC uses the plan your doctor has set for you (called Care Plan Directives, or CPDs), along with trusted Australian health information and your own preferences, to give you advice and ideas using supportive techniques.
>
> You'll interact with our main assistant, who can help you with:
>
> *   **Personalised Support:** Get tips and ideas tailored to your doctor's plan for your diet, exercise, and medication routine.
> *   **Motivation When You Need It:** Use the special "Keep Going" button. If you're feeling stressed, tempted, or losing motivation, tapping this button will bring up your personal motivational image, a calming video, and a breathing exercise to help you refocus.
> *   **Inspiration:** Find ideas for healthy recipes or new exercise routines that fit your preferences and fitness level (safely!).
> *   **Connecting Locally:** Discover local gyms, yoga studios, or personal trainers if that's something you're interested in exploring.
> *   **Daily Check-in:** We'll ask you each day to quickly rate how you feel you're going with your diet, exercise/wellness routine, and medication (on a scale of 1 to 10). This helps KGC understand how to best support you and keeps your doctor informed of your progress with their care plan (CPDs).
>
> We've created a short video to show you how KGC can help you on your journey: [https://youtu.be/ET8aoaQjJn0](https://youtu.be/ET8aoaQjJn0)
>
> **Terms and Conditions Summary:**
> By using Keep Going Care, you agree to our Terms and Conditions. Please take a moment to understand these key points:
>
> *   **Your Health Data:** We take your privacy seriously. Your private health data is managed securely in accordance with all relevant Australian state and federal privacy laws.
> *   **Educational Support Only:** Keep Going Care is designed to provide you with educational information and support for managing your lifestyle. It is not a tool for diagnosing health problems or providing medical treatment. Always consult with your doctor or other healthcare professionals for any health concerns or before making decisions about your treatment.
> *   **About the Information Provided:** KGC uses advanced technology, including AI. While we strive for accuracy, sometimes the information generated by AI can be incorrect. The information provided by Keep Going Care is for your guidance and motivation only. It should not replace advice from your doctor, and you should always check with a healthcare professional if you are unsure about anything related to your health or care plan.
> *   **Not for Emergencies:** Keep Going Care cannot help in a medical emergency. If you are experiencing a medical emergency (like chest pain, severe difficulty breathing, or thoughts of harming yourself), please call Triple Zero (000) immediately or go to your nearest hospital emergency department.
>
> We're genuinely here to support you every step of the way. Let's Keep Going together!
>
> You can access your KGC application here: [Link to secure login workflow with SMS verification].
>
> Best regards,
> The Keep Going Care Team

### 2.3. Daily SMS Reminder - For Patients

*   **Trigger**: Sent daily at 7:00 PM AEST.
*   **Message**:
> Hi [Patient Name], friendly reminder to log your daily scores for Diet, Exercise, & Medication in the KGC app. Keep going strong!