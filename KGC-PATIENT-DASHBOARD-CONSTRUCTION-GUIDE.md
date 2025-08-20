# KGC Patient Dashboard - Complete Construction Guide

## Overview
The KGC Patient Dashboard is the heart of the Keep Going Care platform, designed as a unified healthcare interface that integrates AI-powered support with TGA-compliant medical guidance. This dashboard serves as the primary interaction point between patients and the KGC Supervisor Agent, focusing on CPD compliance and honest self-scoring through Cognitive Behavioral Therapy (CBT) and Motivational Interviewing (MI) techniques.

## Architecture Foundation

### Model Context Protocol (MCP) Integration
The dashboard operates on a True MCP Architecture where:
- **Server-side Tools**: All KGC features (`health-metrics`, `inspiration-machine-d`, `mbp-wizard`, `food-database`, `ew-support`, `progress-milestones`, `care-plan-directives`, `journaling`, `motivational-imaging`) function as MCP tools
- **Client-side Host Agent**: Coordinates tool interactions and provides enhanced patient experience
- **Prime Directive**: Ensures patients consistently comply with CPDs and honestly self-score 8-10

### Core Components Hierarchy
```
PatientDashboard.tsx (MCP-powered interface)
├── dashboard.tsx (Main visual interface)
├── enhanced-chatbot.tsx (Supervisor Agent interface)
├── daily-self-scores.tsx (Primary scoring system)
├── progress-milestones.tsx (Achievement tracking)
└── MCP Tools Integration (9 specialized health tools)
```

## Visual Design & Layout

### Color Palette & Metallic Blue Branding
**Primary Metallic Blue Gradient:**
```css
.metallic-blue {
  background: linear-gradient(165deg, #2E8BC0 0%, #145DA0 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.metallic-blue:hover {
  background: linear-gradient(165deg, #3399CC 0%, #1466B3 100%);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), inset 0 2px 3px rgba(255, 255, 255, 0.3);
}
```

**Health Metric Colors:**
- Medication: `--medication: 0 87% 62%` (Red spectrum)
- Diet: `--diet: 122 67% 45%` (Green spectrum)
- Exercise: `--exercise: 291 77% 30%` (Purple spectrum)

**Background & Layout:**
- Base background: `bg-gray-50` (Light gray for professional medical appearance)
- Card backgrounds: White with subtle shadows
- Text: `text-foreground` (Automatically adjusts for accessibility)

### Responsive Layout Structure

#### Desktop Layout (lg:col-span-3 grid)
```
┌─────────────────────────────────────┬─────────────────┐
│                                     │                 │
│         Health Images Carousel      │   Action        │
│         (2/3 width)                 │   Buttons       │
│                                     │   (1/3 width)   │
│         h-[400px] to h-[500px]      │                 │
│                                     │   • Chat        │
│                                     │   • Keep Going  │
│                                     │   • Daily Scores│
└─────────────────────────────────────┴─────────────────┘
```

#### Mobile Layout (Floating Buttons)
```
┌─────────────────────────────────────┐
│                                     │
│         Health Images Carousel      │
│         (Full width)                │
│         h-80 to h-96                │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
                    │
           Fixed Bottom Buttons:
           ┌─────────┬─────────┐
           │  Chat   │ Keep    │
           │         │ Going   │
           └─────────┴─────────┘
           ┌───────────────────┐
           │   Daily Scores    │
           └───────────────────┘
```

### Button Design & Interactions

#### Primary Action Buttons
**Specifications:**
- Height: `h-16 sm:h-18 md:h-20` (Desktop), `h-24` (Mobile)
- Styling: Metallic blue gradient with shadow effects
- Typography: `text-sm sm:text-base md:text-lg font-semibold`
- Icons: Lucide React icons (MessageCircle, BarChart, custom Keep Going icon)
- Hover Effect: `hover:scale-105` with enhanced gradient

#### Enhanced Vibration Animation
**KGC Gong Sound Integration:**
- 110Hz therapeutic gong sound (2-3 seconds duration)
- Web Audio API with harmonics for enhanced experience
- Triggers on button press with haptic feedback

**Visual Vibration Effect:**
```css
@keyframes vibrate {
  0% { transform: translate(0) scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
  5% { transform: translate(-5px, 5px) scale(1.05) rotate(-1deg); box-shadow: 0 0 10px rgba(0,0,0,0.3); }
  /* ... progressive intensity through 100% ... */
  100% { transform: translate(0) scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); }
}
```

## Supervisor Agent Integration

### Patient-Chatbot Interaction Flow

#### 1. Patient Context Loading
```typescript
const patientContext = await this.loadPatientContext(patientId);
// Includes: Patient details, CPDs, health metrics, progress milestones
```

#### 2. Emergency Detection System
```typescript
const emergencyDetected = await this.detectEmergency(message);
// Safety keywords monitoring across all AI tools
// Immediate healthcare team alerts if triggered
```

#### 3. Privacy Protection Layer
```typescript
const { anonymizedText, sessionId } = this.privacyAgent.anonymize(message);
// PII anonymization before external AI processing
// Custom name mapping for personalized responses
```

#### 4. KGC System Prompts
**British English Medical Guidance:**
- TGA Class I SaMD compliance
- Non-diagnostic educational advice
- CBT and MI technique integration
- CPD alignment focus

#### 5. Real-time CPD Compliance Analysis
```typescript
const cpdCompliance = await this.analyzeCPDCompliance(patientId);
// Returns: { diet: 82.4%, exercise: 81.8%, medication: 90.6% }
```

### Doctor Dashboard Integration

#### CPD Creation & Management
**Doctor Interface Features:**
- Real-time CPD editing with patient dashboard synchronization
- Patient progress monitoring through PPR generation
- Milestone achievement notifications
- Emergency alert system

#### Patient Progress Report (PPR) Generation
**Automated Analysis:**
- Weekly/monthly health metric trends
- Feature usage patterns
- CPD compliance scoring
- Milestone achievements
- Personalized recommendations

## Core Dashboard Features

### 1. MCP Query Interface
**Location:** Top card in patient dashboard
**Function:** Direct communication with Supervisor Agent
**Features:**
- Natural language health queries
- Real-time MCP tool coordination
- Personalized CBT/MI responses
- Feature recommendations

**Example Queries:**
- "How can I improve my diet scores?"
- "What meals align with my care plan?"
- "How am I progressing with my medication adherence?"

### 2. Quick Actions Grid (2x2 on desktop, responsive on mobile)
**Four Primary Actions:**
- **Daily Scores**: Health metrics submission with motivational prompts
- **Meal Ideas**: CPD-aligned nutrition through Inspiration Machine D
- **Medication**: MBP Wizard for adherence support
- **Progress**: Milestone tracking and reward system

### 3. Health Metrics Overview
**Real-time Display:**
- Current medication score (0-10 scale)
- Diet compliance percentage
- Exercise adherence tracking
- Progress bar visualizations
- Color-coded performance indicators

### 4. Motivational Image Carousel
**Enhanced Image Store Integration:**
- Patient-uploaded motivational images
- Professional health photography
- Dynamic carousel rotation
- Gentle glow animation effects
- SessionStorage and database synchronization

## Technical Implementation Details

### State Management
```typescript
const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
const [userQuery, setUserQuery] = useState('');
```

### MCP Host Integration
```typescript
const {
  isConnected,
  isInitialized,
  availableTools,
  processPatientQuery,
  getHealthMetrics,
  callTool
} = useMCPHost(userId);
```

### Data Flow
1. **Load Dashboard Data**: Multiple MCP tools gather comprehensive patient information
2. **Process Patient Queries**: Supervisor Agent coordination with MCP architecture
3. **Update Real-time**: CPD compliance, health metrics, milestone progress
4. **Track Feature Usage**: Analytics for PPR generation

### Authentication & Security
- Email-based authentication system
- Role-based access control (RBAC)
- Patient identity verification
- Healthcare data anonymization
- TGA compliance audit logging

## User Experience Flow

### Daily Patient Interaction
1. **Landing**: Personalized welcome with patient name and current health status
2. **Visual Engagement**: Motivational image carousel with health-focused content
3. **Quick Access**: Three primary action buttons for immediate health support
4. **Conversational Interface**: Natural language interaction with Supervisor Agent
5. **Progress Tracking**: Real-time milestone updates and achievement recognition

### Supervisor Agent Response Patterns
**CBT Integration:**
- Cognitive restructuring for health behavior changes
- Thought challenging for negative health beliefs
- Behavioral activation for exercise and nutrition

**MI Techniques:**
- Open-ended questions about health goals
- Reflective listening in AI responses
- Change talk encouragement
- Motivation enhancement for CPD compliance

### Doctor-Patient Connection
**Real-time Synchronization:**
- CPD updates immediately reflect in patient dashboard
- Doctor modifications trigger patient notifications
- Progress milestones alert healthcare teams
- Emergency detection system engages medical professionals

## Performance & Accessibility

### Optimization Features
- Responsive design for mobile-first healthcare access
- Progressive Web App (PWA) functionality
- Offline capability for basic features
- Fast loading with efficient caching strategies

### Accessibility Compliance
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader optimization
- High contrast color schemes
- Large touch targets for mobile users

### Healthcare-Specific UX
- Clear visual hierarchy for medical information
- Consistent iconography for health concepts
- Professional color palette for medical trust
- Intuitive navigation for diverse patient populations

## Integration Points

### External Services
- **OpenAI GPT-4o**: Primary AI responses
- **Anthropic Claude 3.7 Sonnet**: Secondary AI provider
- **Twilio**: SMS verification and notifications
- **SendGrid**: Email communications
- **Neon Database**: PostgreSQL data persistence

### Internal Services
- **Privacy Protection Agent**: PII anonymization
- **Badge Service**: Achievement system
- **PPR Service**: Progress report generation
- **Alert Monitor**: Patient engagement tracking

## Deployment Considerations

### Cloud Architecture
- **Google Cloud Run**: Containerized deployment
- **AWS App Runner**: Alternative deployment option
- **HIPAA Compliance**: Healthcare data protection
- **TGA Regulations**: Australian medical device compliance

### Scalability Design
- Unlimited UIN format (KGC-PAT-001, etc.)
- Database optimization for millions of users
- Efficient caching strategies
- Load balancing for high availability

This comprehensive guide provides the exact framework for replicating the KGC Patient Dashboard's sophisticated healthcare interface, ensuring both technical excellence and regulatory compliance while maintaining the highest standards of patient care and user experience.