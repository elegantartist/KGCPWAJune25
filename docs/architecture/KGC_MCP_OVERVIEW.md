# KGC "MCP" System: An Architectural Overview

## Introduction: Clarifying the "MCP"

The "MCP" in the Keep Going Care (KGC) application is **NOT** an implementation of Anthropic's Model Context Protocol. Instead, it is a proprietary, healthcare-specific architecture that stands for **Memory-Context-Planning**. This system is designed from the ground up to provide safe, effective, and privacy-focused AI assistance within a regulated medical software environment.

## Core Architectural Pillars

The KGC AI system is built on three foundational pillars that work in concert:

1.  **Memory-Context-Planning (MCP) Service**: The central orchestrator that intelligently manages the flow of information.
2.  **WebSocket-Based Real-Time Communication**: A persistent connection that allows for proactive, event-driven interactions.
3.  **Privacy-First Design**: A non-negotiable security layer that anonymizes all data before it is processed by external AI models.

### Key Differences from Anthropic's MCP

| Anthropic MCP                               | KGC Custom MCP                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Protocol for AI model context sharing       | Healthcare-specific context management system                               |
| Standardized tool/resource interfaces       | Custom health feature integration                                           |
| Model-agnostic protocol                     | Multi-AI orchestration with built-in privacy protection                     |
| Focus on external tool integration          | Focus on internal Care Plan Directive (CPD) alignment                       |
| An open standard for general AI interaction | A proprietary, closed-loop workflow system for regulated healthcare         |

## System Components & Data Flow

The KGC system follows a sophisticated, multi-stage data flow to ensure security and quality.

### 1. Privacy Protection Agent Integration

The `privacyProtectionAgent.ts` is the first and last stop for all data.

*   **Anonymization**: All user input and contextual data are passed through the agent to redact and tokenize any PII or PHI.
    ```typescript
    // Anonymizes all data before AI processing
    const { anonymizedText } = privacyProtectionAgent.anonymize(prompt, sessionId);
    ```
*   **De-anonymization**: Responses from the LLM are processed to replace tokens with the original data, restoring personal context securely on the server before sending to the client.
    ```typescript
    // De-anonymizes responses while preserving personal context
    const deAnonymizedResponse = privacyProtectionAgent.deAnonymize(response, sessionId);
    ```

### 2. Multi-AI Evaluation System

To ensure the highest quality and safety, the `multiAIEvaluator.ts` can be triggered for sensitive queries. It sends the same prompt to multiple AI providers (e.g., OpenAI and Anthropic) and compares the responses against a set of healthcare-specific requirements.

```typescript
// Evaluates responses from multiple AI providers for quality
const evaluationResult = await multiAIEvaluator.evaluateResponse({
  userPrompt: prompt,
  aiResponse: deAnonymizedResponse,
  requirements: [
    "Must be relevant to the user's question",
    "Must align with any Care Plan Directives if mentioned"
  ],
  tgaCompliance: true
});
```

### 3. Healthcare-Specific Context Integration

The `aiContextService.ts` assembles a rich, relevant context for the AI. This is not just chat history; it's a holistic view of the patient's current situation.

*   **Care Plan Directives**: The system prompt is dynamically updated with the patient's active medical directives from their doctor.
*   **Health Metrics**: The latest self-scored health metrics (diet, exercise, medication) are included to provide the AI with an understanding of the patient's recent progress and challenges.

### 4. Real-Time Feature Coordination & Recommendation Engine

The WebSocket implementation (`ModelContextProtocol.tsx`) enables a proactive and intelligent user experience.

*   **Feature Usage Tracking**: The system tracks every feature interaction in real-time.
    ```typescript
    // Records every feature interaction
    mcp.recordFeatureUsage('Progress Milestones');
    ```
*   **Contextual Recommendations**: Based on usage patterns, the system can proactively request a recommendation from the backend, which can then be pushed to the user.
    ```typescript
    // Generates personalized recommendations based on usage patterns
    mcp.requestRecommendation();
    ```

## Conclusion

The KGC "MCP" is a sophisticated healthcare intelligence platform that orchestrates multiple AI providers while maintaining strict privacy protection and healthcare compliance. It represents a proprietary healthcare AI orchestration platform rather than an implementation of any standardized protocol, demonstrating an advanced, privacy-first architecture that is seamlessly integrated with clinical workflows.