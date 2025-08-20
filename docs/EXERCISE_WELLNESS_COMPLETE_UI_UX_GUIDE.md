# Exercise & Wellness (E&W) Feature - Complete UI/UX Implementation Guide

## Overview

The Exercise & Wellness feature combines video discovery with local fitness provider search, creating a comprehensive health support system. It consists of two main components:

1. **Inspiration Machine E&W** (`inspiration-ew.tsx`) - Video discovery with AI analysis
2. **E&W Support** (`ew-support.tsx`) - Local fitness facility and trainer finder

---

## Component 1: Inspiration Machine E&W (`client/src/pages/inspiration-ew.tsx`)

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header: "Inspiration Machine E&W"                     │
├─────────────────────────────────────────────────────────────┤
│ Doctor's Care Plan Directive Card                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 Doctor's recommendations:                            │ │
│ │ [Care Plan Directive Text - left border blue accent]   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Search Configuration Card                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Exercise & Wellness Videos                              │ │
│ │ Guided exercises and wellness activities that match... │ │
│ │                                                         │ │
│ │ [Exercise Tab] [Wellness Tab]                          │ │
│ │                                                         │ │
│ │ Tab Content Area:                                       │ │
│ │ ┌───────────────┐ ┌─────────────────┐                  │ │
│ │ │ Intensity     │ │ Duration        │                  │ │
│ │ │ [Dropdown]    │ │ [Dropdown]      │                  │ │
│ │ └───────────────┘ └─────────────────┘                  │ │
│ │                                                         │ │
│ │ Tag Selection (Clickable Badges):                      │ │
│ │ [Seated] [Walking] [Water] [Strength] [Balance]...     │ │
│ │                                                         │ │
│ │ [🔍 Inspiration Search Button]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Video Results Grid (2 columns on desktop, 1 on mobile)     │
│ ┌─────────────────┐ ┌─────────────────┐                   │
│ │ Video Card 1    │ │ Video Card 2    │                   │
│ │ [Thumbnail]     │ │ [Thumbnail]     │                   │
│ │ Title           │ │ Title           │                   │
│ │ AI Analysis     │ │ AI Analysis     │                   │
│ │ [Save] [Watch]  │ │ [Save] [Watch]  │                   │
│ └─────────────────┘ └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Design Specifications

#### Color Scheme
- **Primary Blue**: `#3b82f6` (KGC brand color)
- **Primary Blue Hover**: `#2563eb` 
- **Muted Background**: `#f8fafc`
- **Card Background**: `#ffffff`
- **Border Accent**: `#3b82f6` (left border on CPD card)
- **Text Primary**: `#1f2937`
- **Text Muted**: `#6b7280`

#### Typography
- **Page Title**: `text-2xl font-bold mb-6` (24px, bold)
- **Card Titles**: `text-lg font-medium` (18px, medium weight)
- **Card Descriptions**: `text-sm text-muted-foreground` (14px, muted)
- **Labels**: `text-sm font-medium` (14px, medium weight)
- **Body Text**: `text-sm` (14px, regular)

#### Spacing
- **Container**: `container mx-auto p-4` (responsive container with 16px padding)
- **Card Margins**: `mb-6` (24px bottom margin)
- **Internal Padding**: `p-4` (16px all sides)
- **Grid Gap**: `gap-6` (24px between video cards)
- **Form Elements Gap**: `gap-4` (16px between form rows)

### Interactive Elements

#### Tab System
```typescript
<Tabs defaultValue="exercise" onValueChange={setActiveTab}>
  <TabsList className="grid grid-cols-2 mb-6">
    <TabsTrigger value="exercise">
      <Activity className="h-4 w-4 mr-2" />
      Exercise
    </TabsTrigger>
    <TabsTrigger value="wellness">
      <Brain className="h-4 w-4 mr-2" />
      Wellness
    </TabsTrigger>
  </TabsList>
</Tabs>
```

**Visual States**:
- **Active Tab**: Background highlighted in primary blue
- **Inactive Tab**: Muted background with gray text
- **Icons**: 16x16px Lucide icons with 8px right margin

#### Form Controls

**Dropdown Selects**:
```typescript
<Select onValueChange={setIntensity}>
  <SelectTrigger id="intensity">
    <SelectValue placeholder="Select intensity" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="low">Low Impact</SelectItem>
    <SelectItem value="moderate">Moderate</SelectItem>
    <SelectItem value="high">Higher Intensity</SelectItem>
  </SelectContent>
</Select>
```

**Tag Selection Badges**:
```typescript
<Badge 
  variant={selectedTags.includes(tag) ? "default" : "secondary"}
  className="cursor-pointer"
  onClick={() => toggleTag(tag)}
>
  {tag}
</Badge>
```

**States**:
- **Selected**: `variant="default"` (primary blue background)
- **Unselected**: `variant="secondary"` (gray background)
- **Hover**: Slight opacity change and pointer cursor

#### Search Button
```typescript
<Button 
  onClick={handleSearch}
  className="bg-primary text-white hover:bg-primary/90 w-full md:w-auto mt-4"
>
  <Search className="h-4 w-4 mr-2" />
  Inspiration Search
</Button>
```

### Video Card Component

#### Card Structure
```
┌─────────────────────────────────────────┐
│ Thumbnail Image (16:9 aspect ratio)     │
│ ┌─────────────────────────────────────┐  │
│ │ [Low Impact] Badge (top-left)       │  │
│ │                                     │  │
│ │         [Play Button Overlay]       │  │
│ │                                     │  │
│ │ [15 min] Duration (bottom-right)    │  │
│ └─────────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ Video Title (truncated to 1 line)      │
│ YouTube | [Category Badge]              │
│                                         │
│ AI Analysis Section:                    │
│ ┌─────────────────────────────────────┐ │
│ │ 🤖 AI Analysis                      │ │
│ │ Difficulty: Intermediate            │ │
│ │ Calories: ~300 per 30 min          │ │
│ │ Equipment: [Yoga Mat] [Dumbbells]   │ │
│ │ Health Benefits: • Flexibility     │ │
│ │                  • Stress Relief   │ │
│ │ Precautions: Avoid if back pain    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [💾 Save] [▶️ Watch Video] Buttons      │
└─────────────────────────────────────────┘
```

#### Visual Elements

**Thumbnail Overlay**:
- **Intensity Badge**: Top-left corner, colored by intensity level
  - Low: `bg-green-500` (green)
  - Moderate: `bg-yellow-500` (yellow)
  - High: `bg-red-500` (red)
- **Duration Badge**: Bottom-right, `bg-black bg-opacity-70 text-white`
- **Play Button**: Center overlay, 48x48px with hover opacity effect

**AI Analysis Section**:
- **Background**: `border border-muted rounded-md p-3 mb-3 bg-muted/20`
- **Header**: `text-sm font-medium mb-2` "AI Analysis" with robot emoji
- **Data Rows**: `flex justify-between` for label/value pairs
- **Equipment Badges**: Small secondary badges for each equipment item
- **Health Benefits**: Bulleted list format
- **Precautions**: Highlighted in amber/warning color if present

### Loading States

#### Search Loading
```typescript
{videoSearchMutation.isPending ? (
  <div className="col-span-2 flex flex-col items-center justify-center p-12">
    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
    <p className="text-lg">Searching for {activeTab} videos...</p>
  </div>
) : // ... results}
```

#### CPD Loading
```typescript
{loadingCPD ? (
  <Card className="mb-6">
    <CardContent className="p-4">
      <div className="flex items-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <p>Loading doctor's recommendations...</p>
      </div>
    </CardContent>
  </Card>
) : // ... CPD content}
```

### Responsive Design

#### Desktop (768px+)
- Two-column video grid: `grid-cols-1 md:grid-cols-2`
- Form controls in 2-column layout: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Search button: `w-full md:w-auto` (auto-width on desktop)

#### Mobile (<768px)
- Single-column video grid
- Stacked form controls
- Full-width search button
- Reduced padding and margins

---

## Component 2: E&W Support (`client/src/pages/ew-support.tsx`)

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header: "Exercise & Wellness Support"                 │
├─────────────────────────────────────────────────────────────┤
│ Doctor's Care Plan Directive Card (same as above)          │
├─────────────────────────────────────────────────────────────┤
│ Search Configuration Card                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Find Local Fitness Support                              │ │
│ │ [Locations Tab] [Personal Trainers Tab]                │ │
│ │                                                         │ │
│ │ Search Form:                                            │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐   │ │
│ │ │ Location     │ │ Postcode     │ │ Type (optional) │   │ │
│ │ │ [Input]      │ │ [Input]      │ │ [Dropdown]      │   │ │
│ │ └──────────────┘ └──────────────┘ └─────────────────┘   │ │
│ │                                                         │ │
│ │ [🔍 Search] [💖 View Favorites (3)]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Results Grid (2 columns desktop, 1 mobile)                 │
│ ┌─────────────────┐ ┌─────────────────┐                   │
│ │ Provider Card 1 │ │ Provider Card 2 │                   │
│ │ Name & Type     │ │ Name & Type     │                   │
│ │ Address         │ │ Address         │                   │
│ │ ⭐ Rating       │ │ ⭐ Rating       │                   │
│ │ Specialties     │ │ Specialties     │                   │
│ │ [💖] [📞] [🌐]  │ │ [💖] [📞] [🌐]  │                   │
│ └─────────────────┘ └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Provider Card Component

#### Card Structure
```
┌─────────────────────────────────────────┐
│ Wellness Hub Fitness                    │
│ Gym • 0.8 km away                      │
│ 123 Health St, Sydney                  │
│                                         │
│ ⭐⭐⭐⭐⭐ 4.8 (star rating)           │
│                                         │
│ Specialties:                            │
│ [Senior Fitness] [Cardiac Rehab]        │
│ [Personal Training]                     │
│                                         │
│ 📞 Contact: 02 9123 4567               │
│ 🌐 Website: wellness-hub.com.au        │
│                                         │
│ [💖 Save] [📞 Call] [🌐 Visit]          │
└─────────────────────────────────────────┘
```

#### Visual Elements

**Header Section**:
- **Name**: `text-lg font-semibold mb-1` (18px, semibold)
- **Type & Distance**: `text-sm text-gray-500 mb-2` (14px, gray)
- **Address**: `text-sm text-gray-600 mb-3` (14px, dark gray)

**Rating Display**:
- **Stars**: Filled/outlined star icons based on rating
- **Number**: `font-medium` next to stars
- **Margin**: `mb-3` below rating section

**Specialties Section**:
- **Label**: `text-sm font-medium mb-2` "Specialties:"
- **Badges**: `variant="outline"` for each specialty
- **Layout**: `flex flex-wrap gap-1` for responsive wrapping

**Contact Information**:
- **Phone**: Icon + number format: `📞 02 9123 4567`
- **Website**: Icon + truncated URL: `🌐 wellness-hub.com.au`
- **Email**: Icon + email if available

**Action Buttons**:
- **Save**: Heart icon, toggles between outline/filled
- **Call**: Phone icon, opens phone app
- **Visit**: External link icon, opens website in new tab

### Favorites System

#### Favorites Dialog
```typescript
<Dialog open={showFavorites} onOpenChange={setShowFavorites}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Your Saved Favorites</DialogTitle>
      <DialogDescription>
        Exercise and wellness providers you've saved
      </DialogDescription>
    </DialogHeader>
    // Favorites list content
  </DialogContent>
</Dialog>
```

#### Favorites List Item
```
┌─────────────────────────────────────────┐
│ 🏋️ Wellness Hub Fitness               │
│ Gym • Saved on Jan 15, 2025            │
│ 123 Health St, Sydney                  │
│ 📞 02 9123 4567                        │
│                                         │
│ [📞 Call] [🗑️ Remove]                  │
└─────────────────────────────────────────┘
```

### Search Functionality

#### Location Search
- **Input**: Text field for suburb/city
- **Validation**: Required field
- **Placeholder**: "Enter suburb or city"

#### Postcode Search
- **Input**: 4-digit numeric field
- **Validation**: Australian postcode format (4 digits)
- **Placeholder**: "Enter 4-digit postcode"

#### Type Filter (Locations only)
- **Options**: "Gym", "Yoga Studio", "Pilates Studio", "Fitness Center"
- **Default**: All types included

### Error Handling

#### Search Errors
```typescript
toast({
  title: "Search error",
  description: "An error occurred while searching. Please try again.",
  variant: "destructive"
});
```

#### Validation Errors
```typescript
toast({
  title: "Invalid postcode",
  description: "Please enter a valid 4-digit Australian postcode",
  variant: "destructive"
});
```

### Data Integration

#### Care Plan Directives
- **API**: `GET /api/users/${userId}/care-plan-directives/active`
- **Filter**: Exercise, wellness, or physical activity categories
- **Display**: Blue left border accent card
- **Fallback**: Default message if no CPDs found

#### Search Results
- **API**: `GET /api/search/fitness-facilities` or `/api/search/personal-trainers`
- **Parameters**: location, postcode, type, useLocalSearch=true
- **Fallback**: Static provider list if API fails

#### Favorites Storage
- **Primary**: `localStorage` for immediate persistence
- **Keys**: 
  - `user_${userId}_ew_favorite_ids` (array of IDs)
  - `user_${userId}_ew_favorites_list` (full objects)

---

## Technical Implementation

### State Management

#### Core State Variables
```typescript
// Inspiration E&W
const [activeTab, setActiveTab] = useState<string>("exercise");
const [intensity, setIntensity] = useState<string>("");
const [duration, setDuration] = useState<string>("");
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [videos, setVideos] = useState<VideoResult[]>([]);

// E&W Support
const [searchLocation, setSearchLocation] = useState("Sydney");
const [postcode, setPostcode] = useState("");
const [locationType, setLocationType] = useState("");
const [searchResults, setSearchResults] = useState<(Location | Trainer)[]>([]);
const [favorites, setFavorites] = useState<string[]>([]);
```

### API Integration

#### Video Search
```typescript
const videoSearchMutation = useMutation<VideoSearchResponse, Error, any>({
  mutationFn: async (searchData) => {
    const response = await axios.post<VideoSearchResponse>(
      '/api/exercise-wellness/videos',
      searchData
    );
    return response.data;
  },
  onSuccess: (data) => {
    setVideos(data.videos);
    toast({ title: "Videos updated", description: `Found ${data.videos.length} videos` });
  }
});
```

#### Provider Search
```typescript
const response = await fetch(
  `/api/search/fitness-facilities?location=${encodeURIComponent(searchLocation)}&type=${encodeURIComponent(locationType)}&postcode=${encodeURIComponent(postcode)}&useLocalSearch=true`
);
```

### Performance Optimizations

#### Image Loading
- **Lazy Loading**: Native browser lazy loading for video thumbnails
- **Fallback Images**: Asset imports for offline/error scenarios
- **YouTube Thumbnails**: Automatic generation using `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`

#### Search Optimization
- **Debouncing**: 30-second timeout for API requests
- **Caching**: Results cached in component state
- **Error Handling**: Graceful fallback to default data

### Accessibility Features

#### Keyboard Navigation
- **Tab Order**: Logical flow through form controls and buttons
- **Focus Indicators**: Clear focus rings on all interactive elements
- **Enter Key**: Submit forms and activate buttons

#### Screen Reader Support
- **Alt Text**: Descriptive alt text for all images
- **ARIA Labels**: Proper labeling for complex components
- **Role Attributes**: Semantic HTML with ARIA roles where needed

#### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio for all text
- **Interactive Elements**: Clear color differences for states
- **Icons**: Sufficient contrast and sizing (minimum 16px)

---

## Testing Guidelines

### Manual Testing Checklist

#### Functionality
- [ ] CPD loading and display
- [ ] Tab switching between Exercise/Wellness
- [ ] Form validation (postcode format)
- [ ] Video search with various parameters
- [ ] Provider search with location/type filters
- [ ] Favorites add/remove functionality
- [ ] External link opening (videos, websites)

#### Responsive Design
- [ ] Mobile layout (single column)
- [ ] Desktop layout (two columns)
- [ ] Form elements stack properly on mobile
- [ ] Cards maintain proper spacing at all breakpoints

#### Error Handling
- [ ] Network errors show appropriate messages
- [ ] Invalid postcode validation
- [ ] Empty search results handling
- [ ] API timeout scenarios

### Browser Compatibility
- **Chrome/Edge**: Full support for all features
- **Firefox**: Full support for all features
- **Safari**: Full support (test iOS touch interactions)
- **Mobile**: Touch-friendly button sizes and interactions

---

This comprehensive guide provides all the technical details needed to recreate the Exercise & Wellness feature exactly as implemented in the current KGC system.