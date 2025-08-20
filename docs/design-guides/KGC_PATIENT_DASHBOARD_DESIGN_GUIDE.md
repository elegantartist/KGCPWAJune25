
# KGC Patient Dashboard - Complete UI/UX Design Guide

## Overview
This guide provides detailed specifications for replicating the Keep Going Care (KGC) patient dashboard UI/UX. The design follows a healthcare-focused, accessible approach with metallic accents and a warm, supportive visual language.

## Core Design System

### Color Palette
- **Primary Blue**: `#2E8BC0` - Used for primary actions, highlights, and branding
- **Background**: `#fdfdfd` - Off-white background for main content areas
- **Text Primary**: `#676767` - Main text color for headings and body text
- **Text Secondary**: `#9CA3AF` - Muted text for descriptions and secondary information
- **Success Green**: `#10B981` - For positive feedback and success states
- **Warning Amber**: `#F59E0B` - For attention-requiring items
- **Error Red**: `#EF4444` - For errors and critical alerts
- **Border**: `#E5E7EB` - Subtle borders and dividers

### Typography
- **Primary Font**: Inter or system font stack
- **Headings**: 
  - H1: `text-3xl font-bold` (30px, 700 weight)
  - H2: `text-2xl font-bold` (24px, 700 weight)
  - H3: `text-xl font-semibold` (20px, 600 weight)
  - H4: `text-lg font-medium` (18px, 500 weight)
- **Body Text**: `text-base` (16px, 400 weight)
- **Small Text**: `text-sm` (14px, 400 weight)
- **Micro Text**: `text-xs` (12px, 400 weight)

### Spacing System
- **Base Unit**: 4px (0.25rem)
- **Common Spacings**: 
  - xs: 4px (`space-y-1`, `p-1`)
  - sm: 8px (`space-y-2`, `p-2`)
  - md: 16px (`space-y-4`, `p-4`)
  - lg: 24px (`space-y-6`, `p-6`)
  - xl: 32px (`space-y-8`, `p-8`)

## Header Design

### Top Navigation Bar
- **Height**: 176px (44 * 4 = `h-44`)
- **Background**: `#fdfdfd` with subtle border bottom `border-b border-[#2E8BC0]/20`
- **Padding**: 16px horizontal (`px-4`)

### Logo Center Design
- **Container**: Centered flex container with full height
- **Logo Wrapper**: 
  - Circular container with metallic effect
  - Dimensions: 180px x 180px (`h-[180px] w-[180px]`)
  - Border radius: Full circle (`rounded-full`)
  - Metallic gradient effect with subtle shadow

### Navigation Elements
- **Left Side - Orientation Button**:
  - Position: `absolute left-4 top-1/2 transform -translate-y-1/2`
  - Design: Vertical stack with 3 metallic dots and text
  - Dots: 10px x 10px circles with metallic gradient
  - Text: Two-line layout - "KGC" (16px bold) over "Orientation" (14px regular)
  - Hover effect: `hover:bg-[#2E8BC0]/10 rounded-md`

- **Right Side - Menu Button**:
  - Position: `absolute right-4 top-1/2 transform -translate-y-1/2`
  - Design: Text "Menu" (18px semibold) with 3 metallic dots
  - Same dot styling as orientation button
  - Same hover effect

### Logo Animation
- **Trigger**: On any page navigation or location change
- **Animation**: 2-second pulse/glow effect
- **CSS Class**: `logo-animation` with scaling and glow transforms

## Main Content Layout

### Container Structure
- **Wrapper**: Full screen flex column (`flex flex-col h-screen`)
- **Content Area**: Flex-1 with auto overflow (`flex-1 overflow-y-auto`)
- **Padding**: 16px on all sides (`p-4`)
- **Background**: `#fdfdfd`

### User Authentication Header
- **Height**: Auto-sizing based on content
- **Background**: White with subtle border
- **Content**: User status, role indicators, impersonation notices

## Dashboard Card Design

### Card Component Structure
```
Card Container:
- Background: White
- Border: 1px solid #E5E7EB
- Border radius: 8px (rounded-lg)
- Padding: 24px (p-6)
- Shadow: Subtle drop shadow
- Hover: Subtle scale transform
```

### Health Metrics Display
- **Layout**: Grid system - 1 column mobile, 3 columns desktop
- **Metric Cards**:
  - Individual score displays with colored indicators
  - Progress bars with matching colors
  - Large score numbers (32px font) with /100 suffix
  - Colored backgrounds: Blue (medication), Green (diet), Purple (exercise)

### Feature Cards
- **Consistent Structure**:
  - Icon (24px) in top-left with colored background circle
  - Title (18px semibold)
  - Description (14px regular, muted color)
  - Action button or interactive element
  - Hover states with subtle elevation

## Interactive Elements

### Buttons
- **Primary Button**:
  - Background: `#2E8BC0`
  - Text: White
  - Padding: 12px 24px
  - Border radius: 6px
  - Hover: Darker blue with subtle shadow
  - Active: Pressed state with haptic feedback

- **Secondary Button**:
  - Background: White
  - Border: 1px solid #E5E7EB
  - Text: `#676767`
  - Same padding and radius as primary
  - Hover: Light gray background

- **Danger Button**:
  - Background: `#EF4444`
  - Text: White
  - Used for destructive actions

### Form Elements
- **Input Fields**:
  - Background: White
  - Border: 1px solid #E5E7EB
  - Focus: Border color changes to `#2E8BC0`
  - Padding: 12px 16px
  - Border radius: 6px
  - Placeholder: `#9CA3AF`

- **Textareas**:
  - Same styling as input fields
  - Minimum height: 96px
  - Resize: Vertical only

### Progress Indicators
- **Progress Bars**:
  - Background: `#E5E7EB`
  - Fill: Contextual color (blue, green, purple)
  - Height: 8px
  - Border radius: Full (rounded-full)
  - Smooth animation on value changes

## Modal and Overlay Design

### Modal Structure
- **Backdrop**: Black with 80% opacity (`bg-black bg-opacity-80`)
- **Modal Container**: 
  - Centered with flexbox
  - White background
  - Rounded corners (8px)
  - Maximum width: 512px
  - Padding: 24px
  - Drop shadow: Large shadow for depth

### Close Button
- **Position**: Absolute top-right
- **Design**: Circular red button with white X icon
- **Size**: 32px x 32px
- **Hover**: Darker red background

## Responsive Design

### Mobile Layout (< 768px)
- **Navigation**: 
  - Burger menu becomes more prominent
  - Logo scales down slightly
  - Touch targets minimum 44px
- **Cards**: Stack vertically with full width
- **Grid**: Single column layout
- **Spacing**: Reduced padding (12px instead of 16px)

### Desktop Layout (≥ 768px)
- **Navigation**: Full layout with side elements
- **Cards**: Multi-column grid layouts
- **Spacing**: Full padding specifications
- **Hover States**: More prominent hover effects

## Animation and Transitions

### Micro-Interactions
- **Duration**: 200ms for most transitions
- **Easing**: `ease-in-out` for smooth feel
- **Hover Effects**: Subtle scale (1.02x) and shadow changes
- **Focus States**: Smooth color transitions
- **Loading States**: Spinning indicators with fade-in

### Page Transitions
- **Logo Animation**: 2-second pulse on navigation
- **Card Entrance**: Staggered fade-in with slide-up
- **Modal Entrance**: Scale from center with backdrop fade

## Accessibility Features

### Visual Accessibility
- **Color Contrast**: All text meets WCAG AA standards
- **Focus Indicators**: Clear blue outline on keyboard focus
- **Touch Targets**: Minimum 44px for mobile interactions
- **Text Scaling**: Supports up to 200% zoom

### Keyboard Navigation
- **Tab Order**: Logical flow through interactive elements
- **Keyboard Shortcuts**: Arrow keys for tab navigation
- **Escape Key**: Closes modals and overlays
- **Enter/Space**: Activates buttons and links

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Live Regions**: Status updates announced to screen readers
- **Alt Text**: Descriptive alternative text for images

## Component-Specific Design

### Keep Going Feature
- **Button Design**: Large, prominent button with vibrant color
- **Animation**: Pulsing/vibrating effect on interaction
- **Overlay**: Full-screen video overlay with image integration
- **Image Processing**: Circular crop with star enhancement effects

### Health Score Input
- **Slider Design**: Custom styled range input
- **Value Display**: Large, prominent score number
- **Color Coding**: Dynamic color based on score ranges
- **Feedback**: Immediate visual and haptic feedback

### Chat Interface
- **Message Bubbles**: 
  - User messages: Right-aligned, blue background
  - AI responses: Left-aligned, gray background
  - Padding: 12px 16px
  - Border radius: 18px
  - Maximum width: 70% of container

### Progress Milestones
- **Milestone Cards**: 
  - Checkbox-style completion indicators
  - Category color coding
  - Progress percentage bars
  - Achievement badges for completed items

## Notification System

### Toast Notifications
- **Position**: Top-right corner
- **Design**: White background with colored left border
- **Duration**: 4 seconds for info, 6 seconds for errors
- **Animation**: Slide in from right, fade out
- **Stacking**: Multiple toasts stack vertically

### In-App Alerts
- **Banner Style**: Full-width colored bars
- **Icon**: Contextual icon (info, warning, error, success)
- **Dismissible**: X button in top-right
- **Responsive**: Adjusts to container width

## Error States

### Empty States
- **Illustration**: Simple, healthcare-themed icons
- **Message**: Clear, friendly explanation
- **Action**: Prominent button to resolve the state
- **Spacing**: Generous white space around content

### Loading States
- **Skeletons**: Gray placeholder blocks matching content structure
- **Spinners**: Circular loading indicators for async actions
- **Progress**: Linear progress for multi-step processes
- **Feedback**: Clear messaging about what's loading

## Implementation Notes

### CSS Framework
- **Tailwind CSS**: Primary utility framework
- **Custom Classes**: Minimal custom CSS for unique effects
- **Responsive**: Mobile-first approach with breakpoint prefixes
- **Dark Mode**: Not implemented but structure supports it

### Component Libraries
- **shadcn/ui**: Base component library
- **Lucide Icons**: Icon system throughout application
- **React Hook Form**: Form handling with validation
- **Tailwind Merge**: Utility for combining classes

### Performance Considerations
- **Lazy Loading**: Images and heavy components load on demand
- **Memoization**: React.memo for expensive re-renders
- **Code Splitting**: Route-based code splitting
- **Optimistic Updates**: Immediate UI feedback before server response

This guide provides the complete visual and interaction specification for replicating the KGC patient dashboard UI/UX. Each section contains specific measurements, colors, and behavioral details needed for accurate implementation.
