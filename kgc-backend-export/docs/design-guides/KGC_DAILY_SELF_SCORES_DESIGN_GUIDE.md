
# KGC Daily Self-Scores Feature - Complete Design & UX Guide

## Overview
The Daily Self-Scores feature is a core component of the Keep Going Care (KGC) system that allows patients to rate their daily health adherence on three key metrics using interactive sliders. This guide provides exact specifications for replicating the UI/UX and Supervisor Agent behavior.

## Feature Architecture

### Core Components
1. **Daily Self-Scores Page** (`/daily-self-scores`)
2. **DailyHealthScore Component** (Interactive sliders)
3. **ScoreDiscussionDialog** (Post-submission interaction)
4. **SupervisorAgent Integration** (AI-powered follow-up)

## UI/UX Design Specifications

### Page Layout Structure

```typescript
// Main container with gradient background
<div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
  <div className="max-w-2xl mx-auto">
    {/* Header with back navigation */}
    {/* Page title and description */}
    {/* DailyHealthScore component */}
    {/* Instructions panel */}
  </div>
</div>
```

### Color Palette
- **Background**: Gradient from `blue-50` to `blue-100`
- **Primary Blue**: `#2E8BC0` (metallic blue for buttons)
- **Health Metric Colors**:
  - Diet/Nutrition: `#4CAF50` (green)
  - Exercise/Wellness: `#2E8BC0` (blue)
  - Medication: `#E53935` (red)

### Typography
- **Page Title**: `text-3xl font-bold text-blue-800`
- **Descriptions**: `text-gray-600`
- **Metric Labels**: `font-medium`
- **Score Values**: `font-medium` with metric-specific colors

### Interactive Slider Design

#### Slider Configuration
```typescript
// Each slider configuration
<Slider
  value={[scoreValue]}
  min={1}
  max={10}
  step={1}
  onValueChange={(value) => setScore(value[0])}
  className="slider-{color}" // slider-green, slider-blue, slider-red
/>
```

#### Slider Visual Elements
- **Track**: Full width with gray background (`bg-gray-200`)
- **Fill**: Colored based on metric type
- **Thumb**: Interactive handle with hover effects
- **Number Scale**: 1-10 displayed below each slider
- **Real-time Value**: Large colored number showing current value

### Card Design
```typescript
// Main card container
<Card>
  <CardContent className="p-6 md:p-4"> // Responsive padding
    {/* Card content */}
  </CardContent>
</Card>
```

## Health Metrics Specifications

### 1. Healthy Meal Plan (Diet Score)
- **Color**: Green (`#4CAF50`)
- **Label**: "Healthy Meal Plan"
- **Description**: Rate how well you followed your nutrition goals today
- **CSS Class**: `slider-green`

### 2. Exercise and Wellness
- **Color**: Blue (`#2E8BC0`)
- **Label**: "Exercise and Wellness"
- **Description**: Rate your physical activity and wellness practices
- **CSS Class**: `slider-blue`

### 3. Prescription Medication
- **Color**: Red (`#E53935`)
- **Label**: "Prescription Medication"
- **Description**: Rate your adherence to prescribed medications
- **CSS Class**: `slider-red`

## User Interaction Flow

### Phase 1: Initial State (Not Submitted)
```typescript
// Interactive sliders with live updates
{!isSubmitted ? (
  <div className="space-y-5">
    {/* Three interactive sliders */}
    <Button 
      onClick={handleSubmit}
      className="bg-[#2E8BC0] hover:bg-[#267cad] w-full md:w-auto"
    >
      Submit Daily Scores
    </Button>
  </div>
) : (
  // Read-only view
)}
```

### Phase 2: Submitted State (Read-Only)
```typescript
// Progress bars showing submitted scores
<div className="flex items-center gap-2">
  <span className="font-medium w-56">Healthy Meal Plan</span>
  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
    <div 
      className="h-full rounded-full" 
      style={{ width: `${(score / 10) * 100}%`, backgroundColor: '#4CAF50' }}
    ></div>
  </div>
  <span className="font-medium w-6 text-right text-green-600">{score}</span>
</div>
```

## Supervisor Agent Integration

### Automatic Trigger After Submission
```typescript
// In DailyHealthScore component after successful submission
try {
  // Submit scores to API
  await apiRequest('POST', `/api/users/${userId}/health-metrics`, scoreData);
  
  // Save to localStorage for chatbot access
  localStorage.setItem('lastHealthMetrics', JSON.stringify({
    medicationScore,
    dietScore,
    exerciseScore,
    date: new Date().toISOString().split('T')[0]
  }));
  
  // Record feature usage in MCP system
  ModelContextProtocol.getInstance(userId).recordFeatureUsage('health-metrics');
  
  // Trigger discussion dialog after 1 second
  setTimeout(() => {
    setShowDiscussionDialog(true);
  }, 1000);
} catch (error) {
  // Error handling
}
```

### Score Discussion Dialog
```typescript
// ScoreDiscussionDialog component structure
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <BarChart className="h-5 w-5 text-blue-600" />
        Great job submitting your daily scores!
      </DialogTitle>
      <DialogDescription>
        Your scores have been saved successfully. Would you like to discuss your progress with KGC?
      </DialogDescription>
    </DialogHeader>
    
    {/* Score summary display */}
    <div className="space-y-3 py-4">
      <ScoreSummaryItem label="Diet" score={dietScore} color="green" />
      <ScoreSummaryItem label="Exercise" score={exerciseScore} color="blue" />
      <ScoreSummaryItem label="Medication" score={medicationScore} color="red" />
    </div>
    
    {/* Action buttons */}
    <DialogFooter className="flex flex-col gap-2 sm:flex-row">
      <Button onClick={onCancel} variant="outline" className="w-full sm:w-auto">
        Not now
      </Button>
      <Button onClick={onConfirm} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
        Let's discuss with KGC
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### SupervisorAgent Response Logic

#### Automatic Message Generation
```typescript
// In ScoreDiscussionDialog when user confirms discussion
const handleConfirm = () => {
  // Navigate to chatbot
  setLocation('/enhanced-chatbot');
  
  // Set up automatic message after navigation
  setTimeout(() => {
    if (window.__KGC_SUPERVISOR_AGENT__) {
      const analysisMessage = generateScoreAnalysisMessage(
        dietScore, 
        exerciseScore, 
        medicationScore
      );
      
      window.__KGC_SUPERVISOR_AGENT__.addMessage({
        id: Date.now(),
        text: analysisMessage,
        isUser: false,
        timestamp: new Date()
      });
    }
  }, 1500);
};
```

#### Score Analysis Message Generation
```typescript
function generateScoreAnalysisMessage(diet: number, exercise: number, medication: number): string {
  const averageScore = Math.round((diet + exercise + medication) / 3);
  const highestScore = Math.max(diet, exercise, medication);
  const lowestScore = Math.min(diet, exercise, medication);
  
  let message = `Thanks for submitting your daily scores! I can see you rated yourself:\n\n`;
  message += `🥗 Diet: ${diet}/10\n`;
  message += `💪 Exercise: ${exercise}/10\n`;
  message += `💊 Medication: ${medication}/10\n\n`;
  
  // Personalized analysis based on scores
  if (averageScore >= 8) {
    message += `Excellent work! Your average score of ${averageScore}/10 shows you're doing really well with your health goals. `;
  } else if (averageScore >= 6) {
    message += `Good progress! Your average score of ${averageScore}/10 shows you're on the right track. `;
  } else {
    message += `I appreciate your honesty in rating yourself. An average of ${averageScore}/10 gives us a good starting point to work together. `;
  }
  
  // Identify areas for support
  const lowAreas = [];
  if (diet < 7) lowAreas.push("nutrition");
  if (exercise < 7) lowAreas.push("exercise");
  if (medication < 7) lowAreas.push("medication adherence");
  
  if (lowAreas.length > 0) {
    message += `I'd love to help you with ${lowAreas.join(' and ')}. `;
  }
  
  // Feature recommendations based on lowest scores
  if (diet === lowestScore && diet < 7) {
    message += `\n\nFor nutrition support, I recommend checking out our Inspiration Machine D for meal ideas, or Diet Logistics for grocery delivery options aligned with your care plan.`;
  }
  
  if (exercise === lowestScore && exercise < 7) {
    message += `\n\nFor exercise and wellness, our Inspiration Machine E&W has great ideas, and E&W Support can help you find local gyms and trainers.`;
  }
  
  if (medication === lowestScore && medication < 7) {
    message += `\n\nFor medication management, our MBP Wiz can help you find the best prices, and Journaling might help track your medication routine.`;
  }
  
  message += `\n\nWhat would you like to focus on today?`;
  
  return message;
}
```

### SupervisorAgent Conversation Triggers

#### Health Metric Integration
```typescript
// In SupervisorAgent component
useEffect(() => {
  // Check for recent health metrics submission
  const lastMetrics = localStorage.getItem('lastHealthMetrics');
  if (lastMetrics) {
    const metrics = JSON.parse(lastMetrics);
    const submissionDate = new Date(metrics.date);
    const today = new Date().toISOString().split('T')[0];
    
    // If submitted today and no conversation started yet
    if (metrics.date === today && !hasAddedCustomMessage) {
      const analysisMessage = generateScoreAnalysisMessage(
        metrics.dietScore,
        metrics.exerciseScore,
        metrics.medicationScore
      );
      
      setTimeout(() => {
        addAgentMessage({
          id: generateMessageId(),
          text: analysisMessage,
          isUser: false,
          timestamp: new Date()
        });
        setHasAddedCustomMessage(true);
      }, 2000);
    }
  }
}, []);
```

### Response Pattern Templates

#### High Scores (8-10)
```typescript
const highScoreResponse = `Fantastic work on your ${metricName}! A score of ${score}/10 shows real commitment to your health goals. This kind of consistency is exactly what leads to long-term success. Keep up the excellent work!`;
```

#### Medium Scores (5-7)
```typescript
const mediumScoreResponse = `A ${score}/10 for ${metricName} shows you're making progress. Let's explore what might help you feel even more confident in this area. What do you think would make the biggest difference?`;
```

#### Low Scores (1-4)
```typescript
const lowScoreResponse = `Thank you for being honest about your ${metricName} today. A ${score}/10 gives us a great starting point to work together. Remember, every small step counts, and I'm here to support you. What feels like the biggest challenge right now?`;
```

## Technical Implementation Details

### State Management
```typescript
// Component state structure
const [medicationScore, setMedicationScore] = useState<number>(metric.medicationScore);
const [dietScore, setDietScore] = useState<number>(metric.dietScore);
const [exerciseScore, setExerciseScore] = useState<number>(metric.exerciseScore);
const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
const [showDiscussionDialog, setShowDiscussionDialog] = useState<boolean>(false);
```

### API Integration
```typescript
// Submission endpoint
POST /api/users/${userId}/health-metrics
Body: {
  medicationScore: number,
  dietScore: number,
  exerciseScore: number,
  date: Date
}
```

### Local Storage Schema
```typescript
// Health metrics storage
interface StoredHealthMetrics {
  medicationScore: number;
  dietScore: number;
  exerciseScore: number;
  date: string; // ISO date string
}

// Storage key: 'lastHealthMetrics'
```

## Responsive Design

### Mobile Optimizations
- Slider touch targets: Minimum 44px
- Font sizes: Scale down appropriately
- Padding adjustments: `p-4` on mobile, `p-6` on desktop
- Button width: Full width on mobile, auto on desktop

### Breakpoint Specifications
```css
/* Tailwind breakpoints used */
sm: 640px  /* Small devices */
md: 768px  /* Medium devices */
lg: 1024px /* Large devices */
```

## Accessibility Features

### ARIA Labels
```typescript
<Slider
  aria-label={`${metricName} score from 1 to 10`}
  aria-valuemin={1}
  aria-valuemax={10}
  aria-valuenow={scoreValue}
  aria-valuetext={`${scoreValue} out of 10`}
/>
```

### Keyboard Navigation
- Sliders: Arrow keys for increment/decrement
- Form submission: Enter key support
- Focus management: Logical tab order

### Visual Indicators
- High contrast colors for score values
- Clear visual feedback for interactions
- Loading states with descriptive text

## Testing Considerations

### User Flow Testing
1. Navigate to Daily Self-Scores page
2. Interact with all three sliders
3. Submit scores
4. Verify read-only state
5. Test discussion dialog flow
6. Verify SupervisorAgent integration

### Edge Cases
- Rapid slider movements
- Network connectivity issues
- Multiple submissions per day (prevention)
- Browser refresh during submission

## Integration Points

### Model Context Protocol (MCP)
- Feature usage tracking: `recordFeatureUsage('health-metrics')`
- Recommendation generation based on scores
- Multi-AI validation for health advice

### Care Plan Directives (CPD)
- Align recommendations with doctor's guidance
- Reference patient-specific goals
- Maintain clinical context in conversations

This comprehensive guide provides all necessary specifications for replicating the Daily Self-Scores feature's exact UI/UX and SupervisorAgent behavior in any development environment.
