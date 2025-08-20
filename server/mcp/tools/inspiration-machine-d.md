# Inspiration Machine D Tool

## Description
The Inspiration Machine D tool provides personalized meal planning and recipe suggestions aligned with patient Care Plan Directives (CPDs). This tool integrates with Australian dietary guidelines and food standards to ensure culturally appropriate nutrition recommendations that support patient health goals.

## Purpose
- Generate meal ideas aligned with doctor's diet CPDs
- Support patient compliance with nutrition goals through engaging meal planning
- Provide Australian-context appropriate food suggestions
- Use Cognitive Behavioral Therapy (CBT) and Motivational Interviewing (MI) techniques to encourage healthy eating behaviors

## Prime Directive Alignment
**Target**: Help patients achieve diet self-scores of 8-10 consistently through:
- **CBT Approach**: Challenge negative thoughts about healthy eating ("I can't cook healthy meals")
- **MI Techniques**: Explore patient motivation for dietary changes and build commitment
- **CPD Compliance**: Ensure all suggestions directly support doctor's dietary directives
- **Honest Self-Assessment**: Encourage realistic scoring based on actual dietary adherence

## Input Parameters

### Required
- `userId` (number): The patient's unique identifier
- `action` (string): The specific action to perform
  - `"get_ideas"` - Generate meal ideas aligned with CPDs
  - `"search_recipes"` - Search for specific recipes
  - `"analyze_adherence"` - Analyze diet adherence to CPDs
  - `"motivational_prompt"` - Generate motivational content for diet goals

### Optional
- `mealType` (string): "breakfast", "lunch", "dinner", "snack"
- `preferences` (object): Dietary preferences and restrictions
- `currentScore` (number): Patient's current diet self-score (1-10)
- `challengeArea` (string): Specific dietary challenge patient is facing
- `motivationLevel` (string): "high", "medium", "low" - patient's current motivation

## Output Format

### Meal Ideas Response
```json
{
  "mealIdeas": [
    {
      "title": "Mediterranean Salmon Bowl",
      "description": "Heart-healthy omega-3 rich meal aligned with your low-sodium directive",
      "cpdAlignment": "Supports your doctor's directive: 'Reduce sodium intake to <2300mg daily'",
      "ingredients": ["salmon fillet", "quinoa", "cucumber", "tomatoes", "olive oil"],
      "nutritionHighlights": ["Low sodium", "High protein", "Omega-3 fatty acids"],
      "preparationTime": "25 minutes",
      "difficultyLevel": "Easy"
    }
  ],
  "cbtInsights": [
    "Notice how colorful, nutritious meals can be both satisfying and delicious",
    "Challenge the thought: 'Healthy food is boring' - try this flavorful Mediterranean approach"
  ],
  "motivationalPrompts": [
    "Each healthy meal choice moves you closer to your 8+ diet score goal",
    "Your doctor believes in your ability to make these positive changes"
  ],
  "adherenceSupport": {
    "currentCPDFocus": "Low sodium diet for blood pressure management",
    "practicalTips": ["Use herbs instead of salt", "Read food labels for hidden sodium"],
    "progressTracking": "Rate today's meals 1-10 based on CPD adherence"
  }
}
```

### Recipe Search Response
```json
{
  "recipes": [
    {
      "title": "Quick Diabetic-Friendly Stir Fry",
      "cpdAlignment": "Perfect for your blood sugar management directive",
      "ingredients": ["lean beef", "broccoli", "bell peppers", "brown rice"],
      "instructions": ["Step 1: Heat oil in wok...", "Step 2: Add protein..."],
      "nutritionFacts": {
        "carbohydrates": "25g",
        "protein": "30g",
        "fiber": "8g",
        "estimatedBloodSugarImpact": "Low"
      },
      "scoringGuidance": "Rate 8-10 if this replaces a high-carb meal option"
    }
  ],
  "behaviorChangeSupport": {
    "miTechnique": "On a scale of 1-10, how confident are you about preparing this meal?",
    "barrierAddressing": "If cooking time is a concern, prep vegetables Sunday for the week",
    "motivationBuilding": "Each home-cooked meal demonstrates commitment to your health goals"
  }
}
```

### Adherence Analysis Response
```json
{
  "adherenceAnalysis": {
    "currentScore": 6,
    "scoreJustification": "Good progress with breakfast and lunch, dinner choices need improvement",
    "cpdCompliance": {
      "strengths": ["Consistent low-sodium breakfast choices", "Improved portion control"],
      "improvementAreas": ["Evening snacking", "Weekend meal planning"]
    },
    "honestScoringEncouragement": "Your 6/10 score shows honest self-assessment - this awareness is the first step to improvement"
  },
  "cbtInterventions": [
    "Challenge: 'I failed because I had pizza Friday night'",
    "Reframe: 'I made healthy choices 6 days this week and can learn from Friday'"
  ],
  "motivationalInterviewing": {
    "explorationQuestions": [
      "What motivated you to choose healthier options for breakfast this week?",
      "How did you feel after making those positive choices?"
    ],
    "changeCommitment": "What one small change could help you move from 6 to 7 next week?"
  }
}
```

## KGC-Specific Behaviors

### CBT Integration
- **Thought Challenging**: Address common negative thoughts about healthy eating
- **Behavioral Experiments**: Suggest trying one new healthy recipe per week
- **Cognitive Restructuring**: Help patients reframe "failures" as learning opportunities
- **Goal Setting**: Break down CPD compliance into achievable daily actions

### Motivational Interviewing Techniques
- **Open-ended Questions**: "What aspects of meal planning feel most challenging?"
- **Affirmations**: Recognize patient efforts and strengths in dietary choices
- **Reflective Listening**: Acknowledge patient ambivalence about dietary changes
- **Summarizing**: Highlight patient's own motivations for healthy eating

### Australian Context
- **Local Ingredients**: Emphasize Australian-grown produce and seasonal foods
- **Cultural Sensitivity**: Accommodate multicultural dietary preferences common in Australia
- **Food Standards**: Align with Australian Dietary Guidelines and Heart Foundation recommendations
- **Local Resources**: Reference Australian food databases and nutrition information

### CPD Alignment
- **Direct Integration**: Every suggestion explicitly connects to active diet CPDs
- **Progress Tracking**: Help patients understand how food choices impact CPD compliance
- **Doctor Communication**: Generate summaries for doctor review of patient dietary progress
- **Realistic Goals**: Set achievable targets that support 8-10 self-scoring

## Emergency Detection
The tool monitors for concerning dietary patterns:
- Extremely restrictive eating behaviors
- Binge eating episodes mentioned in patient queries
- References to using food for emotional regulation
- Mentions of skipping medications due to food-related side effects

When detected, the tool provides immediate support resources and flags for healthcare provider review.

## Usage Examples

### Generate Dinner Ideas for Diabetic Patient
```
Patient has diabetes management CPD and scored 5/10 for diet yesterday. They mentioned struggling with dinner preparation after work. Generate motivating dinner ideas that support blood sugar control.
```

### Address Emotional Eating Challenges
```
Patient reports stress eating affecting their diet scores. Use MI techniques to explore their relationship with food and provide CBT-based coping strategies aligned with their weight management CPD.
```

### Weekend Meal Planning Support
```
Patient consistently scores well weekdays but struggles weekends. Generate meal prep ideas and address all-or-nothing thinking patterns about healthy eating.
```

## Related Tools
- `health-metrics` - For diet score trends and analysis
- `care-plan-directives` - For active diet CPDs and goals
- `food-database` - For nutritional information and ingredient alternatives
- `progress-milestones` - For celebrating dietary achievements
- `journaling` - For exploring emotional connections to food choices

## Compliance Notes
- All meal suggestions reviewed for alignment with Australian Dietary Guidelines
- Cultural dietary preferences accommodated within CPD parameters
- Patient autonomy respected while providing structured support
- Emergency eating disorder protocols integrated
- Progress tracking supports healthcare provider oversight