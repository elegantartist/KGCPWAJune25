# AI Agents Technical Summary: Daily Self-Scores Implementation

## Executive Summary for Jules Gemini & AWS Q Agents

This document provides a complete technical implementation guide for the Daily Self-Scores feature in the Keep Going Care (KGC) healthcare application. The implementation follows modern React patterns with TypeScript, integrates a Supervisor Agent using CBT/MI therapeutic techniques, and maintains healthcare compliance standards.

## System Architecture Overview

### Component Hierarchy
```
/daily-self-scores (Route)
├── DailySelfScores.tsx (Page Container)
    ├── DailyHealthScore.tsx (Interactive Sliders)
        ├── ScoreDiscussionDialog.tsx (AI Analysis Gateway)
            └── HealthAnalysisDialog.tsx (Supervisor Agent Interface)
                └── SupervisorAgent.tsx (AI Chat Component)
```

### Data Flow Architecture
```
User Input → Slider Values → Local Storage → API Submission → MCP Feature Tracking → Supervisor Agent Analysis → CBT/MI Response → Feature Recommendations
```

## Complete Implementation Files

### 1. Main Page Component (`client/src/pages/daily-self-scores.tsx`)

**Purpose**: Root container for the Daily Self-Scores feature
**Key Features**:
- Gradient blue background (`bg-gradient-to-b from-blue-50 to-blue-100`)
- User authentication and data fetching
- Responsive design with mobile optimization
- Navigation back to dashboard

**Critical Code Patterns**:
```typescript
// User data fetching with fallback
const { data: user, isLoading: isLoadingUser } = useQuery({
  queryKey: ["/api/user"],
});
const userId = (user as any)?.id || 1;

// Health metrics retrieval
const { data: healthMetrics, isLoading: isLoadingMetrics } = useQuery({
  queryKey: [`/api/users/${userId}/health-metrics`],
  enabled: !!userId,
});
```

**UI Structure**:
- Header with back navigation
- Centered title section
- Main interactive component
- Educational instructions panel

### 2. Interactive Slider Component (`client/src/components/health/DailyHealthScore.tsx`)

**Purpose**: Core scoring interface with color-coded sliders
**Key Features**:
- Three health metric sliders (Diet, Exercise, Medication)
- Color-coded system: Green (#4CAF50), Blue (#2E8BC0), Red (#E53935)
- Daily submission tracking via localStorage
- State transitions: Interactive → Submitted → Reset (development)

**Slider Configuration**:
```typescript
// State management for each metric
const [medicationScore, setMedicationScore] = useState<number>(metric.medicationScore);
const [dietScore, setDietScore] = useState<number>(metric.dietScore);
const [exerciseScore, setExerciseScore] = useState<number>(metric.exerciseScore);

// Slider component with color classes
<Slider
  value={[dietScore]}
  min={1}
  max={10}
  step={1}
  onValueChange={(value) => setDietScore(value[0])}
  className="slider-green"
/>
```

**Submission Workflow**:
1. Validate slider values (1-10 range)
2. Submit to API endpoints (both primary and legacy tables)
3. Store submission timestamp in localStorage
4. Trigger MCP feature usage tracking
5. Initialize Supervisor Agent analysis dialog

### 3. Score Discussion Dialog (`client/src/components/health/ScoreDiscussionDialog.tsx`)

**Purpose**: Gateway between score submission and AI analysis
**Key Features**:
- Modal confirmation for AI analysis
- Data preparation for Supervisor Agent
- Seamless transition to health analysis interface

**Analysis Data Structure**:
```typescript
const healthAnalysisData = {
  dietScore,
  exerciseScore,
  medicationScore,
  date: new Date().toISOString(),
  analysisType: 'comprehensive',
  userId,
  triggerSource: 'daily-self-scores',
  cpds: userCPDs || []
};
```

### 4. Health Analysis Dialog (`client/src/components/health/HealthAnalysisDialog.tsx`)

**Purpose**: Comprehensive AI analysis interface with CBT/MI integration
**Key Features**:
- Loading state with educational content
- Overall health status calculation
- Individual score breakdown with visual feedback
- Integrated Supervisor Agent chat interface
- Personalized recommendations based on therapeutic principles

**CBT/MI Integration Points**:
```typescript
// Recommendation generation with therapeutic context
if (dietScore < 6) {
  recommendations.push({
    category: 'nutrition',
    message: 'Consider using the Inspiration Machine D feature...',
    feature: 'inspiration-d',
    priority: 'high',
    cbtTechnique: 'behavioral activation',
    miApproach: 'exploring importance of nutrition goals'
  });
}
```

**Therapeutic Question Framework**:
- Pattern recognition questions
- Manageable focus identification
- Past success exploration
- Importance and confidence scaling

### 5. Supervisor Agent Integration (`client/src/components/chatbot/SupervisorAgent.tsx`)

**Purpose**: AI-powered chat interface with healthcare-specific prompting
**Key Features**:
- Multi-provider AI system (OpenAI + Anthropic)
- CBT/MI therapeutic techniques
- Feature recommendation engine
- Voice interaction capabilities
- Healthcare compliance monitoring

**System Prompt Structure**:
```typescript
const systemPrompt = `You are KGC (Keep Going Care), a personal health assistant.
Your role is to help users improve health metrics and meet health goals.
Provide professional, concise responses in Australian English without colloquialisms.
Never diagnose medical conditions or provide specific medical advice.
Refer users to healthcare providers when appropriate.
Address the patient by name (e.g., "Bill") occasionally in your responses.

AVAILABLE FEATURES (ONLY RECOMMEND THESE):
1. Home - Main dashboard with easy access buttons
2. Daily Self-Scores - Recording health adherence with reward system
3. Motivational Image Processing (MIP) - Upload and enhance motivational images
...
[Complete feature list provided]
`;
```

## CSS Styling Implementation

### Color-Coded Slider Styles
```css
/* Green slider for nutrition */
.slider-green [data-orientation="horizontal"] {
  height: 0.5rem;
  background-color: #ddd;
  border-radius: 9999px;
}

.slider-green [role="slider"] {
  height: 1.15rem;
  width: 1.15rem;
  background-color: #4CAF50;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

### Metallic Blue Branding
```css
.metallic-blue {
  background: linear-gradient(160deg, #2E8BC0 0%, #1c5880 50%, #2E8BC0 100%);
  border: 2px solid #17a092;
  box-shadow: 
    inset 0 1px 3px rgba(255, 255, 255, 0.5),
    inset 0 -1px 3px rgba(0, 0, 0, 0.3),
    0 2px 5px rgba(0, 0, 0, 0.2);
}
```

## Database Integration Strategy

### Primary Data Table (patientScores)
```sql
-- Authoritative daily submissions
CREATE TABLE patient_scores (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  score_date DATE NOT NULL,
  diet_score INTEGER CHECK (diet_score >= 1 AND diet_score <= 10),
  exercise_score INTEGER CHECK (exercise_score >= 1 AND exercise_score <= 10),
  medication_score INTEGER CHECK (medication_score >= 1 AND medication_score <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(patient_id, score_date)
);
```

### Legacy Data Table (healthMetrics)
```sql
-- Backward compatibility and real-time tracking
CREATE TABLE health_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  diet_score DECIMAL(3,2),
  exercise_score DECIMAL(3,2),
  medication_score DECIMAL(3,2),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints Required

### Score Submission
```typescript
POST /api/users/{userId}/health-metrics
Body: {
  medicationScore: number,
  dietScore: number,
  exerciseScore: number,
  date: Date
}
```

### Care Plan Directives Retrieval
```typescript
GET /api/users/{userId}/care-plan-directives
Response: CPD[]
```

### MCP Feature Tracking
```typescript
POST /api/mcp/feature-usage
Body: {
  userId: number,
  feature: string,
  timestamp: Date
}
```

## Supervisor Agent Workflow Details

### 1. Pre-Analysis Phase
- Collect submitted scores
- Retrieve user's Care Plan Directives
- Prepare therapeutic context
- Store analysis data in localStorage

### 2. Analysis Processing
- Calculate overall health score
- Generate health status classification
- Create personalized recommendations
- Apply CBT/MI therapeutic frameworks

### 3. Recommendation Engine
```typescript
const generateRecommendations = (scores, cpds) => {
  const recommendations = [];
  
  // Score-based feature recommendations
  if (scores.dietScore < 6) {
    recommendations.push({
      feature: 'inspiration-d',
      message: 'Meal planning support could help improve nutrition scores',
      priority: 'high',
      cbtTechnique: 'behavioral activation',
      miApproach: 'exploring importance'
    });
  }
  
  // Positive reinforcement for high scores
  if (scores.overallScore >= 7) {
    recommendations.push({
      feature: 'progress-milestones',
      message: 'Check rewards earned for consistent health efforts',
      priority: 'low',
      cbtTechnique: 'positive reinforcement'
    });
  }
  
  return recommendations;
};
```

### 4. Therapeutic Communication
- Motivational Interviewing techniques for behavior change
- Cognitive Behavioral Therapy for thought pattern recognition
- Strengths-based approach for building confidence
- Goal-setting support aligned with Care Plan Directives

## Mobile Responsiveness

### Breakpoint Strategy
```typescript
// Mobile detection hook
const isMobile = useIsMobile();

// Conditional styling
className={cn("font-medium", isMobile ? "w-44" : "w-56")}
```

### Touch Optimization
- Larger slider handles for touch interaction
- Haptic feedback on score submission
- Simplified navigation for mobile users
- Voice input capabilities via Web Speech API

## Quality Assurance Checklist

### Functional Requirements
- [ ] Sliders respond correctly to touch/mouse input
- [ ] Daily submission constraint enforced via localStorage
- [ ] Color coding matches design specifications
- [ ] API calls handle errors gracefully
- [ ] Supervisor Agent initializes with correct context

### Therapeutic Compliance
- [ ] CBT techniques properly implemented
- [ ] Motivational Interviewing principles followed
- [ ] Non-diagnostic language maintained
- [ ] Healthcare provider referral recommendations included

### Data Integrity
- [ ] Scores persist to both primary and legacy tables
- [ ] MCP feature usage tracking functions correctly
- [ ] Care Plan Directives properly retrieved and contextualized
- [ ] Analysis results stored for future reference

### User Experience
- [ ] Loading states provide clear feedback
- [ ] Error handling maintains user confidence
- [ ] Navigation flows logically between components
- [ ] Responsive design works across device sizes

## Implementation Priority for AI Agents

### High Priority (Core Functionality)
1. Interactive slider component with color coding
2. Score submission and data persistence
3. Daily submission constraint enforcement
4. Basic Supervisor Agent integration

### Medium Priority (Enhanced Experience)
1. Health Analysis Dialog with comprehensive UI
2. CBT/MI recommendation generation
3. Care Plan Directives integration
4. Mobile responsiveness optimization

### Low Priority (Advanced Features)
1. Voice interaction capabilities
2. Haptic feedback implementation
3. Advanced therapeutic question frameworks
4. Real-time collaboration with doctor dashboard

## Testing Strategy

### Unit Tests
- Slider value validation (1-10 range)
- Submission constraint logic
- Recommendation generation algorithms
- Therapeutic message formatting

### Integration Tests
- API endpoint connectivity
- Database transaction integrity
- MCP feature tracking accuracy
- Supervisor Agent response quality

### User Acceptance Tests
- Complete submission workflow
- AI analysis accuracy and helpfulness
- Mobile device functionality
- Therapeutic approach effectiveness

This comprehensive guide provides your AI agents with all necessary technical details to implement the Daily Self-Scores feature exactly as designed in the KGC system, maintaining healthcare compliance, therapeutic principles, and optimal user experience.