# Keep Going Care - Complete UI/UX Documentation
## For Jules Gemini and Amazon Q Implementation Teams

### Table of Contents
1. [Design System Overview](#design-system-overview)
2. [Color Palette & Branding](#color-palette--branding)
3. [Typography & Layout](#typography--layout)
4. [Component Documentation](#component-documentation)
5. [Page Layouts](#page-layouts)
6. [Interactive Features](#interactive-features)
7. [Responsive Design](#responsive-design)
8. [Animation & Effects](#animation--effects)

---

## Design System Overview

### Core Visual Identity
- **Primary Brand**: Metallic blue with healthcare-grade clean aesthetics
- **Typography**: Clean, medical-grade sans-serif fonts
- **Layout**: Card-based design with generous white space
- **Interactions**: Subtle haptic feedback and therapeutic sound effects
- **Accessibility**: High contrast, screen reader friendly, keyboard navigation

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile-first responsive design
- Touch-friendly interfaces for tablets and phones

---

## Color Palette & Branding

### Primary Colors
```css
:root {
  /* Metallic Blue Primary */
  --primary: 210 40% 60%;           /* #6b9bd1 */
  --primary-foreground: 0 0% 98%;   /* #fafafa */
  
  /* Healthcare Blue Variants */
  --healthcare-blue: #4a90e2;
  --healthcare-blue-dark: #357abd;
  --healthcare-blue-light: #7fb3f0;
  
  /* Backgrounds */
  --background: 0 0% 100%;          /* #ffffff */
  --foreground: 222.2 84% 4.9%;     /* #09090b */
  
  /* Secondary Colors */
  --secondary: 210 40% 96%;         /* #f1f5f9 */
  --secondary-foreground: 222.2 84% 4.9%;
  
  /* Accent Colors */
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  
  /* Status Colors */
  --destructive: 0 84% 60%;         /* Red for errors */
  --destructive-foreground: 210 40% 98%;
  
  /* Border & Input */
  --border: 214.3 31.8% 91.4%;     /* #e2e8f0 */
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  
  /* Muted Colors */
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Card Colors */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  
  /* Popover Colors */
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
}
```

### Metallic Blue Button Styling
```css
.metallic-blue {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 50%, #7fb3f0 100%);
  border: 1px solid #357abd;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.metallic-blue:hover {
  background: linear-gradient(135deg, #357abd 0%, #2c6aa0 50%, #6b9bd1 100%);
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.metallic-blue:active {
  transform: translateY(0);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

---

## Typography & Layout

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Heading Hierarchy
```css
h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 1.5rem; }
h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; margin-bottom: 1rem; }
h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; margin-bottom: 0.75rem; }
```

### Container System
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .container { padding: 0 2rem; }
}
```

---

## Component Documentation

### 1. Dashboard Layout

#### Main Dashboard Container
```jsx
<div className="min-h-screen bg-gray-50">
  <div className="container mx-auto p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Feature cards */}
    </div>
  </div>
</div>
```

#### Feature Card Structure
```jsx
<Card className="h-full hover:shadow-lg transition-shadow duration-200">
  <CardHeader className="pb-3">
    <div className="flex items-center space-x-3">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm text-gray-600">
          {description}
        </CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <Button className="w-full metallic-blue text-white">
      {buttonText}
    </Button>
  </CardContent>
</Card>
```

### 2. Daily Self-Scores Component

#### Color-Coded Slider System
```jsx
// Physical Health - Green Gradient
<div className="space-y-2">
  <Label className="text-sm font-medium">Physical Health</Label>
  <Slider
    value={[scores.physical]}
    onValueChange={(value) => handleScoreChange('physical', value[0])}
    max={10}
    min={1}
    step={1}
    className="w-full"
    style={{
      '--slider-track': 'linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e)',
      '--slider-thumb': '#22c55e'
    }}
  />
  <div className="text-center text-2xl font-bold text-green-600">
    {scores.physical}
  </div>
</div>

// Mental Health - Blue Gradient  
<div className="space-y-2">
  <Label className="text-sm font-medium">Mental Health</Label>
  <Slider
    value={[scores.mental]}
    onValueChange={(value) => handleScoreChange('mental', value[0])}
    max={10}
    min={1}
    step={1}
    className="w-full"
    style={{
      '--slider-track': 'linear-gradient(to right, #ef4444, #f97316, #eab308, #3b82f6, #1d4ed8)',
      '--slider-thumb': '#3b82f6'
    }}
  />
  <div className="text-center text-2xl font-bold text-blue-600">
    {scores.mental}
  </div>
</div>

// Nutrition - Red Gradient
<div className="space-y-2">
  <Label className="text-sm font-medium">Nutrition</Label>
  <Slider
    value={[scores.nutrition]}
    onValueChange={(value) => handleScoreChange('nutrition', value[0])}
    max={10}
    min={1}
    step={1}
    className="w-full"
    style={{
      '--slider-track': 'linear-gradient(to right, #ef4444, #f97316, #eab308, #f97316, #ef4444)',
      '--slider-thumb': '#ef4444'
    }}
  />
  <div className="text-center text-2xl font-bold text-red-600">
    {scores.nutrition}
  </div>
</div>
```

#### Submit Button with Haptic Feedback
```jsx
<Button
  onClick={handleSubmit}
  disabled={!allScoresEntered || mutation.isPending}
  className="w-full metallic-blue text-white text-lg py-3"
>
  {mutation.isPending ? (
    <div className="flex items-center">
      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Submitting...
    </div>
  ) : (
    'Submit Today\'s Scores'
  )}
</Button>
```

### 3. Motivational Image Processor

#### Upload Section
```jsx
<Card>
  <CardHeader>
    <CardTitle>Upload Your Motivational Image</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-gray-600 mb-4">
      Upload an image of a special person, pet, family, or whatever motivates you 
      to maintain a healthier lifestyle.
    </p>
    
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="picture">Picture</Label>
        <Input 
          id="picture" 
          type="file" 
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>
      
      <Button 
        onClick={handleUpload}
        className="bg-primary text-white hover:bg-primary/90"
      >
        Upload Image
      </Button>
    </div>
  </CardContent>
</Card>
```

#### Preview and Enhancement Section
```jsx
<Card>
  <CardHeader>
    <CardTitle>Image Preview</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col items-center justify-center">
    <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden mb-4">
      {enhancedUrl ? (
        <img 
          src={enhancedUrl} 
          alt="Enhanced preview" 
          className="w-full h-full object-cover"
        />
      ) : previewUrl ? (
        <img 
          src={previewUrl} 
          alt="Preview" 
          className="w-full h-full object-cover"
        />
      ) : (
        <img 
          src={heartImage} 
          alt="Default motivation" 
          className="w-full h-full object-cover"
        />
      )}
      
      {/* Loading overlay */}
      {processingImage && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="flex flex-col items-center text-white">
            <svg className="animate-spin h-8 w-8 mb-2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Enhancing image...</span>
          </div>
        </div>
      )}
    </div>
    
    <p className="text-center text-gray-600 mb-4">
      Enhance your image with motivational effects, then save for the Keep Going experience.
    </p>
    
    {/* Enhancement buttons */}
    <div className="grid grid-cols-2 gap-3 w-full">
      <Button 
        className="metallic-blue text-white"
        onClick={handleEnhance}
        disabled={!previewUrl || processingImage}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Enhance Image
      </Button>
      
      <Button 
        className="metallic-blue text-white"
        onClick={handleSave}
        disabled={!enhancedUrl || processingImage}
      >
        <Save className="h-4 w-4 mr-2" />
        Save
      </Button>
    </div>
  </CardContent>
</Card>
```

### 4. Keep Going Feature

#### Keep Going Button
```jsx
<div className="flex flex-col items-center space-y-4">
  <Button
    onClick={handleKeepGoingClick}
    className="metallic-blue text-white text-xl px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
    style={{
      background: motivationalImage 
        ? `linear-gradient(rgba(74, 144, 226, 0.7), rgba(53, 122, 189, 0.7)), url(${motivationalImage})`
        : 'linear-gradient(135deg, #4a90e2 0%, #357abd 50%, #7fb3f0 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: '120px',
      minWidth: '200px'
    }}
  >
    <div className="flex flex-col items-center">
      <Heart className="h-8 w-8 mb-2" />
      <span>Keep Going</span>
    </div>
  </Button>
  
  {motivationalImage && (
    <p className="text-sm text-gray-600 text-center">
      Your motivational image is active
    </p>
  )}
</div>
```

### 5. YouTube Video Integration

#### Video Player with Overlay
```jsx
<div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
  <div className="relative w-full max-w-4xl mx-4">
    <button
      onClick={onClose}
      className="absolute -top-12 right-0 text-white hover:text-gray-300 z-10"
    >
      <X className="h-8 w-8" />
    </button>
    
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* YouTube iframe */}
      <iframe
        width="100%"
        height="400"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1`}
        title="Keep Going Motivation Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full"
      />
      
      {/* Image overlay */}
      {enhancedImageOverlay && overlayImage && (
        <div className="absolute top-4 right-4 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
          <img
            src={overlayImage}
            alt="Your motivational image"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  </div>
</div>
```

### 6. Chatbot Interface

#### Welcome Dialogue
```jsx
<Card className="w-full max-w-2xl mx-auto mb-6">
  <CardHeader>
    <CardTitle className="flex items-center">
      <MessageCircle className="h-5 w-5 mr-2" />
      Welcome to Keep Going Care
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <p className="text-gray-700">
        Hello! I'm your personal health assistant. I'm here to support your wellness journey 
        with personalized guidance and motivation.
      </p>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">How I can help you:</h4>
        <ul className="text-sm space-y-1">
          <li>• Track your daily health metrics</li>
          <li>• Provide personalized meal suggestions</li>
          <li>• Offer exercise recommendations</li>
          <li>• Support your mental wellness</li>
          <li>• Help you stay motivated</li>
        </ul>
      </div>
      
      <div className="space-y-2">
        <Label>Would you like me to speak responses aloud?</Label>
        <div className="flex space-x-4">
          <Button
            variant={voiceEnabled ? "default" : "outline"}
            onClick={() => setVoiceEnabled(true)}
            className="flex-1"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Yes, use voice
          </Button>
          <Button
            variant={!voiceEnabled ? "default" : "outline"}
            onClick={() => setVoiceEnabled(false)}
            className="flex-1"
          >
            <VolumeX className="h-4 w-4 mr-2" />
            Text only
          </Button>
        </div>
      </div>
      
      <Button 
        onClick={onComplete}
        className="w-full metallic-blue text-white"
      >
        Get Started
      </Button>
    </div>
  </CardContent>
</Card>
```

#### Chat Interface
```jsx
<div className="h-96 flex flex-col">
  {/* Chat messages */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.map((message, index) => (
      <div
        key={index}
        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {message.content}
        </div>
      </div>
    ))}
  </div>
  
  {/* Input area */}
  <div className="border-t p-4">
    <div className="flex space-x-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        className="flex-1"
      />
      <Button onClick={handleSend} disabled={!input.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
```

---

## Page Layouts

### 1. Main Dashboard Layout

```jsx
function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Keep Going Care</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {userName}</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {/* Welcome message */}
        <div className="mb-8">
          <h2 className="text-xl text-gray-700 mb-2">
            How are you feeling today?
          </h2>
          <p className="text-gray-600">
            Choose from the options below to track your progress and get support.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature cards here */}
        </div>

        {/* Keep Going section */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-4">Need motivation?</h3>
          <KeepGoingFeature motivationalImage={motivationalImage} />
        </div>
      </main>
    </div>
  );
}
```

### 2. Mobile-First Responsive Grid

```css
/* Mobile (default) */
.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
    padding: 2rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .feature-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* Large Desktop */
@media (min-width: 1280px) {
  .feature-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Interactive Features

### 1. Haptic Feedback System

```javascript
// Create subtle haptic feedback for button interactions
function createHapticFeedback() {
  if ('vibrate' in navigator) {
    navigator.vibrate([10, 5, 10]); // Short-pause-short pattern
  }
}

// Sound effects for therapeutic interactions
function playTherapeuticSound() {
  const audio = new Audio('/sounds/therapeutic-gong.mp3');
  audio.volume = 0.3;
  audio.play().catch(console.log);
}
```

### 2. Text-to-Speech Integration

```javascript
// Australian English healthcare-optimized speech
function speakText(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Australian English with healthcare-appropriate settings
    utterance.lang = 'en-AU';
    utterance.rate = 0.9;  // Slightly slower for healthcare
    utterance.pitch = 1.0; // Natural pitch
    utterance.volume = 0.8;
    
    // Try to use Australian English voice if available
    const voices = speechSynthesis.getVoices();
    const auVoice = voices.find(voice => 
      voice.lang.includes('en-AU') || 
      voice.name.includes('Australian')
    );
    
    if (auVoice) {
      utterance.voice = auVoice;
    }
    
    speechSynthesis.speak(utterance);
  }
}
```

### 3. Image Enhancement Algorithm

```javascript
// Add motivational stars to images
async function enhanceWithStars(imageUrl) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Optimize size for performance
      const maxWidth = 800;
      const maxHeight = 600;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Add golden stars
      const starCount = 8;
      for (let i = 0; i < starCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 15 + Math.random() * 20;
        
        drawStar(ctx, x, y, size);
      }
      
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    
    img.src = imageUrl;
  });
}

// Draw a 5-pointed star
function drawStar(ctx, x, y, size) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, '#FFD700');
  gradient.addColorStop(0.5, '#FFA500');
  gradient.addColorStop(1, '#FF6347');
  
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.4;
  
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
```

---

## Animation & Effects

### 1. Button Hover Effects

```css
.metallic-blue {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
}

.metallic-blue:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(74, 144, 226, 0.3);
}

.metallic-blue:active {
  transform: translateY(0);
  transition: all 0.1s;
}
```

### 2. Loading Animations

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
```

### 3. Card Hover Effects

```css
.feature-card {
  transition: all 0.3s ease;
  transform: translateY(0);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}
```

---

## Implementation Notes for Jules and Amazon Q

### 1. Critical Dependencies
```json
{
  "dependencies": {
    "@radix-ui/react-slider": "^1.1.2",
    "lucide-react": "^0.263.1",
    "framer-motion": "^10.16.4",
    "react-hook-form": "^7.45.4"
  }
}
```

### 2. Essential CSS Classes
- Use Tailwind CSS for rapid development
- Ensure metallic-blue class is properly implemented
- Maintain responsive grid system
- Implement proper focus states for accessibility

### 3. Key State Management
- Use React Query for server state
- Local state for UI interactions
- Session storage for temporary user preferences
- Database storage for persistent user data

### 4. Audio/Visual Integration
- Implement Web Audio API for therapeutic sounds
- Use Speech Synthesis API for voice responses
- Canvas API for image manipulation
- YouTube Iframe API for video integration

### 5. Accessibility Requirements
- ARIA labels for all interactive elements
- Keyboard navigation support
- High contrast mode compatibility
- Screen reader optimization

---

This documentation provides the complete technical and design specifications needed to recreate the exact look and functionality of the Keep Going Care application. All measurements, colors, animations, and interactions are precisely documented for accurate implementation.