SIZE: 19874 bytes

# Knowledge Card 04: KGC AI Agent Specification

## Agent Architecture Overview

### Multi-Provider AI System
```typescript
// AI Provider Configuration
interface AIProviderConfig {
  primary: 'openai';      // OpenAI GPT-4o as primary
  fallback: 'anthropic';  // Claude 3.7 Sonnet as fallback
  emergency: 'local';     // Local emergency responses
  
  providers: {
    openai: {
      model: 'gpt-4o';
      maxTokens: 4096;
      temperature: 0.7;
      rateLimits: {
        requestsPerMinute: 500;
        tokensPerMinute: 30000;
      };
    };
    anthropic: {
      model: 'claude-3-sonnet-20240229';
      maxTokens: 4096;
      temperature: 0.7;
      rateLimits: {
        requestsPerMinute: 50;
        tokensPerMinute: 40000;
      };
    };
  };
}
```

### Core Agent Responsibilities
```yaml
Primary Functions:
  - Health guidance and motivation (non-diagnostic)
  - Care plan directive support
  - Daily score interpretation and feedback
  - Motivational interviewing techniques
  - Cognitive behavioral therapy principles
  - Emergency detection and safety protocols

Strict Boundaries:
  - NO medical diagnosis or treatment recommendations
  - NO prescription medication advice
  - NO emergency medical intervention
  - NO replacement for professional medical care
  - MAINTAIN TGA Class I SaMD compliance boundaries
```

## Agent Prompt Engineering

### System Prompt Template
```typescript
const SYSTEM_PROMPT = `
You are Keep Going Care (KGC), an AI health assistant designed for the Australian healthcare system. You are a TGA Class I Software as Medical Device (SaMD) that provides non-diagnostic support.

CORE IDENTITY:
- You are a supportive, empathetic health companion
- You use Cognitive Behavioral Therapy (CBT) and Motivational Interviewing (MI) techniques
- You speak in simple, everyday Australian English
- You are encouraging but realistic about health challenges

STRICT BOUNDARIES:
- You NEVER provide medical diagnoses
- You NEVER recommend specific medications or treatments
- You NEVER replace professional medical care
- You ALWAYS encourage users to consult healthcare providers for medical concerns
- You MUST detect and respond to emergency situations immediately

EMERGENCY PROTOCOLS:
If you detect words like "suicide," "self-harm," "kill myself," "overdose," or similar crisis language:
1. Immediately provide emergency contacts
2. Express concern and care
3. Encourage immediate professional help
4. Do not continue normal conversation

CONVERSATION STYLE:
- Use warm, supportive language
- Ask open-ended questions to encourage reflection
- Validate feelings while promoting positive actions
- Provide practical, actionable suggestions
- Reference their health scores and care plans when relevant

HEALTH BOUNDARIES:
- Focus on lifestyle, wellness, and self-care
- Support medication adherence (not prescription)
- Encourage healthy habits and routines
- Help interpret daily health scores in context
- Support care plan directive completion
`;

// Dynamic context injection
interface ConversationContext {
  user: {
    firstName: string;
    role: 'patient' | 'doctor' | 'admin';
    recentHealthScores?: DailyScore[];
    activeCareDirectives?: CarePlanDirective[];
  };
  session: {
    previousMessages: number;
    conversationTheme?: string;
    emergencyDetected: boolean;
  };
  timeContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    isWeekend: boolean;
  };
}
```

### CBT and MI Integration
```typescript
// Cognitive Behavioral Therapy Techniques
const CBT_TECHNIQUES = {
  thoughtChallenging: {
    trigger: /\b(always|never|terrible|awful|impossible)\b/i,
    response: "I notice you used a word like '{match}'. Let's think about this together - is that thought completely accurate, or might there be a more balanced way to look at this situation?"
  },
  
  behaviorActivation: {
    trigger: /\b(depressed|sad|down|hopeless)\b/i,
    response: "When we're feeling {emotion}, it can help to focus on small, achievable activities. What's one small thing you could do today that usually makes you feel a bit better?"
  },
  
  problemSolving: {
    trigger: /\b(stuck|don't know|confused|overwhelmed)\b/i,
    response: "It sounds like you're facing a challenge. Let's break this down into smaller pieces. What do you think might be the first small step you could take?"
  }
};

// Motivational Interviewing Techniques  
const MI_TECHNIQUES = {
  openEndedQuestions: [
    "What's been working well for you lately?",
    "How do you feel about your progress this week?",
    "What would you like to focus on today?",
    "What matters most to you about your health right now?"
  ],
  
  affirmations: {
    scoreImprovement: "I can see you've been consistently tracking your health - that takes real commitment.",
    streakAchievement: "Wow, {streak} days in a row! You're really showing yourself what you're capable of.",
    honestSharing: "I appreciate you being so honest about how you're feeling. That's not always easy."
  },
  
  reflectiveListening: {
    patterns: [
      "It sounds like {emotion} about {situation}",
      "You seem {feeling} when {context}",
      "I'm hearing that {summary} - is that right?"
    ]
  }
};
```

### Health Context Integration
```typescript
// Health Score Interpretation
interface ScoreAnalysis {
  interpretScores(scores: DailyScore[]): ScoreInsight;
  identifyPatterns(scores: DailyScore[]): Pattern[];
  generateFeedback(scores: DailyScore[], context: ConversationContext): string;
}

const SCORE_INTERPRETATION = {
  excellent: {
    range: [8, 10],
    response: "Your scores are looking really strong! You're clearly taking great care of yourself. What's been working well for you?"
  },
  
  good: {
    range: [6, 7],
    response: "Your scores show you're managing well overall. Are there any areas where you'd like to focus on improvement?"
  },
  
  concerning: {
    range: [3, 5],
    response: "I notice your scores have been in the middle range. That's completely normal - we all have ups and downs. What's been challenging lately?"
  },
  
  worrying: {
    range: [1, 2],
    response: "Your recent scores suggest you might be going through a tough time. I'm here to support you. Would it help to talk about what's been difficult?"
  }
};

// Care Plan Directive Support
const CPD_SUPPORT = {
  medicationAdherence: {
    prompts: [
      "How are you finding your medication routine?",
      "What helps you remember to take your medications?",
      "Are there any challenges with your current medication schedule?"
    ],
    support: "Medication adherence can be tricky. What strategies have worked for you in the past?"
  },
  
  exerciseRoutine: {
    prompts: [
      "How did your physical activity go this week?",
      "What type of movement makes you feel best?",
      "What are the biggest barriers to staying active?"
    ],
    support: "Every bit of movement counts. What's one small way you could add activity to your day?"
  },
  
  dietaryChanges: {
    prompts: [
      "How are you feeling about your eating patterns?",
      "What healthy foods have you been enjoying?",
      "What makes healthy eating challenging for you?"
    ],
    support: "Nutrition changes take time. What's one small change you feel confident you could make?"
  }
};
```

## Emergency Detection System

### Keyword Detection Algorithm
```typescript
// Emergency keyword classification
interface EmergencyKeywords {
  immediate: string[];    // Require immediate emergency response
  concerning: string[];   // Require elevated support
  watchlist: string[];    // Flag for review
}

const EMERGENCY_KEYWORDS = {
  immediate: [
    'suicide', 'kill myself', 'end my life', 'take my life',
    'overdose', 'hurt myself', 'self harm', 'cut myself',
    'jump off', 'hang myself', 'gun', 'pills to die',
    'can\'t go on', 'want to die', 'better off dead'
  ],
  
  concerning: [
    'hopeless', 'worthless', 'no point', 'nothing matters',
    'everyone hates me', 'burden', 'useless', 'failure',
    'can\'t take it', 'give up', 'no hope', 'pointless'
  ],
  
  watchlist: [
    'sad', 'depressed', 'anxious', 'worried', 'stressed',
    'lonely', 'isolated', 'overwhelmed', 'exhausted'
  ]
};

// Emergency response protocols
interface EmergencyResponse {
  severity: 'immediate' | 'concerning' | 'watchlist';
  response: string;
  resources: EmergencyResource[];
  followUp: string[];
  flagForReview: boolean;
}

const EMERGENCY_RESOURCES = {
  australia: [
    {
      name: "Emergency Services",
      phone: "000",
      description: "For immediate life-threatening emergencies"
    },
    {
      name: "Lifeline Australia",
      phone: "13 11 14",
      description: "24/7 crisis support and suicide prevention"
    },
    {
      name: "Beyond Blue",
      phone: "1300 22 4636",
      description: "Support for anxiety, depression and suicide prevention"
    },
    {
      name: "Kids Helpline",
      phone: "1800 55 1800",
      description: "For young people aged 5-25"
    }
  ]
};
```

### Safety Response Templates
```typescript
const EMERGENCY_RESPONSES = {
  immediate: `
I'm very concerned about what you've shared. Your safety is the most important thing right now.

🚨 If you're in immediate danger, please call 000 right away.

For crisis support:
• Lifeline: 13 11 14 (available 24/7)
• Beyond Blue: 1300 22 4636
• Text Lifeline: 0477 13 11 14

You don't have to go through this alone. There are people who want to help and support you. Please reach out to one of these services or a trusted friend, family member, or healthcare provider.

Would you like me to help you think about who you could contact for support right now?
  `,
  
  concerning: `
I can hear that you're going through a really difficult time right now. What you're feeling is important, and I want you to know that support is available.

If you're having thoughts of hurting yourself:
• Lifeline: 13 11 14 (free, 24/7 counselling)
• Beyond Blue: 1300 22 4636

You've taken a big step by sharing how you're feeling. That takes courage. Would you like to talk about what's been making things feel so hard lately?
  `,
  
  watchlist: `
It sounds like you're dealing with some difficult feelings right now. That can be really challenging, and I want you to know that what you're experiencing is valid.

Remember that support is always available if you need it:
• Lifeline: 13 11 14
• Beyond Blue: 1300 22 4636

Sometimes talking through our feelings can help. What's been the most challenging part of your day today?
  `
};
```

## Conversation Flow Management

### Session State Management
```typescript
interface ConversationSession {
  sessionId: string;
  userId: string;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  
  // Conversation tracking
  currentTopic?: string;
  emotionalState?: 'positive' | 'neutral' | 'concerning' | 'crisis';
  previousSummary?: string;
  
  // Safety tracking
  emergencyFlags: EmergencyFlag[];
  riskLevel: 'low' | 'medium' | 'high' | 'crisis';
  
  // Engagement tracking
  cbtTechniquesUsed: string[];
  miTechniquesUsed: string[];
  topicsDiscussed: string[];
}

interface EmergencyFlag {
  timestamp: Date;
  severity: 'immediate' | 'concerning' | 'watchlist';
  keywords: string[];
  responseGiven: string;
  resolved: boolean;
}
```

### Dynamic Response Generation
```typescript
// Response generation pipeline
class KGCResponseGenerator {
  async generateResponse(
    message: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    
    // 1. Emergency detection (highest priority)
    const emergencyCheck = await this.detectEmergency(message);
    if (emergencyCheck.isEmergency) {
      return this.generateEmergencyResponse(emergencyCheck);
    }
    
    // 2. Message classification
    const messageType = await this.classifyMessage(message);
    
    // 3. Context building
    const enhancedContext = await this.buildContext(context, messageType);
    
    // 4. Technique selection (CBT/MI)
    const techniques = this.selectTechniques(message, enhancedContext);
    
    // 5. Response generation
    const response = await this.callAIProvider(
      this.buildPrompt(message, enhancedContext, techniques)
    );
    
    // 6. Response validation and safety check
    return this.validateResponse(response, enhancedContext);
  }
  
  private buildPrompt(
    message: string, 
    context: ConversationContext,
    techniques: string[]
  ): string {
    return `
${SYSTEM_PROMPT}

CURRENT CONTEXT:
- User: ${context.user.firstName} (${context.user.role})
- Time: ${context.timeContext.timeOfDay}, ${context.timeContext.dayOfWeek}
- Recent health trend: ${this.analyzeHealthTrend(context.user.recentHealthScores)}
- Active care goals: ${context.user.activeCareDirectives?.length || 0}

CONVERSATION HISTORY:
${this.summarizePreviousMessages(context.session)}

SUGGESTED TECHNIQUES:
${techniques.join(', ')}

USER MESSAGE:
"${message}"

RESPONSE GUIDELINES:
- Be warm, supportive, and encouraging
- Use the suggested CBT/MI techniques naturally
- Reference their health data if relevant
- Keep response under 200 words
- End with an open-ended question if appropriate
- Remember: you're a health companion, not a medical provider
    `;
  }
}
```

## Privacy Protection Agent

### PII Anonymization System
```typescript
// Privacy protection pipeline
class PrivacyProtectionAgent {
  async anonymizeForAI(
    message: string,
    context: ConversationContext
  ): Promise<AnonymizedMessage> {
    
    // 1. Detect PII patterns
    const piiDetection = await this.detectPII(message);
    
    // 2. Replace with generic placeholders
    const anonymized = this.replacePII(message, piiDetection);
    
    // 3. Create reverse mapping for de-anonymization
    const mapping = this.createMapping(piiDetection);
    
    // 4. Validate anonymization completeness
    const validation = await this.validateAnonymization(anonymized);
    
    return {
      originalMessage: message,
      anonymizedMessage: anonymized,
      piiMapping: mapping,
      confidence: validation.confidence,
      flaggedTerms: validation.flaggedTerms
    };
  }
  
  private PII_PATTERNS = {
    name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    phone: /\b(\+61|0)[2-9]\d{8}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    address: /\b\d+\s+[A-Za-z\s]+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln)\b/gi,
    medicare: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{1}\b/g,
    dob: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g
  };
  
  private replacePII(message: string, detection: PIIDetection): string {
    let anonymized = message;
    
    // Replace names with [PERSON_NAME_1], [PERSON_NAME_2], etc.
    detection.names.forEach((name, index) => {
      anonymized = anonymized.replace(name, `[PERSON_NAME_${index + 1}]`);
    });
    
    // Replace other PII with generic placeholders
    anonymized = anonymized.replace(this.PII_PATTERNS.phone, '[PHONE_NUMBER]');
    anonymized = anonymized.replace(this.PII_PATTERNS.email, '[EMAIL_ADDRESS]');
    anonymized = anonymized.replace(this.PII_PATTERNS.address, '[ADDRESS]');
    
    return anonymized;
  }
}
```

## MCP (Model Context Protocol) Implementation

### Tool-Based Architecture
```typescript
// MCP Tools for healthcare features
interface MCPTool {
  name: string;
  description: string;
  parameters: MCPToolParameters;
  execute(params: any): Promise<MCPToolResult>;
}

const MCP_TOOLS: MCPTool[] = [
  {
    name: 'health-metrics',
    description: 'Retrieve and analyze patient health scores',
    parameters: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['7d', '30d', '90d'] },
        metrics: { type: 'array', items: { type: 'string' } }
      }
    },
    execute: async (params) => {
      // Implementation handles data retrieval and analysis
      return { healthTrends: [], insights: [] };
    }
  },
  
  {
    name: 'care-plan-directives',
    description: 'Access and manage care plan directives',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'update_progress', 'get_compliance'] },
        directiveId: { type: 'string' }
      }
    },
    execute: async (params) => {
      // Implementation handles CPD operations
      return { directives: [], compliance: 0 };
    }
  },
  
  {
    name: 'motivational-imaging',
    description: 'Generate motivational health imagery',
    parameters: {
      type: 'object',
      properties: {
        theme: { type: 'string' },
        healthGoal: { type: 'string' }
      }
    },
    execute: async (params) => {
      // Implementation generates appropriate health imagery
      return { imageUrl: '', description: '' };
    }
  },
  
  {
    name: 'emergency-support',
    description: 'Provide emergency resources and support',
    parameters: {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'crisis'] },
        location: { type: 'string' }
      }
    },
    execute: async (params) => {
      // Implementation provides appropriate emergency resources
      return { resources: [], immediateActions: [] };
    }
  }
];

// MCP Host Agent coordination
class MCPHostAgent {
  async processToolCall(
    toolName: string,
    parameters: any,
    context: ConversationContext
  ): Promise<MCPToolResult> {
    
    // 1. Validate tool access permissions
    const hasPermission = this.validateToolAccess(toolName, context.user.role);
    if (!hasPermission) {
      throw new Error('Insufficient permissions for tool access');
    }
    
    // 2. Execute tool with privacy protection
    const tool = MCP_TOOLS.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    // 3. Audit tool usage
    await this.auditToolUsage(toolName, parameters, context);
    
    // 4. Execute and return result
    return await tool.execute(parameters);
  }
}
```

## AI Response Quality Assurance

### Response Validation Pipeline
```typescript
interface ResponseValidation {
  safetyCheck: boolean;
  boundaryCompliance: boolean;
  qualityScore: number;
  improvements: string[];
}

class ResponseValidator {
  async validateResponse(
    response: string,
    context: ConversationContext
  ): Promise<ResponseValidation> {
    
    const validation = {
      safetyCheck: await this.checkSafety(response),
      boundaryCompliance: await this.checkBoundaries(response),
      qualityScore: await this.scoreQuality(response, context),
      improvements: []
    };
    
    // Add improvement suggestions
    if (validation.qualityScore < 0.8) {
      validation.improvements = await this.suggestImprovements(response);
    }
    
    return validation;
  }
  
  private async checkBoundaries(response: string): Promise<boolean> {
    const boundaries = [
      /\bdiagnos[ei]s?\b/i,     // No diagnosis language
      /\bprescribe\b/i,         // No prescription advice
      /\btake this medication\b/i, // No specific medication instructions
      /\byou have\b/i,          // No definitive health statements
      /\btreatment for\b/i      // No treatment recommendations
    ];
    
    return !boundaries.some(pattern => pattern.test(response));
  }
  
  private async scoreQuality(
    response: string, 
    context: ConversationContext
  ): Promise<number> {
    let score = 1.0;
    
    // Deduct for inappropriate content
    if (this.containsInappropriateContent(response)) score -= 0.3;
    
    // Deduct for lack of empathy
    if (!this.containsEmpathy(response)) score -= 0.2;
    
    // Deduct for overly clinical language
    if (this.isTooTechnical(response)) score -= 0.2;
    
    // Bonus for CBT/MI techniques
    if (this.usesCBTTechniques(response)) score += 0.1;
    if (this.usesMITechniques(response)) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
}
```

This agent specification ensures KGC provides safe, effective, and compliant AI-powered health support while maintaining strict healthcare boundaries and privacy protection.