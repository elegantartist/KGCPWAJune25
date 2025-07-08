# KGC Server Services

This directory contains the core backend services that power the KGC Health Assistant application.

## Key Services

-   **`supervisorAgent.ts`**: The central AI orchestrator. It handles all incoming chat queries, determines user intent, uses tools, and generates safe, compliant responses.
-   **`aiContextService.ts`**: A security-focused service that prepares a safe, PII-redacted "Model Context Protocol" (MCP) bundle for the AI.
-   **`privacyMiddleware.ts`**: Provides foundational security functions like PII redaction and pseudonymization.
-   **`prompt_templates.ts`**: A single source of truth for all system prompts used by the LLMs.
-   **`errors.ts`**: Defines custom error classes for robust error handling across the backend.
-   **`inspirationMachines.ts`**: Contains specialized sub-agents for generating diet and wellness inspiration.
-   **`queryParser.ts`**: An NLU service that pre-processes user queries to understand intent and extract entities.

## Supervisor Agent Architecture

The `supervisorAgent.ts` has been refactored into a modular, maintainable architecture. The main `runSupervisorQuery` method acts as a high-level orchestrator, delegating tasks to focused, private helper methods.

### Request Flow

1.  **`runSupervisorQuery(query)`**: The public entry point.
    -   Handles top-level `try...catch` for robust error handling.
    -   Orchestrates the main processing flow and non-critical background tasks (analytics, milestones).

2.  **`_handleStaleMessage(query, startTime)`**:
    -   **Responsibility**: Checks if the incoming message is older than 15 minutes.
    -   **Action**: If stale, it returns a polite "welcome back" message instead of processing the old query. If not stale, it returns `null` to continue the flow.

3.  **`_processQuery(query, startTime)`**:
    -   **Responsibility**: Acts as the main router after the stale message check.
    -   **Action**: It calls `parseUserQuery` to understand intent, then delegates to the appropriate handler (`_handleLocationQuery` or `_handleGeneralQuery`).

4.  **`_handleLocationQuery(parsedQuery, query, startTime)`**:
    -   **Responsibility**: Manages all queries where the intent is to find a location.
    -   **Action**: Uses the `performAdvancedLocationSearch` tool (which leverages Tavily API) to get real-world location data and synthesizes a helpful response.

5.  **`_handleGeneralQuery(parsedQuery, query, startTime)`**:
    -   **Responsibility**: Handles all standard, conversational queries.
    -   **Action**:
        -   Prepares the secure context (`MCP Bundle`).
        -   Checks if a specialized tool (like `Inspiration Machine`) should be used.
        -   If not, it constructs the prompts and calls the primary LLM (`gpt-4`).
        -   Passes the raw LLM response to `_finalizeResponse` for validation.

6.  **`_finalizeResponse(rawResponse, context, sessionId)`**:
    -   **Responsibility**: A critical security and compliance pipeline for all LLM responses.
    -   **Action**: It runs the raw response through a series of checks:
        -   Multi-model validation (using Anthropic Claude) for sensitive topics.
        -   Validation to ensure only authorized KGC features are recommended.
        -   A final PII/PHI scan to prevent data leakage.
    -   **Output**: Returns a safe, sanitized, and validated response ready to be sent to the user.

This modular design ensures that each part of the agent has a single, clear responsibility, making the system easier to debug, test, and extend.