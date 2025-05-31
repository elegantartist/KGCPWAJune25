# Keep Going Care AI Integration Guide

## Table of Contents
1. [AI Architecture Overview](#ai-architecture-overview)
2. [Supervisor Agent Implementation](#supervisor-agent-implementation)
3. [Memory Systems Implementation](#memory-systems-implementation)
4. [Multi-Model Validation](#multi-model-validation)
5. [LLM API Integration](#llm-api-integration)
6. [Recommendation System](#recommendation-system)
7. [Image Processing System](#image-processing-system)
8. [Trajectory Evaluation](#trajectory-evaluation)
9. [AI Integration Patterns](#ai-integration-patterns)
10. [Testing and Validation](#testing-and-validation)
11. [Development Guidelines](#development-guidelines)

## AI Architecture Overview

The Keep Going Care (KGC) application leverages a sophisticated multi-AI architecture to deliver personalized, validated healthcare guidance. The system is designed around a central Supervisor Agent that coordinates various AI subsystems and integrates with multiple LLM providers for enhanced reliability.

### High-Level Architecture

```
┌───────────────────────────────────────────────────────┐
│                  Supervisor Agent                      │
│                                                       │
│  ┌─────────────┐    ┌────────────┐    ┌────────────┐  │
│  │   Context   │    │  Memory    │    │ Response   │  │
│  │   Manager   │◄──►│  Systems   │◄──►│ Generation │  │
│  └─────────────┘    └────────────┘    └──────┬─────┘  │
│         ▲                  ▲                 │        │
└─────────┼──────────────────┼─────────────────┼────────┘
          │                  │                 │
┌─────────┼──────────────────┼─────────────────┼────────┐
│         │                  │                 ▼        │
│  ┌─────────────┐    ┌────────────┐    ┌────────────┐  │
│  │ Care Plan   │    │ User Data  │    │ Model      │  │
│  │ Directives  │    │ Repository │    │ Processors │  │
│  └─────────────┘    └────────────┘    └────────────┘  │
│                                         ▲        ▲    │
└─────────────────────────────────────────┼────────┼────┘
                                          │        │
                                  ┌───────┴──┐ ┌───┴─────┐
                                  │ OpenAI   │ │Anthropic│
                                  │   API    │ │  API    │
                                  └──────────┘ └─────────┘
```

### Core AI Subsystems

1. **Supervisor Agent**: Central coordinator for all AI interactions
2. **Memory Systems**: Multi-tiered memory architecture using LangMem SDK
3. **Multi-Model Validation**: Cross-validation mechanism using multiple LLMs
4. **Recommendation Engine**: Care plan directive (CPD) aware guidance system
5. **Image Processing**: Analysis of motivational images and visual content
6. **Trajectory Evaluation**: Longer-term interaction assessment for outcomes

## Supervisor Agent Implementation

The Supervisor Agent is the centralized AI coordinator built using the Model Context Protocol (MCP) architecture.

### Agent Structure

```typescript
interface SupervisorAgentProps {
  userId: number;
  carePlanDirectives: CarePlanDirective[];
  onMemoryCreate?: (memory: ChatMemory) => void;
  onFeatureUsage?: (feature: string) => void;
  onRecommendation?: (recommendation: Recommendation) => void;
  onMilestoneUpdated?: (milestone: ProgressMilestone) => void;
}

export function SupervisorAgent({
  userId,
  carePlanDirectives,
  onMemoryCreate,
  onFeatureUsage,
  onRecommendation,
  onMilestoneUpdated
}: SupervisorAgentProps) {
  // Implementation
}
```

### Key Components

1. **Context Manager**: Assembles relevant context for each interaction
   ```typescript
   function buildContext(
     query: string,
     memories: ChatMemory[],
     directives: CarePlanDirective[],
     healthMetrics?: HealthMetric
   ): string {
     // Combines user history, directives, and current query
     // to create comprehensive context for the LLM
   }
   ```

2. **Model Coordinator**: Handles model selection and response processing
   ```typescript
   async function processWithModels(
     context: string, 
     primaryModel: string = 'openai',
     secondaryModel: string = 'anthropic'
   ): Promise<ValidatedResponse> {
     // Primary model processing
     const primaryResponse = await callPrimaryModel(context, primaryModel);
     
     // Secondary validation if needed
     if (requiresValidation(primaryResponse, context)) {
       const secondaryResponse = await callSecondaryModel(context, secondaryModel);
       return reconcileResponses(primaryResponse, secondaryResponse);
     }
     
     return primaryResponse;
   }
   ```

3. **Response Generation**: Creates final user-facing responses
   ```typescript
   function generateResponse(
     validatedContent: ValidatedResponse,
     user: User,
     directives: CarePlanDirective[]
   ): UserFacingResponse {
     // Transform validated content into user-appropriate response
     // Apply any necessary content filtering or formatting
     // Add personalization based on user profile
   }
   ```

### MCP Implementation

The Model Context Protocol system follows this workflow:

1. **Request Processing**:
   - Capture user input
   - Retrieve relevant memories
   - Build context with directives and health data
   
2. **Model Selection**:
   - Determine query complexity
   - Select appropriate primary model
   - Determine if validation is required
   
3. **Response Generation**:
   - Process with primary model
   - Validate with secondary model if needed
   - Reconcile any conflicting information
   
4. **Memory Management**:
   - Extract key information from interaction
   - Determine memory importance and type
   - Store in appropriate memory system
   
5. **Follow-up Actions**:
   - Track feature usage
   - Record recommendations
   - Update relevant milestones

## Memory Systems Implementation

KGC implements the LangMem SDK for sophisticated memory management across different memory types.

### Memory Architecture

```
┌───────────────────────────────────────────────┐
│               Memory Manager                   │
│                                               │
│  ┌─────────────────┐     ┌─────────────────┐  │
│  │ Memory Retrieval│     │ Memory Creation │  │
│  └────────┬────────┘     └────────┬────────┘  │
│           │                       │           │
└───────────┼───────────────────────┼───────────┘
            │                       │
┌───────────┼───────────────────────┼───────────┐
│           ▼                       ▼           │
│  ┌─────────────────┐     ┌─────────────────┐  │
│  │ Semantic Memory │     │ Episodic Memory │  │
│  └─────────────────┘     └─────────────────┘  │
│                                               │
│  ┌─────────────────┐     ┌─────────────────┐  │
│  │Procedural Memory│     │Working Memory   │  │
│  └─────────────────┘     └─────────────────┘  │
│                                               │
└───────────────────────────────────────────────┘
```

### Memory Types

1. **Semantic Memory**: Factual knowledge about the user and healthcare
   ```typescript
   interface SemanticMemory extends ChatMemory {
     memorySystem: 'semantic';
     type: 'long_term';
     importance: number; // Higher for critical facts
     content: string;
     context: {
       relatedTopics?: string[];
       sourceOfInfo?: string;
       confidenceScore?: number;
     };
   }
   ```

2. **Episodic Memory**: Specific user interactions and experiences
   ```typescript
   interface EpisodicMemory extends ChatMemory {
     memorySystem: 'episodic';
     type: 'medium_term' | 'long_term';
     importance: number;
     content: string;
     context: {
       sentiment?: number; // -1 to 1 scale
       relatedMetrics?: Partial<HealthMetric>;
       actionTaken?: string;
     };
   }
   ```

3. **Procedural Memory**: Patterns of behavior and action sequences
   ```typescript
   interface ProceduralMemory extends ChatMemory {
     memorySystem: 'procedural';
     type: 'long_term';
     importance: number;
     content: string;
     context: {
       frequencyOfObservation: number;
       lastObserved: Date;
       confidenceInPattern: number;
     };
   }
   ```

4. **Working Memory**: Short-term conversation context
   ```typescript
   interface WorkingMemory extends ChatMemory {
     memorySystem: 'working';
     type: 'short_term';
     importance: 1.0; // Always high for working memory
     content: string;
     expiresAt: Date; // Typically 30 minutes from creation
   }
   ```

### Memory Operations

1. **Memory Creation**:
   ```typescript
   async function createMemory(
     userId: number,
     system: 'semantic' | 'episodic' | 'procedural' | 'working',
     content: string,
     context?: any,
     importance?: number
   ): Promise<ChatMemory> {
     // Determine expiration based on type
     // Calculate default importance if not provided
     // Store in database
     // Call onMemoryCreate callback if provided
   }
   ```

2. **Memory Retrieval**:
   ```typescript
   async function retrieveRelevantMemories(
     userId: number,
     query: string,
     limit: number = 10
   ): Promise<ChatMemory[]> {
     // Get recent working memories
     // Use embeddings to find semantically similar memories
     // Include high-importance memories regardless of relevance
     // Filter and rank by importance and recency
   }
   ```

3. **Memory Consolidation**:
   ```typescript
   async function consolidateMemories(userId: number): Promise<void> {
     // Find related working memories
     // Analyze patterns for procedural memory creation
     // Summarize episodic memories into semantic facts
     // Prune redundant or low-importance memories
   }
   ```

## Multi-Model Validation

The KGC application uses multiple AI models to cross-validate responses for enhanced reliability, especially for health-related content.

### Validation Process

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Primary   │     │ Validation  │     │ Reconciled  │
│   Response  │────►│  Response   │────►│   Output    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Confidence  │     │ Agreement   │     │   Final     │
│  Scoring    │     │  Analysis   │     │  Confidence │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Implementation

1. **Model Selection Logic**:
   ```typescript
   function selectModels(query: string, healthContext: any): {
     primary: string;
     secondary?: string;
   } {
     // Analyze query complexity and health implications
     // Select appropriate models based on strengths
     // Determine if secondary validation is needed
   }
   ```

2. **Validation Criteria**:
   ```typescript
   function requiresValidation(
     response: LLMResponse,
     query: string
   ): boolean {
     // Check for health claims or recommendations
     // Analyze confidence score of primary response
     // Check for conflicting information with stored memories
     // Evaluate against care plan directives
   }
   ```

3. **Response Reconciliation**:
   ```typescript
   function reconcileResponses(
     primary: LLMResponse,
     secondary: LLMResponse
   ): ValidatedResponse {
     // Compare key claims between responses
     // Identify and resolve conflicting information
     // Calculate confidence scores for reconciled content
     // Flag areas of high disagreement for human review
   }
   ```

4. **Confidence Scoring**:
   ```typescript
   interface ConfidenceScore {
     overall: number; // 0-1 scale
     bySection: Record<string, number>; // For different response parts
     conflictAreas?: string[]; // Areas with low agreement
     validationMethod: 'single' | 'dual' | 'ensemble';
   }
   ```

## LLM API Integration

KGC integrates with multiple LLM providers for different capabilities, with OpenAI and Anthropic as primary providers.

### OpenAI Integration

```typescript
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
import OpenAI from "openai";

// Initialize client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateOpenAIResponse(
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    model?: string;
    responseFormat?: { type: string };
  } = {}
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: options.model || "gpt-4o",
      messages,
      temperature: options.temperature ?? 0.3,
      response_format: options.responseFormat,
    });

    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}
```

### Anthropic Integration

```typescript
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
import Anthropic from '@anthropic-ai/sdk';

// Initialize client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateAnthropicResponse(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
  options: {
    temperature?: number;
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: options.model || 'claude-3-7-sonnet-20250219',
      system: systemPrompt || "You are a healthcare assistant providing evidence-based information.",
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens || 1000,
    });

    return response.content[0].text;
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}
```

### Response Format Standardization

```typescript
interface StandardizedLLMResponse {
  content: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'other';
  confidence: number;
  metadata: {
    responseTime: number;
    tokenUsage: number;
    cost: number;
  };
  structuredData?: any;
}

function standardizeResponse(
  rawResponse: any,
  provider: 'openai' | 'anthropic',
  startTime: number
): StandardizedLLMResponse {
  // Transform provider-specific response format
  // Calculate metadata like response time and token usage
  // Extract structured data if applicable
  // Return standardized format
}
```

## Recommendation System

The KGC recommendation system creates personalized suggestions based on care plan directives and user behavior.

### Recommendation Architecture

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  User Profile  │     │  Care Plan     │     │  Health        │
│  Analysis      │────►│  Directives    │────►│  Metrics       │
└────────────────┘     └────────────────┘     └────────────────┘
         │                     │                      │
         └─────────────┬───────┘                      │
                       │                              │
                ┌──────▼──────┐                       │
                │ Candidate   │                       │
                │ Generation  │                       │
                └──────┬──────┘                       │
                       │                              │
                       └──────────┬───────────────────┘
                                  │
                         ┌────────▼─────────┐
                         │ Recommendation   │
                         │ Validation       │
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │  Outcome         │
                         │  Tracking        │
                         └──────────────────┘
```

### Implementation Components

1. **Recommendation Generation**:
   ```typescript
   async function generateRecommendations(
     userId: number,
     directives: CarePlanDirective[],
     recentMetrics: HealthMetric[],
     featureUsage: FeatureUsage[]
   ): Promise<Recommendation[]> {
     // Analyze metrics trends against directive targets
     // Consider user behavior patterns from feature usage
     // Generate tailored recommendations based on gaps
     // Include alternative approaches for flexibility
   }
   ```

2. **Recommendation Validation**:
   ```typescript
   async function validateRecommendations(
     candidateRecommendations: Recommendation[],
     healthContext: any
   ): Promise<Recommendation[]> {
     // Use LLM to validate safety and appropriateness
     // Score alignment with care plan directives
     // Rank by potential impact
     // Filter out potentially problematic suggestions
   }
   ```

3. **CBT/MI Reasoning Generation**:
   ```typescript
   async function generateReasoning(
     recommendation: Recommendation,
     userProfile: any
   ): Promise<string> {
     // Generate motivational interviewing or CBT-based explanation
     // Tailor communication style to user preferences
     // Include personalized rationale for recommendation
     // Add evidence-based support for recommendations
   }
   ```

4. **Outcome Tracking**:
   ```typescript
   async function trackRecommendationOutcome(
     id: number,
     wasFollowed: boolean,
     scoreAfter?: number
   ): Promise<Recommendation> {
     // Update recommendation record with outcome
     // Calculate effectiveness for future reference
     // Feed into recommendation improvement system
   }
   ```

## Image Processing System

The Motivational Image Processing (MIP) system analyzes user-uploaded images for health motivation.

### MIP Architecture

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Image Upload  │     │  Visual        │     │  Sentiment     │
│  Processing    │────►│  Analysis      │────►│  Extraction    │
└────────────────┘     └────────────────┘     └────────────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │ Memory Integration │
                                            └─────────┬──────────┘
                                                      │
                       ┌────────────────────────┐    │
                       │ Motivational Reference │◄───┘
                       └────────────────────────┘
```

### Implementation

1. **Image Upload Processing**:
   ```typescript
   async function processImageUpload(
     userId: number,
     imageData: string
   ): Promise<MotivationalImage> {
     // Validate image format and content
     // Compress and optimize storage
     // Store in database with user association
   }
   ```

2. **Visual Analysis**:
   ```typescript
   async function analyzeImage(
     imageData: string
   ): Promise<ImageAnalysisResult> {
     // Use OpenAI vision capabilities
     // Extract key visual elements
     // Identify motivational aspects
     // Detect potential concerns (inappropriate content)
   }
   ```

3. **Sentiment Extraction**:
   ```typescript
   async function extractImageSentiment(
     analysisResult: ImageAnalysisResult
   ): Promise<ImageSentiment> {
     // Determine emotional tone of image
     // Extract motivational themes
     // Identify relevance to health goals
     // Generate sentiment summary
   }
   ```

4. **Memory Integration**:
   ```typescript
   async function integrateImageInsights(
     userId: number,
     imageId: number,
     sentiment: ImageSentiment
   ): Promise<ChatMemory> {
     // Create semantic memory for image insights
     // Link motivational themes to care plan directives
     // Store for future reference in interactions
   }
   ```

## Trajectory Evaluation

Trajectory evaluation provides longer-term assessment of user interactions and outcomes.

### Evaluation Architecture

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Interaction   │     │  Behavior      │     │  Outcome       │
│  History       │────►│  Patterns      │────►│  Analysis      │
└────────────────┘     └────────────────┘     └────────────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │ Pattern Detection  │
                                            └─────────┬──────────┘
                                                      │
                       ┌────────────────────────┐    │
                       │  System Adaptation     │◄───┘
                       └────────────────────────┘
```

### Implementation

1. **Interaction Analysis**:
   ```typescript
   async function analyzeInteractionTrajectory(
     userId: number,
     timeframe: { start: Date; end: Date }
   ): Promise<TrajectoryAnalysis> {
     // Gather chat interactions over timeframe
     // Analyze conversation patterns
     // Track emotional trajectory
     // Identify engagement levels
   }
   ```

2. **Behavior Pattern Analysis**:
   ```typescript
   async function analyzeUserBehavior(
     userId: number,
     timeframe: { start: Date; end: Date }
   ): Promise<BehaviorPatterns> {
     // Analyze feature usage patterns
     // Track health metric entries
     // Identify adherence to recommended actions
     // Detect avoidance patterns
   }
   ```

3. **Outcome Analysis**:
   ```typescript
   async function analyzeOutcomes(
     userId: number,
     timeframe: { start: Date; end: Date }
   ): Promise<OutcomeAnalysis> {
     // Track metric improvements
     // Assess milestone completion
     // Evaluate directive adherence
     // Calculate overall trajectory
   }
   ```

4. **System Adaptation**:
   ```typescript
   async function adaptSystemToTrajectory(
     userId: number,
     analysis: TrajectoryAnalysis
   ): Promise<SystemAdaptations> {
     // Adjust conversation style
     // Modify recommendation strategy
     // Update memory importance weights
     // Generate new CPD suggestions
   }
   ```

## AI Integration Patterns

KGC follows specific patterns for integrating AI capabilities throughout the application.

### Integration Guidelines

1. **UI Integration**:
   ```tsx
   // Example of supervisor agent integration in UI
   function ChatInterface({ userId }: { userId: number }) {
     const { data: directives } = useQuery(['directives', userId], () => 
       fetchCarePlanDirectives(userId)
     );
     
     const { data: healthMetrics } = useQuery(['health-metrics', userId], () =>
       fetchLatestHealthMetrics(userId)
     );
     
     // Track feature usage
     const trackFeature = useCallback(async (feature: string) => {
       await recordFeatureUsage(userId, feature);
     }, [userId]);
     
     return (
       <SupervisorAgent
         userId={userId}
         carePlanDirectives={directives || []}
         healthMetrics={healthMetrics}
         onFeatureUsage={trackFeature}
       />
     );
   }
   ```

2. **Server-Side Processing**:
   ```typescript
   // Example of server-side AI processing endpoint
   app.post('/api/analyze-content', async (req, res) => {
     try {
       const { userId, content, contentType } = req.body;
       
       // Retrieve user context
       const directives = await storage.getActiveCarePlanDirectives(userId);
       
       // Process with appropriate model
       const analysis = await analyzeContent(content, contentType, directives);
       
       // Record interaction
       await storage.recordContentInteraction({
         userId,
         contentType,
         contentUrl: content.url,
         interactionType: 'analyze'
       });
       
       res.json(analysis);
     } catch (error) {
       console.error('Content analysis error:', error);
       res.status(500).json({ error: 'Analysis failed' });
     }
   });
   ```

3. **Background Processing**:
   ```typescript
   // Example of background AI processing
   async function processNightlyConsolidation() {
     const users = await storage.getActiveUsers();
     
     for (const user of users) {
       try {
         // Consolidate memories
         await consolidateMemories(user.id);
         
         // Generate progress report suggestions
         if (user.roleId === PATIENT_ROLE_ID) {
           const reportData = await generatePatientInsights(user.id);
           await storage.storeReportData(user.id, reportData);
         }
       } catch (error) {
         console.error(`Error in nightly processing for user ${user.id}:`, error);
       }
     }
   }
   ```

### Error Handling

```typescript
// Standardized AI error handling
function handleAIError(
  error: any,
  fallbackAction: 'retry' | 'alternate-model' | 'generic-response'
): Promise<any> {
  // Log detailed error
  console.error('AI processing error:', error);
  
  // Determine error type and appropriate action
  if (error.status === 429 || error.code === 'rate_limit_exceeded') {
    // Rate limit handling
    return handleRateLimitError(error, fallbackAction);
  }
  
  if (error.status >= 500) {
    // Service unavailable handling
    return handleServiceError(error, fallbackAction);
  }
  
  // Default error handling
  switch (fallbackAction) {
    case 'retry':
      return retryOperation(error.originalFn, error.originalParams);
    case 'alternate-model':
      return switchToAlternateModel(error.originalParams);
    case 'generic-response':
    default:
      return Promise.resolve(getGenericResponse(error.context));
  }
}
```

## Testing and Validation

KGC implements comprehensive testing for AI components to ensure reliability and safety.

### Testing Approach

1. **Unit Testing**:
   ```typescript
   // Example of memory system unit test
   describe('Memory System', () => {
     test('creates semantic memory with correct attributes', async () => {
       const memory = await createMemory(
         testUserId,
         'semantic',
         'User prefers vegetarian diet',
         { confidenceScore: 0.9 },
         0.8
       );
       
       expect(memory).toHaveProperty('id');
       expect(memory.memorySystem).toBe('semantic');
       expect(memory.type).toBe('long_term');
       expect(memory.content).toBe('User prefers vegetarian diet');
       expect(memory.importance).toBeCloseTo(0.8);
     });
   });
   ```

2. **Integration Testing**:
   ```typescript
   // Example of supervisor agent integration test
   describe('Supervisor Agent', () => {
     test('incorporates CPDs into response generation', async () => {
       // Setup test directives
       const directives = [
         { id: 1, userId: testUserId, directive: 'Increase daily steps to 10,000', category: 'exercise', active: true },
       ];
       
       // Mock user query about exercise
       const query = "What kind of exercise should I do today?";
       
       // Process with supervisor agent
       const response = await testAgent.processQuery(query, directives);
       
       // Verify response includes directive-related content
       expect(response.content).toContain('steps');
       expect(response.content).toContain('10,000');
     });
   });
   ```

3. **Validation Testing**:
   ```typescript
   // Example of validation system test
   describe('Multi-Model Validation', () => {
     test('resolves conflicting information appropriately', async () => {
       // Create deliberately conflicting responses
       const primaryResponse = {
         content: "You should fast for 24 hours to detox your system",
         confidence: 0.7,
       };
       
       const secondaryResponse = {
         content: "Extended fasting without medical supervision can be dangerous",
         confidence: 0.9,
       };
       
       // Process reconciliation
       const reconciled = reconcileResponses(primaryResponse, secondaryResponse);
       
       // Verify unsafe advice is properly handled
       expect(reconciled.content).not.toContain('fast for 24 hours');
       expect(reconciled.content).toContain('medical supervision');
       expect(reconciled.confidence).toBeLessThan(primaryResponse.confidence);
     });
   });
   ```

### Validation Framework

```typescript
// Example of medical safety validation framework
async function validateMedicalSafety(
  response: string,
  healthContext: any
): Promise<ValidationResult> {
  // Check for specific unsafe patterns
  const containsUnsafeAdvice = checkForUnsafePatterns(response);
  
  // Validate against medical guidelines
  const guidelineCompliance = await checkMedicalGuidelines(response);
  
  // Verify alignment with care plan
  const directiveAlignment = checkDirectiveAlignment(response, healthContext.directives);
  
  // Calculate overall safety score
  const safetyScore = calculateSafetyScore(
    containsUnsafeAdvice,
    guidelineCompliance,
    directiveAlignment
  );
  
  return {
    isValid: safetyScore > SAFETY_THRESHOLD,
    score: safetyScore,
    concerns: [...containsUnsafeAdvice.concerns, ...guidelineCompliance.concerns],
    suggestedRevisions: generateSafetyRevisions(response, safetyScore < SAFETY_THRESHOLD)
  };
}
```

## Development Guidelines

Guidelines for developers working on the AI components of the KGC system.

### AI Development Principles

1. **Safety First**:
   - All AI-generated content must pass medical safety validation
   - Implement multiple validation layers for health recommendations
   - Always provide attribution for medical advice
   - Never present AI-generated content as medical diagnosis

2. **Transparency**:
   - Clearly indicate when content is AI-generated
   - Provide confidence indicators for recommendations
   - Allow users to access the reasoning behind suggestions
   - Document model versions and capabilities

3. **Privacy-Centric**:
   - Minimize data usage for AI processing
   - Implement strict retention policies for conversational data
   - Use anonymization for any trend analysis
   - Provide user controls for memory management

4. **Model Management**:
   - Keep model configurations in environment variables
   - Document model capabilities and limitations
   - Implement fallback mechanisms for API outages
   - Version control prompt templates

### Implementation Patterns

1. **Prompt Engineering**:
   ```typescript
   // Example of proper prompt template usage
   function buildPromptFromTemplate(
     templateName: string,
     variables: Record<string, any>
   ): string {
     // Load template from versioned source
     const template = promptTemplates[templateName];
     
     if (!template) {
       throw new Error(`Prompt template '${templateName}' not found`);
     }
     
     // Apply variables with safety checks
     return Object.entries(variables).reduce(
       (prompt, [key, value]) => prompt.replace(`{{${key}}}`, String(value)),
       template
     );
   }
   ```

2. **API Key Management**:
   ```typescript
   // Example of proper API configuration
   function getApiConfiguration(provider: 'openai' | 'anthropic'): ApiConfig {
     const config: ApiConfig = {
       baseUrl: '',
       apiKey: '',
       defaultModel: '',
       timeout: 30000,
     };
     
     switch (provider) {
       case 'openai':
         if (!process.env.OPENAI_API_KEY) {
           throw new Error('OPENAI_API_KEY environment variable is required');
         }
         config.baseUrl = 'https://api.openai.com/v1';
         config.apiKey = process.env.OPENAI_API_KEY;
         config.defaultModel = 'gpt-4o';
         break;
         
       case 'anthropic':
         if (!process.env.ANTHROPIC_API_KEY) {
           throw new Error('ANTHROPIC_API_KEY environment variable is required');
         }
         config.baseUrl = 'https://api.anthropic.com';
         config.apiKey = process.env.ANTHROPIC_API_KEY;
         config.defaultModel = 'claude-3-7-sonnet-20250219';
         break;
         
       default:
         throw new Error(`Unsupported API provider: ${provider}`);
     }
     
     return config;
   }
   ```

3. **Error Resilience**:
   ```typescript
   // Example of resilient AI call pattern
   async function resilientModelCall<T>(
     callFn: () => Promise<T>,
     options: {
       retries?: number;
       backoffFactor?: number;
       fallbackFn?: () => Promise<T>;
     } = {}
   ): Promise<T> {
     const { retries = 3, backoffFactor = 1.5, fallbackFn } = options;
     
     let lastError: any;
     
     for (let attempt = 0; attempt < retries; attempt++) {
       try {
         return await callFn();
       } catch (error) {
         lastError = error;
         
         // Check if we should retry this error type
         if (!isRetryableError(error)) {
           break;
         }
         
         // Exponential backoff
         const delay = Math.pow(backoffFactor, attempt) * 1000;
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
     
     // Use fallback if available
     if (fallbackFn) {
       try {
         return await fallbackFn();
       } catch (fallbackError) {
         console.error('Fallback function also failed:', fallbackError);
         throw lastError; // Throw the original error
       }
     }
     
     throw lastError;
   }
   ```

---

This document provides detailed technical information about the AI components of the Keep Going Care (KGC) system. For further information or specific implementation questions, please refer to the codebase or contact the AI development team.