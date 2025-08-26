# Keep Going Care (KGC) - Complete AI Integration Overview

## Executive Summary

The Keep Going Care platform implements a sophisticated AI integration system based on the **Model Context Protocol (MCP)** architecture that combines therapeutic intelligence with real-time patient support. The system integrates dual AI providers (OpenAI GPT-4o and Anthropic Claude 3.7 Sonnet) with comprehensive privacy protection and healthcare compliance through a **Supervisor Agent** architecture that coordinates all patient interactions.

## Core AI Architecture

### 1. Supervisor Agent (Central AI Coordinator)

**Location**: `client/src/components/chatbot/SupervisorAgent.tsx`
**Purpose**: Primary patient interaction interface implementing therapeutic conversation patterns

**Key Features**:
- **WebSocket-based MCP communication** for real-time recommendations
- **Therapeutic conversation patterns** using CBT and MI techniques
- **Voice interaction** with Australian English healthcare-optimized TTS
- **Real-time toast popups** with 5-minute cooldown for therapeutic interventions
- **Feature usage tracking** and stress monitoring (>5 Keep Going button uses)
- **Achievement badge integration** with motivational techniques

**AI Response Generation**:
```typescript
// Enhanced MCP response generation with privacy protection
const response = await enhancedMCPService2.generateResponse(
  prompt,
  userId,
  {
    conversationHistory,
    carePlanDirectives: userCPDs,
    healthMetrics,
    connectivityLevel,
    foodPreferences
  }
);
```

**Toast Notification System**:
- **5-minute cooldown** prevents notification fatigue
- **Automatic dismissal** after 5 seconds
- **Feature recommendation badges** with guided navigation
- **CPD-aligned therapeutic messaging**

### 2. Enhanced MCP Service (Multi-AI Evaluation)

**Location**: `server/ai/enhancedMCPService2.ts`
**Purpose**: Core AI processing engine with privacy protection and multi-provider evaluation

**Privacy Protection Pipeline**:
1. **PII Detection and Anonymization** via Privacy Protection Agent
2. **Multi-AI Processing** with anonymized data
3. **Response De-anonymization** for patient context
4. **Safety Validation** and healthcare compliance checking

**Connectivity-Aware Processing**:
```typescript
enum ConnectivityLevel {
  OFFLINE = 0,       // No connectivity - cached responses
  MINIMAL = 1,       // Limited connectivity - essential only
  FUNCTIONAL = 2,    // Basic connectivity - single provider
  FULL = 3           // Full connectivity - multi-AI evaluation
}
```

**Multi-AI Evaluation Process**:
- **Primary Response Generation** (OpenAI GPT-4o or Anthropic Claude)
- **Cross-Validation** with secondary AI provider
- **Quality Scoring** based on healthcare accuracy and therapeutic value
- **Provider Selection** based on response quality and context

### 3. Feature-Specific AI Integration

#### A. Daily Self-Scores Analysis

**Location**: `client/src/components/health/HealthAnalysisDialog.tsx`
**AI Integration**: Comprehensive CBT/MI analysis of patient scoring patterns

**Analysis Framework**:
```typescript
const analysisContext = {
  scores: { dietScore, exerciseScore, medicationScore },
  userCPDs,
  userId,
  recommendations: [],
  therapeuticApproach: 'CBT/MI',
  focusAreas: determineFocusAreas(scores)
};
```

**Therapeutic Response Patterns**:
- **High Scores (8-10)**: Positive reinforcement with Progress Milestones feature recommendation
- **Medium Scores (5-7)**: CBT cognitive restructuring techniques
- **Low Scores (1-4)**: MI motivational interviewing approach with CPD alignment

#### B. Inspiration Machine D (Meal Planning)

**Location**: `client/src/pages/inspiration-d-new.tsx` & `server/routes.ts` (lines 2578-2760)
**AI Integration**: Multi-layered recipe analysis with health optimization

**Recipe Search and Analysis Pipeline**:
1. **Tavily Search Integration** for recipe discovery
2. **OpenAI Nutritional Analysis** with CPD alignment
3. **Health Score Calculation** (1-10 scale)
4. **Allergen Detection** and dietary compatibility
5. **Difficulty Assessment** and calorie estimation

**AI-Enhanced Recipe Evaluation**:
```typescript
const analysisPrompt = `
Analyze this meal planning video and extract structured information:
Title: ${video.title}
Description: ${video.content}

Return your analysis as a JSON object with:
1. healthScore: nutritional value score (1-10)
2. caloriesBurn: estimated calories in serving
3. allergens: potential allergen warnings
4. dietCompatibility: vegan/vegetarian/gluten-free compatibility
5. difficultyLevel: cooking complexity
6. suitabilityScore: alignment with user's CPDs
7. recommendationReason: therapeutic justification
`;
```

#### C. Exercise & Wellness (E&W) Support

**Location**: `server/routes.ts` (lines 1975-2225)
**AI Integration**: Fitness video analysis with CPD-aligned recommendations

**Exercise Analysis Framework**:
```typescript
const exerciseAnalysis = {
  difficultyLevel: "beginner|intermediate|advanced",
  targetMuscleGroups: ["core", "glutes", "cardio"],
  caloriesBurn: 300, // 30-minute estimate
  suitableFor: ["seniors", "beginners", "joint pain"],
  equipment: ["yoga mat", "no equipment"],
  healthBenefits: ["improved flexibility", "stress reduction"],
  precautions: ["avoid if back problems"],
  intensityScore: 5, // 1-10 scale
  suitabilityScore: 8, // CPD alignment score
  isRecommended: true,
  recommendationReason: "CBT/MI therapeutic justification"
};
```

#### D. Progress Milestones Achievement System

**Location**: `docs/Progress-Milestones-Complete-Documentation.md`
**AI Integration**: Badge-aware therapeutic conversations

**Achievement Recognition Patterns**:
```typescript
const badgeAwarePrompts = {
  encouragement: `Patient working toward ${nextBadgeLevel} ${badgeType} badge.
                 ${weeksCompleted}/${weeksRequired} weeks completed.
                 Use progress to motivate during score analysis.`,
  
  nearCompletion: `Very close to earning ${nextBadgeLevel} badge!
                  Only ${weeksRemaining} weeks left.
                  Encourage consistent behavior.`,
  
  badgeEarned: `Just earned ${badgeLevel} ${badgeType} badge!
               Celebrate achievement and encourage next level.`
};
```

#### E. Food Database Integration

**AI Enhancement**: Australian nutrition information with CPD alignment
- **Real-time nutritional analysis** of user food queries
- **CPD compliance scoring** for recommended foods
- **Therapeutic messaging** around food choices
- **Cultural sensitivity** for Australian dietary preferences

#### F. Motivational Image Processing (Keep Going Button)

**AI Integration**: Image overlay generation with therapeutic messaging
- **Context-aware overlay text** based on recent interactions
- **Stress level detection** (>5 uses triggers supervisor intervention)
- **Motivational quote selection** aligned with current CPD focus
- **Achievement celebration** images for badge completions

## Real-Time Communication Architecture

### WebSocket-Based MCP Protocol

**Implementation**: `client/src/components/chatbot/ModelContextProtocol.tsx`
**Purpose**: Real-time bidirectional communication between client and AI services

**Connection Management**:
```typescript
const ws = new WebSocket(`${wsProtocol}://${window.location.host}/ws`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'recommendation':
      setRecommendation(data.recommendation);
      break;
    case 'feature_usage_tracked':
      console.log('Feature usage recorded:', data.feature);
      break;
    case 'health_analysis_complete':
      handleAnalysisComplete(data.analysis);
      break;
  }
};
```

**Feature Usage Tracking**:
- **Real-time monitoring** of patient feature interactions
- **Stress pattern detection** based on usage frequency
- **Automatic therapeutic interventions** via supervisor agent
- **CPD compliance tracking** and recommendation generation

### Toast Popup Therapeutic System

**Implementation**: Integrated into SupervisorAgent component
**Purpose**: Non-intrusive therapeutic interventions with timing controls

**Popup Logic**:
```typescript
// 5-minute cooldown to prevent notification fatigue
if (currentTime - lastPopupTime > 300000) {
  setShowPopup(true);
  setLastPopupTime(currentTime);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => setShowPopup(false), 5000);
}
```

**Therapeutic Messaging Framework**:
- **CPD-aligned recommendations** based on recent scoring patterns
- **Feature navigation guidance** with clear call-to-action
- **Achievement celebrations** for badge completions
- **Gentle reminders** for missed daily submissions

## Healthcare Compliance & Privacy

### Privacy Protection Agent

**Implementation**: `server/services/privacyProtectionAgent.js`
**Purpose**: HIPAA-compliant PII anonymization before external AI processing

**Anonymization Process**:
1. **PII Detection**: Names, addresses, phone numbers, medical IDs
2. **Token Replacement**: Consistent placeholder tokens per session
3. **Context Preservation**: Maintain therapeutic relevance
4. **De-anonymization**: Restore context for patient-facing responses

### Audit Logging

**Implementation**: `server/auditLogger.ts`
**Purpose**: Healthcare compliance audit trails

**Logged Events**:
- **AI Processing Sessions** with anonymization verification
- **Feature Usage Patterns** for clinical review
- **Therapeutic Interventions** and patient responses
- **CPD Compliance Tracking** and recommendation outcomes

## Doctor Dashboard AI Integration

### Patient Progress Reports (PPR)

**Location**: `server/services/pprService.ts`
**AI Integration**: Comprehensive patient analysis for doctor review

**PPR Analysis Framework**:
```typescript
const pprAnalysis = {
  healthScoreTrends: analyzeScoreTrends(patientScores),
  cpdCompliance: assessCPDCompliance(scores, cpds),
  featureEngagement: trackFeatureUsage(userId),
  riskFactors: identifyRiskPatterns(scores, chatHistory),
  recommendations: generateCPDOptimizations(analysis),
  therapeuticOutcomes: measureCBTMIEffectiveness(interactions)
};
```

**AI-Generated Insights**:
- **Scoring pattern analysis** with trend identification
- **CPD effectiveness assessment** and optimization recommendations
- **Feature engagement correlation** with health outcomes
- **Risk factor identification** and intervention suggestions
- **Therapeutic technique evaluation** (CBT/MI effectiveness)

### Doctor Alerts System

**Real-time Monitoring**:
- **Patient non-engagement** detection (>3 days without scores)
- **Emergency keyword detection** in chat interactions
- **Significant score deterioration** patterns
- **CPD non-compliance** trending analysis

## Technical Implementation Details

### API Endpoints

**Core AI Endpoints**:
```typescript
POST /api/mcp/generate          // Primary AI response generation
POST /api/mcp/evaluate          // Legacy compatibility endpoint
POST /api/health-analysis       // Daily scores analysis
POST /api/recipe-search         // Inspiration Machine D
POST /api/exercise-search       // E&W Support videos
POST /api/progress-milestones   // Achievement tracking
```

### Database Integration

**AI-Related Tables**:
- `chatMemories`: Conversation history with therapeutic context
- `recommendations`: AI-generated feature recommendations
- `featureUsage`: Real-time interaction tracking
- `patientScores`: Official daily submissions (primary scoring table)
- `healthMetrics`: Real-time tracking data (legacy support)
- `carePlanDirectives`: Doctor-created health directives

### Environment Configuration

**AI Provider Setup**:
```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
TAVILY_API_KEY=your_search_key
```

**Connectivity Levels**:
- **Development**: Single provider, basic logging
- **Replit**: Dual provider, enhanced logging
- **Production**: Full MCP, comprehensive audit trails

## Therapeutic Effectiveness Metrics

### CBT/MI Implementation

**Cognitive Behavioral Therapy Integration**:
- **Thought pattern recognition** in chat interactions
- **Behavioral goal setting** through CPD alignment
- **Progress celebration** via achievement badges
- **Cognitive restructuring** in low-score analysis

**Motivational Interviewing Techniques**:
- **Ambivalence resolution** for medication compliance
- **Intrinsic motivation building** through personalized recommendations
- **Change talk reinforcement** in supervisor conversations
- **Resistance acknowledgment** with gentle redirection

### Outcome Measurement

**Quantitative Metrics**:
- **Daily scoring consistency** (target: 7+ days/week)
- **Score improvement trends** (target: trending toward 8-10)
- **Feature engagement rates** (balanced usage across all features)
- **CPD compliance scores** (alignment with doctor directives)

**Qualitative Assessment**:
- **Chat sentiment analysis** for patient mood tracking
- **Therapeutic rapport building** through consistent AI personality
- **Patient satisfaction** with recommendation relevance
- **Doctor confidence** in AI-generated insights

## Future AI Enhancement Roadmap

### Phase 1: Advanced Analytics
- **Predictive health modeling** using score trends
- **Personalized intervention timing** optimization
- **Cross-patient pattern recognition** (anonymized)

### Phase 2: Enhanced Personalization
- **Learning preference adaptation** for AI responses
- **Cultural context integration** for Australian healthcare
- **Family/caregiver involvement** features

### Phase 3: Clinical Integration
- **Healthcare provider API integration**
- **Clinical decision support** tools
- **Outcome research** capabilities

---

*This document represents the complete AI integration architecture for Keep Going Care as of July 15, 2025. All implementations follow TGA SaMD Class I compliance requirements and Australian healthcare privacy standards.*