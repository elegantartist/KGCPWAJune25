# Progress Milestones Feature - Complete UI/UX Documentation
## For Jules Gemini and Amazon Q Implementation Teams

### Table of Contents
1. [Feature Overview](#feature-overview)
2. [Achievement Badge System](#achievement-badge-system)
3. [Data Integration Requirements](#data-integration-requirements)
4. [UI Component Structure](#ui-component-structure)
5. [Supervisor Agent Integration](#supervisor-agent-integration)
6. [Award Ceremony Workflow](#award-ceremony-workflow)
7. [Visual Design Specifications](#visual-design-specifications)
8. [Complete Code Implementation](#complete-code-implementation)

---

## Feature Overview

### Purpose
The Progress Milestones feature displays patient achievement badges earned through consistent daily self-scoring behavior. It serves as a powerful motivational tool that gamifies health tracking and provides visual feedback on patient progress toward health goals established in their Care Plan Directives (CPDs).

### Core Functionality
- **Real-time Badge Display**: Shows earned badges based on actual patient score data
- **Progress Tracking**: Visual progress bars toward next achievement levels
- **Award Ceremony**: Full-screen badge presentation when achievements are unlocked
- **Supervisor Agent Integration**: AI uses badge progress in therapeutic conversations
- **$100 Reward System**: Platinum tier completion triggers financial incentive

---

## Achievement Badge System

### Badge Categories (3 Types)
1. **Exercise & Wellness** (Physical Health scores)
2. **Meal Planning** (Nutrition scores) 
3. **Medication Adherence** (Mental Health scores)

### Badge Levels (4 Tiers)
1. **Bronze**: 2 consecutive weeks of 5-10 daily scores
2. **Silver**: 4 consecutive weeks of 7-10 daily scores  
3. **Gold**: 16 consecutive weeks of 8-10 daily scores
4. **Platinum**: 24 consecutive weeks of 9-10 daily scores

### Badge Visual Design
```tsx
// Badge Base Colors by Category
const badgeBaseColors = {
  exercise: "#4CAF50",    // Green - Physical Health
  meal: "#2196F3",        // Blue - Nutrition  
  medication: "#FF9800"   // Orange - Mental Health/Medication
};

// Badge Ring Colors by Level
const badgeRingColors = {
  bronze: "#CD7F32",      // Bronze metallic
  silver: "#C0C0C0",      // Silver metallic
  gold: "#FFD700",        // Gold metallic
  platinum: "#E5E4E2"     // Platinum metallic
};
```

### Badge Calculation Logic
```typescript
interface BadgeCriteria {
  weeks: number;      // Consecutive weeks required
  minScore: number;   // Minimum daily score (1-10 scale)
}

const badgeCriteria = {
  bronze: { weeks: 2, minScore: 5 },
  silver: { weeks: 4, minScore: 7 },
  gold: { weeks: 16, minScore: 8 },
  platinum: { weeks: 24, minScore: 9 }
};
```

---

## Data Integration Requirements

### Primary Data Sources
1. **Patient Scores Table**: Daily self-scores (physicalHealth, mentalHealth, nutritionHealth)
2. **Patient Badges Table**: Earned achievements with timestamps
3. **Care Plan Directives**: Doctor-created health goals and targets

### Real-time Badge Calculation
- Analyzes patient's daily self-score history
- Calculates consecutive weeks meeting criteria
- Triggers badge awards when thresholds are met
- Updates progress percentages toward next levels

### Badge Progress Calculation
```typescript
interface BadgeProgress {
  type: 'exercise' | 'meal' | 'medication';
  currentLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  nextLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;        // 0-100 percentage
  weeksCompleted: number;  // Consecutive weeks with qualifying scores
  weeksRequired: number;   // Total weeks needed for next level
}
```

---

## UI Component Structure

### Main Layout
```tsx
<div className="space-y-6">
  {/* Page Header with $100 Reward Button */}
  <div className="flex flex-col items-center justify-center mb-6">
    <h1 className="text-2xl font-bold text-[#2E8BC0] mb-4">Progress Milestones</h1>
    
    <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md">
      <span className="text-lg">Earn $100</span>
      <Gift className="h-5 w-5 ml-2" />
    </Button>
  </div>

  {/* Achievement Badges Display */}
  <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
    <CardHeader>
      <CardTitle className="text-[#676767] flex items-center">
        <Crown className="w-6 h-6 text-[#2E8BC0] mr-2" />
        Achievement Badges
      </CardTitle>
      <CardDescription className="text-[#a4a4a4]">
        Badges earned for consistently maintaining good health habits
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      {/* Badge Collection Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {badges.map((badge) => (
          <AchievementBadge 
            key={`${badge.type}-${badge.level}`}
            badge={badge}
            size="lg"
            onClick={() => showBadgeDetails(badge)}
          />
        ))}
      </div>

      {/* Badge Progress Tabs */}
      <Tabs defaultValue="exercise">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="exercise">Exercise</TabsTrigger>
          <TabsTrigger value="meal">Meal Planning</TabsTrigger>
          <TabsTrigger value="medication">Medication</TabsTrigger>
        </TabsList>
        
        {/* Progress Cards for Each Category */}
        <TabsContent value="exercise">
          <BadgeProgressCard 
            type="exercise"
            title="Exercise Champion"
            description="Consistently maintain your exercise self-scores"
            currentLevel={getHighestBadgeLevel('exercise')}
            nextLevel={getNextBadgeLevel('exercise')}
            progress={getProgressPercentage('exercise')}
            weeksCompleted={getWeeksCompleted('exercise')}
            weeksRequired={getWeeksRequired('exercise')}
          />
        </TabsContent>
        
        {/* Similar for meal and medication tabs */}
      </Tabs>
    </CardContent>
  </Card>
</div>
```

### Badge Progress Card Component
```tsx
interface BadgeProgressCardProps {
  type: 'exercise' | 'meal' | 'medication';
  title: string;
  description: string;
  currentLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  nextLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  weeksCompleted: number;
  weeksRequired: number;
}

function BadgeProgressCard({ 
  type, title, description, currentLevel, nextLevel, 
  progress, weeksCompleted, weeksRequired 
}: BadgeProgressCardProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      {/* Header with Icon */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center`}
             style={{ backgroundColor: badgeBaseColors[type] }}>
          {type === 'exercise' ? <Activity className="h-6 w-6 text-white" /> :
           type === 'meal' ? <Utensils className="h-6 w-6 text-white" /> :
           <Pill className="h-6 w-6 text-white" />}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      {/* Current Badge Display */}
      {currentLevel && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current Level:</span>
          <Badge className={`bg-${badgeRingColors[currentLevel]} text-white capitalize`}>
            {currentLevel}
          </Badge>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress to {nextLevel}</span>
          <span>{weeksCompleted}/{weeksRequired} weeks</span>
        </div>
        <Progress value={progress} className="h-3" />
        <p className="text-xs text-gray-500">
          {progress}% complete • {weeksRequired - weeksCompleted} weeks remaining
        </p>
      </div>

      {/* Criteria Information */}
      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
        <strong>{nextLevel} criteria:</strong> {weeksRequired} consecutive weeks 
        of {badgeCriteria[nextLevel].minScore}-10 daily scores
      </div>
    </div>
  );
}
```

---

## Supervisor Agent Integration

### Badge-Aware Therapeutic Conversations

#### In Daily Self-Scores Analysis
```typescript
// Example Supervisor Agent prompts incorporating badge progress
const badgeAwarePrompts = {
  encouragement: `
    The patient is currently working toward their ${nextBadgeLevel} ${badgeType} badge.
    They have completed ${weeksCompleted} out of ${weeksRequired} consecutive weeks.
    Use this progress to motivate them while analyzing their scores.
  `,
  
  nearCompletion: `
    The patient is very close to earning their ${nextBadgeLevel} badge in ${badgeType}!
    Only ${weeksRemaining} weeks left. Encourage consistent scoring behavior.
  `,
  
  badgeEarned: `
    The patient has just earned their ${badgeLevel} ${badgeType} badge!
    Celebrate this achievement and encourage them to work toward the next level.
  `
};
```

#### In Chatbot Conversations
```typescript
// Badge progress context for chatbot responses
interface ChatbotContext {
  currentBadges: Badge[];
  badgeProgress: BadgeProgress[];
  recentAchievements: Badge[];
  daysUntilNextOpportunity: number;
}

// Example chatbot responses
const badgeAwareResponses = {
  motivation: "I see you're working toward your silver exercise badge! You've been consistent for 2 weeks now - keep up the excellent work!",
  
  encouragement: "Your nutrition scores have been fantastic this week. Just 3 more weeks of 7+ scores and you'll earn your silver meal planning badge!",
  
  celebration: "Congratulations! You've just earned your bronze medication badge. This shows your commitment to following your care plan. Ready to work toward silver?"
};
```

---

## Award Ceremony Workflow

### Badge Achievement Flow
1. **Patient submits daily scores** → System calculates badge eligibility
2. **Badge criteria met** → Badge is awarded and saved to database
3. **Award ceremony triggered** → Full-screen celebration display
4. **Supervisor Agent notified** → Incorporates achievement into next interaction

### Award Ceremony Component
```tsx
function AwardCeremony({ badge, onComplete }: { badge: Badge, onComplete: () => void }) {
  const [animationStep, setAnimationStep] = useState(0);
  
  useEffect(() => {
    // Play celebration sound
    playCelebrationSound();
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Animation sequence
    const timer = setTimeout(() => {
      setAnimationStep(prev => prev + 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [animationStep]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-4">
        {/* Celebration Header */}
        <div className="mb-8">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400 animate-bounce" />
          <h1 className="text-4xl font-bold mb-2">Congratulations!</h1>
          <p className="text-xl">You've earned a new achievement badge!</p>
        </div>

        {/* Animated Badge Display */}
        <div className="mb-8">
          <div 
            className={`relative w-40 h-40 mx-auto rounded-full transition-all duration-1000 ${
              animationStep > 0 ? 'scale-110 animate-pulse' : 'scale-100'
            }`}
            style={{ 
              backgroundColor: badgeBaseColors[badge.type],
              boxShadow: `0 0 30px ${badgeRingColors[badge.level]}`,
              border: `5px solid ${badgeRingColors[badge.level]}`
            }}
          >
            <img 
              src="/assets/kgc-logo.jpg" 
              alt={`${badge.type} ${badge.level} badge`}
              className="w-full h-full object-cover rounded-full"
            />
            
            {/* Particle Effects */}
            {animationStep > 1 && (
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                    style={{
                      top: `${20 + Math.random() * 60}%`,
                      left: `${20 + Math.random() * 60}%`,
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badge Details */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2 capitalize">
            {badge.level} {badgeTitles[badge.type]}
          </h2>
          <p className="text-gray-300">
            {getBadgeDescription(badge.type, badge.level)}
          </p>
        </div>

        {/* Continue Button */}
        <Button 
          onClick={onComplete}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
        >
          Continue Your Journey
        </Button>
      </div>
    </div>
  );
}
```

### Badge Override Logic
```typescript
// Override self-scores analysis when badge is earned
function shouldShowBadgeCeremony(
  newBadges: Badge[],
  justSubmittedScores: boolean
): boolean {
  return justSubmittedScores && newBadges.length > 0;
}

// In DailySelfScores component
const handleSubmit = async () => {
  const newBadges = await submitScores(scores);
  
  if (shouldShowBadgeCeremony(newBadges, true)) {
    // Show badge ceremony instead of analysis dialog
    setShowBadgeCeremony(true);
    setBadgeToShow(newBadges[0]);
  } else {
    // Show normal analysis dialog
    setShowAnalysisDialog(true);
  }
};
```

---

## Visual Design Specifications

### Color Palette
```css
:root {
  /* Progress Milestones Theme */
  --pm-primary: #2E8BC0;        /* Keep Going Care Blue */
  --pm-background: #fdfdfd;     /* Clean white background */
  --pm-border: #2E8BC0/20;      /* Subtle blue borders */
  --pm-text-primary: #676767;   /* Primary text */
  --pm-text-secondary: #a4a4a4; /* Secondary text */
  
  /* Badge Colors */
  --badge-exercise: #4CAF50;    /* Green */
  --badge-meal: #2196F3;        /* Blue */
  --badge-medication: #FF9800;  /* Orange */
  
  /* Medal Colors */
  --bronze: #CD7F32;
  --silver: #C0C0C0;
  --gold: #FFD700;
  --platinum: #E5E4E2;
  
  /* Reward Colors */
  --reward-green: #22c55e;      /* Success/Money green */
}
```

### Typography
```css
.progress-milestones {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.pm-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--pm-primary);
  margin-bottom: 1rem;
}

.pm-section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--pm-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pm-description {
  font-size: 0.875rem;
  color: var(--pm-text-secondary);
  line-height: 1.4;
}
```

### Layout Grid
```css
/* Responsive Badge Grid */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .badge-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}

/* Progress Tabs */
.progress-tabs {
  width: 100%;
  margin-top: 1rem;
}

.progress-tab-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #f1f5f9;
  border-radius: 0.5rem;
  padding: 0.25rem;
}
```

### Animation Effects
```css
/* Badge Hover Effects */
.badge-hover {
  transition: all 0.2s ease;
  cursor: pointer;
}

.badge-hover:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

/* Progress Bar Animation */
.progress-bar {
  transition: width 0.8s ease-in-out;
}

/* Award Ceremony Animations */
@keyframes badge-celebration {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
  100% { transform: scale(1) rotate(360deg); opacity: 1; }
}

.award-ceremony-badge {
  animation: badge-celebration 2s ease-out forwards;
}

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}

.sparkle-effect {
  animation: sparkle 1.5s ease-in-out infinite;
}
```

---

## Complete Code Implementation

### Main Progress Milestones Component
```tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Trophy, Crown, Gift, Activity, Utensils, Pill, 
  Star, Award, Target, Info 
} from 'lucide-react';
import { useBadges } from '@/hooks/useBadges';
import { AchievementBadge, BadgeDetails } from '@/components/achievement-badge';

// Badge configuration
const badgeBaseColors = {
  exercise: "#4CAF50",
  meal: "#2196F3", 
  medication: "#FF9800"
};

const badgeRingColors = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2"
};

const badgeTitles = {
  exercise: "Exercise Champion",
  meal: "Meal Planning Master", 
  medication: "Medication Maverick"
};

const badgeCriteria = {
  bronze: { weeks: 2, minScore: 5 },
  silver: { weeks: 4, minScore: 7 },
  gold: { weeks: 16, minScore: 8 },
  platinum: { weeks: 24, minScore: 9 }
};

// Badge Progress Card Component
interface BadgeProgressCardProps {
  type: 'exercise' | 'meal' | 'medication';
  title: string;
  description: string;
  currentLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  nextLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  weeksCompleted: number;
  weeksRequired: number;
}

function BadgeProgressCard({ 
  type, title, description, currentLevel, nextLevel, 
  progress, weeksCompleted, weeksRequired 
}: BadgeProgressCardProps) {
  const IconComponent = type === 'exercise' ? Activity : 
                       type === 'meal' ? Utensils : Pill;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: badgeBaseColors[type] }}
        >
          <IconComponent className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-[#676767]">{title}</h3>
          <p className="text-sm text-[#a4a4a4]">{description}</p>
        </div>
      </div>

      {/* Current Level Badge */}
      {currentLevel && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#676767]">Current Level:</span>
          <Badge 
            className="capitalize text-white"
            style={{ backgroundColor: badgeRingColors[currentLevel] }}
          >
            {currentLevel}
          </Badge>
        </div>
      )}

      {/* Progress Section */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-[#676767]">
          <span>Progress to {nextLevel}</span>
          <span className="font-medium">{weeksCompleted}/{weeksRequired} weeks</span>
        </div>
        
        <Progress 
          value={progress} 
          className="h-3"
          style={{
            '--progress-background': badgeBaseColors[type]
          } as React.CSSProperties}
        />
        
        <div className="flex justify-between text-xs text-[#a4a4a4]">
          <span>{progress}% complete</span>
          <span>{weeksRequired - weeksCompleted} weeks remaining</span>
        </div>
      </div>

      {/* Criteria Information */}
      <div className="text-xs text-[#676767] bg-gray-50 p-3 rounded-md">
        <strong className="capitalize">{nextLevel} criteria:</strong> {weeksRequired} consecutive weeks 
        of {badgeCriteria[nextLevel].minScore}-10 daily scores
      </div>
    </div>
  );
}

// Award Ceremony Component
interface AwardCeremonyProps {
  badge: BadgeDetails;
  onComplete: () => void;
}

function AwardCeremony({ badge, onComplete }: AwardCeremonyProps) {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    // Play celebration sound
    try {
      const audio = new Audio('/sounds/achievement-fanfare.mp3');
      audio.volume = 0.6;
      audio.play().catch(console.log);
    } catch (error) {
      console.log('Achievement sound not available');
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Animation sequence
    const timers = [
      setTimeout(() => setAnimationStep(1), 500),
      setTimeout(() => setAnimationStep(2), 1500),
      setTimeout(() => setAnimationStep(3), 2500)
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-4">
        {/* Header */}
        <div className="mb-8">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400 animate-bounce" />
          <h1 className="text-4xl font-bold mb-2">Congratulations!</h1>
          <p className="text-xl opacity-90">You've earned a new achievement badge!</p>
        </div>

        {/* Animated Badge */}
        <div className="mb-8 relative">
          <div 
            className={`relative w-40 h-40 mx-auto rounded-full transition-all duration-1000 ${
              animationStep > 0 ? 'scale-110' : 'scale-100'
            } ${animationStep > 1 ? 'animate-pulse' : ''}`}
            style={{ 
              backgroundColor: badgeBaseColors[badge.type],
              boxShadow: `0 0 40px ${badgeRingColors[badge.level]}`,
              border: `6px solid ${badgeRingColors[badge.level]}`
            }}
          >
            <img 
              src="/assets/kgc-logo.jpg" 
              alt={`${badge.type} ${badge.level} badge`}
              className="w-full h-full object-cover rounded-full"
            />
            
            {/* Sparkle Effects */}
            {animationStep > 2 && (
              <div className="absolute inset-0">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping opacity-75"
                    style={{
                      top: `${10 + Math.random() * 80}%`,
                      left: `${10 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '2s'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badge Details */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3 capitalize" 
              style={{ color: badgeRingColors[badge.level] }}>
            {badge.level} {badgeTitles[badge.type]}
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed">
            Outstanding commitment to your {badge.type === 'exercise' ? 'physical wellness' : 
            badge.type === 'meal' ? 'nutritional health' : 'medication adherence'}!
          </p>
        </div>

        {/* Action Button */}
        <Button 
          onClick={onComplete}
          className="bg-[#2E8BC0] hover:bg-[#2E8BC0]/90 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
        >
          Continue Your Journey
        </Button>
      </div>
    </div>
  );
}

// Main Progress Milestones Component
export default function ProgressMilestones() {
  const userId = 73; // Real user ID
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [showAwardCeremony, setShowAwardCeremony] = useState(false);
  const [ceremonyBadge, setCeremonyBadge] = useState<BadgeDetails | null>(null);

  const { 
    badges, 
    badgeProgress, 
    loading, 
    newBadge, 
    clearNewBadge 
  } = useBadges(userId);

  // Show award ceremony for new badges
  useEffect(() => {
    if (newBadge) {
      setCeremonyBadge(newBadge);
      setShowAwardCeremony(true);
    }
  }, [newBadge]);

  const handleAwardCeremonyComplete = () => {
    setShowAwardCeremony(false);
    setCeremonyBadge(null);
    clearNewBadge();
  };

  // Check if all platinum badges are earned for $100 reward
  const hasAllPlatinumBadges = ['exercise', 'meal', 'medication'].every(type =>
    badges.some(badge => badge.type === type && badge.level === 'platinum')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E8BC0]"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2E8BC0] mb-4">Progress Milestones</h1>
          <p className="text-[#676767] mb-6">
            Track your achievements and earn rewards for consistent health habits
          </p>
          
          {/* $100 Reward Button */}
          <Button 
            onClick={() => setShowRewardsDialog(true)}
            className={`px-8 py-3 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 ${
              hasAllPlatinumBadges 
                ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={!hasAllPlatinumBadges}
          >
            <Gift className="h-5 w-5 mr-2" />
            {hasAllPlatinumBadges ? 'Claim Your $100!' : 'Earn $100'}
          </Button>
        </div>

        {/* Achievement Badges Section */}
        <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#676767] flex items-center text-xl">
                  <Crown className="w-6 h-6 text-[#2E8BC0] mr-2" />
                  Achievement Badges
                </CardTitle>
                <CardDescription className="text-[#a4a4a4] mt-1">
                  Badges earned for consistently maintaining good health habits
                </CardDescription>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowBadgeInfo(true)}
                className="rounded-full h-8 w-8 hover:bg-[#2E8BC0]/10"
              >
                <Info className="h-4 w-4 text-[#2E8BC0]" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Badge Collection Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {['exercise', 'meal', 'medication'].map((type) => {
                const userBadges = badges.filter(b => b.type === type);
                const highestBadge = userBadges.length > 0 
                  ? userBadges.reduce((highest, current) => {
                      const levels = ['bronze', 'silver', 'gold', 'platinum'];
                      return levels.indexOf(current.level) > levels.indexOf(highest.level) 
                        ? current : highest;
                    })
                  : null;

                return (
                  <div key={type} className="text-center">
                    <div className="mb-3">
                      {highestBadge ? (
                        <AchievementBadge 
                          badge={highestBadge}
                          size="lg"
                        />
                      ) : (
                        <div 
                          className="w-24 h-24 mx-auto rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center"
                        >
                          <span className="text-gray-400 text-xs">Not yet<br/>earned</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-[#676767] capitalize">
                      {badgeTitles[type]}
                    </h3>
                    <p className="text-sm text-[#a4a4a4]">
                      {highestBadge ? `${highestBadge.level} level` : 'Start scoring daily'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Progress Tracking Tabs */}
            <Tabs defaultValue="exercise" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger value="exercise" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Exercise
                </TabsTrigger>
                <TabsTrigger value="meal" className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Meal Plan
                </TabsTrigger>
                <TabsTrigger value="medication" className="flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Medication
                </TabsTrigger>
              </TabsList>
              
              {/* Progress Content */}
              {['exercise', 'meal', 'medication'].map((type) => (
                <TabsContent key={type} value={type} className="mt-6">
                  <BadgeProgressCard 
                    type={type as any}
                    title={badgeTitles[type]}
                    description={`Consistently maintain your ${type} self-scores`}
                    currentLevel={badgeProgress[type]?.currentLevel || null}
                    nextLevel={badgeProgress[type]?.nextLevel || 'bronze'}
                    progress={badgeProgress[type]?.progress || 0}
                    weeksCompleted={badgeProgress[type]?.weeksCompleted || 0}
                    weeksRequired={badgeProgress[type]?.weeksRequired || 2}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Award Ceremony Modal */}
      {showAwardCeremony && ceremonyBadge && (
        <AwardCeremony 
          badge={ceremonyBadge}
          onComplete={handleAwardCeremonyComplete}
        />
      )}

      {/* Dialogs for additional information */}
      {/* Add reward info and badge info dialogs as needed */}
    </>
  );
}
```

## Implementation Checklist for Jules and Amazon Q

### Critical Integration Points
✓ **Real Data Connection**: Connect to actual patient scores table, not sample data  
✓ **Badge Calculation**: Implement server-side badge logic based on consecutive weeks  
✓ **Award Ceremony Override**: Show ceremony instead of analysis when badges are earned  
✓ **Supervisor Agent Context**: Pass badge progress to AI for therapeutic conversations  
✓ **Progress Persistence**: Save and retrieve badge progress from database  

### Key UX Behaviors
✓ **Badge Visibility**: Show earned badges prominently with metallic colors  
✓ **Progress Feedback**: Real-time progress bars showing weeks completed  
✓ **Celebration Moments**: Full-screen award ceremony with sound and haptics  
✓ **Motivation Integration**: AI mentions badge progress in daily conversations  
✓ **$100 Reward**: Activate when all 3 platinum badges are earned  

### Design Specifications
✓ **Color Accuracy**: Use exact hex values for badge colors and levels  
✓ **Animation Timing**: 2-second celebration sequence with particle effects  
✓ **Responsive Layout**: 3-column badge grid that adapts to mobile  
✓ **Typography**: Keep Going Care blue headings with gray body text  
✓ **Interactive States**: Hover effects and loading states for all buttons  

This comprehensive documentation provides Jules and Amazon Q with everything needed to recreate the exact Progress Milestones feature, including real data integration, badge calculation logic, award ceremonies, and Supervisor Agent integration.