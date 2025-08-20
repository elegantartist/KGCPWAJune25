# KGC MCP Tools Architecture

This directory contains the server-side MCP (Model Context Protocol) tools that power the patient dashboard experience. Each tool represents a specific KGC feature with standardized markdown documentation for LLM interaction.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (MCP Host Agent)                  │
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │ Supervisor Agent │    │    Patient Dashboard UI        │  │
│  │    (Chatbot)    │◄──►│  (Memory-Context-Planning)     │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Server (MCP Tools)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Health      │ │ Inspiration │ │ MBP Wizard  │           │
│  │ Metrics     │ │ Machine D   │ │ Tool        │           │
│  │ Tool        │ │ Tool        │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Food        │ │ E&W Support │ │ Progress    │           │
│  │ Database    │ │ Tool        │ │ Milestones  │           │
│  │ Tool        │ │             │ │ Tool        │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Tool Structure

Each MCP tool follows this standardized structure:

1. **Markdown Documentation** (`tool-name.md`) - LLM-readable documentation
2. **Implementation File** (`tool-name.ts`) - Server-side logic
3. **Schema Definition** (`schemas/tool-name-schema.ts`) - Request/response types

## Available Tools

- `health-metrics` - Daily self-scores and health tracking
- `inspiration-machine-d` - Meal planning aligned with CPDs
- `mbp-wizard` - Medication price comparison
- `food-database` - Australian nutritional information
- `ew-support` - Exercise and wellness support search
- `progress-milestones` - Achievement tracking and rewards
- `care-plan-directives` - CPD management and display
- `journaling` - Health journey documentation
- `motivational-imaging` - Image processing and enhancement

## KGC Filters

All tools implement these core KGC filters:

1. **CPD Alignment** - Responses aligned with Care Plan Directives
2. **Australian Context** - Location-aware recommendations
3. **Privacy Protection** - PII anonymization before external AI
4. **Role-based Access** - Patient data isolation
5. **Emergency Detection** - Safety keyword monitoring
6. **Compliance Logging** - Healthcare audit requirements

## Integration Pattern

```typescript
// MCP Tool Interface
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (params: any, context: MCPContext) => Promise<MCPResponse>;
}

// KGC Context
interface MCPContext {
  userId: number;
  userRole: 'patient' | 'doctor' | 'admin';
  carePlanDirectives: CarePlanDirective[];
  healthMetrics: HealthMetric;
  sessionId: string;
  ipAddress: string;
}
```

This architecture enables the LLMs to intelligently select and coordinate multiple tools based on patient queries while maintaining the familiar Supervisor Agent interface.