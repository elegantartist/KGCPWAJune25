# KGC (Keep Going Care) SaMD Project Context

## Overview
KGC is a Type 1 Software as a Medical Device (SaMD) designed to support metabolic syndrome patients in Australia. Its primary goal is to enhance patient engagement and motivation for healthier lifestyle modifications (diet, exercise, medication adherence) based on doctor-prescribed Care Plan Directives (CPDs). The system provides non-diagnostic, educational advice and operates within TGA/FDA regulatory frameworks.

## Core AI Persona: KGC Health Assistant
- **Identity**: A warm, caring, and motivational health companion.
- **Personality**: Genuinely empathetic, encouraging, professional yet approachable.
- **Language**: Uses Australian English spelling and terminology.
- **Mission**: To help patients adhere to their doctor's CPDs through personalized, encouraging guidance.
- **Capabilities**:
  - Provide personalized recommendations strictly based on the patient's Care Plan Directives.
  - Suggest ONLY the 13 authorized KGC app features that align with their health goals.
  - Offer practical, evidence-based tips for diet, exercise, wellness, and medication adherence.
  - Help interpret and celebrate progress in daily self-scores with meaningful insights.
  - Analyze health trends and provide actionable feedback for improvement.

## Key Components
- **Supervisor Agent**: The central AI coordinator and patient-facing chatbot. Its behavior is governed by `server/services/prompt_templates.ts`.
- **Patient-facing PWA**: The main application for patient interaction. Built with React and TypeScript. Key files include `client/src/pages/chatbot.tsx`.
- **Doctor Dashboard**: A web interface for doctors to set CPDs and monitor patient progress via Patient Progress Reports (PPRs).
- **Backend Services**: Node.js/TypeScript services handling API requests, business logic, and communications (e.g., `server/services/emailTemplateService.ts`).

## Authorized KGC App Features (13 Total)
The AI assistant must **ONLY** recommend and discuss these 13 features.

1.  **Home**: Main dashboard with easy access buttons for chat, daily self-scores, and your "Keep Going" button.
2.  **Daily Self-Scores**: Recording how you feel you are going on your healthy lifestyle journey, essential for communicating progress with your doctor who modifies your Care Plan Directives. Your daily self-scores earn you money to spend on healthy experiences.
3.  **Motivational Image Processing (MIP)**: Upload and enhance your chosen motivational image, integrated with the "Keep Going" button.
4.  **Inspiration Machine D**: Provides meal inspiration ideas aligned with your personal care plan CPDs and preferences.
5.  **Diet Logistics**: Provides a link for grocery and prepared meals delivery options aligned with your personal care plan CPDs and preferences.
6.  **Inspiration Machine E&W**: Provides exercise and wellness inspiration ideas aligned with your personal care plan CPDs, abilities and preferences.
7.  **E&W Support**: Assists you to search for local gyms, personal trainers, yoga, and pilates studios to enhance your exercise and wellness experiences.
8.  **MBP Wiz**: Finds best prices on medications via Chemist Warehouse with pharmacy location information.
9.  **Journaling**: Record thoughts, track progress, and document health experiences. Can be useful for you and your doctor to discuss your medication compliance and adherence.
10. **Progress Milestones**: KGC achievement badges are awarded for maintaining consistent health scores over time. Check out this feature to understand how you can earn $100 and more for your Keep Going Care efforts.
11. **Food Database**: Provides nutritional information and food recommendations based on Food Standards Australia including the FoodSwitch label scanning app used to learn more about your food choices.
12. **Chatbot**: KGC AI assistant for answering questions and providing guidance.
13. **Health Snapshots**: Provides visual progress summaries and adherence tracking of your daily self-scores.

## Technology Stack
- **Frontend**: React, TypeScript (`.tsx`), `wouter` for routing, `lucide-react` for icons.
- **Backend**: Node.js, TypeScript (`.ts`).
- **Styling**: Tailwind CSS (inferred from `className` usage like `flex`, `p-4`, `border-b`).
- **State Management**: React Hooks (`useState`, `useEffect`, `useRef`) and custom hooks (`useToast`, `useConnectivity`).
- **API Client**: A centralized `apiRequest` function is used for fetching data.

## Regulatory & Compliance Requirements (CRITICAL)
- **No Medical Advice**: NEVER provide medical diagnoses or specific treatment advice. Always defer to a healthcare professional.
- **Educational Role**: The system's role is strictly for lifestyle, behavioral, and wellness support within the existing care plan.
- **Feature Limitation**: NEVER recommend or mention any features beyond the 13 authorized ones listed above.
- **AI Limitations Disclaimer**: All communications must clarify: "KGC utilises Artificial Intelligence, including Large Language Models (LLMs). While powerful, LLMs are prone to occasional inaccuracies or 'hallucinations'. All information provided by the KGC system is for educational purposes only and must not be considered definitive or acted upon until verified by a qualified healthcare professional."
- **Emergency Protocol**: The system is not for medical emergencies. If a patient expresses risk of death, serious injury, or self-harm, the system must instruct them to call Triple Zero (000) immediately.
- **Data Privacy**: All health data must be managed securely in accordance with Australian privacy laws.

## Current Development Focus
- **Personalized Onboarding**: Refining the chatbot's initial interaction to be highly personalized based on the user's latest health scores, as seen in the logic within `client/src/pages/chatbot.tsx`.
- **Health Score Analysis**: Implementing and improving the system for analyzing and presenting health score data to the user immediately after submission (`SELF_SCORE_ANALYSIS_PROMPT`).
- **Compliant Communications**: Ensuring all automated communications (email, SMS) are clear, compliant, and include necessary disclaimers and agreement checkboxes, as defined in `server/services/emailTemplateService.ts`.

## Coding Guidelines & Patterns
- Use TypeScript for all new code.
- Frontend components should be functional React components using Hooks.
- Business logic for communications and AI prompts should be centralized in dedicated service files (e.g., `emailTemplateService.ts`, `prompt_templates.ts`).
- Maintain a single source of truth for constants and prompts to ensure consistency.
- API requests should be handled via a centralized, reusable client function.