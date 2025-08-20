# Exercise & Wellness Feature - Complete Styling & Design Guide

## Design System Overview

### Color Palette
```css
/* KGC Brand Colors */
:root {
  --primary: #3b82f6;           /* Blue primary */
  --primary-hover: #2563eb;     /* Darker blue for hover states */
  --secondary: #6b7280;         /* Gray secondary */
  --muted: #f8fafc;            /* Light gray backgrounds */
  --muted-foreground: #6b7280; /* Muted text */
  --destructive: #ef4444;       /* Red for warnings/errors */
  --success: #10b981;           /* Green for success states */
  --warning: #f59e0b;           /* Yellow for warnings */
}
```

### Typography Scale
```css
/* Typography System */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }    /* Page titles */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; } /* Section headers */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; } /* Card titles */
.text-base { font-size: 1rem; line-height: 1.5rem; }    /* Body text */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; } /* Small text */
.text-xs { font-size: 0.75rem; line-height: 1rem; }     /* Captions */

/* Font weights */
.font-bold { font-weight: 700; }     /* Page headers */
.font-semibold { font-weight: 600; } /* Card titles */
.font-medium { font-weight: 500; }   /* Labels */
.font-normal { font-weight: 400; }   /* Body text */
```

---

## Component-Specific Styling

### 1. Page Layout
```css
.ew-page-container {
  @apply container mx-auto p-4;
  max-width: 1200px;
}

.ew-page-title {
  @apply text-2xl font-bold mb-6 text-gray-900;
}
```

### 2. Care Plan Directive Card
```css
.cpd-card {
  @apply mb-6 border-l-4 border-l-primary bg-white rounded-lg shadow-sm;
}

.cpd-card-content {
  @apply p-4;
}

.cpd-label {
  @apply text-sm font-medium text-muted-foreground mb-1;
}

.cpd-text {
  @apply whitespace-pre-line text-base text-gray-900 leading-relaxed;
}

.cpd-loading {
  @apply flex items-center p-4;
}

.cpd-loading-spinner {
  @apply h-5 w-5 animate-spin text-primary mr-2;
}
```

### 3. Search Configuration Card
```css
.search-config-card {
  @apply mb-6 bg-white rounded-lg shadow-sm border;
}

.search-config-header {
  @apply px-6 py-4 border-b;
}

.search-config-title {
  @apply text-lg font-semibold text-gray-900;
}

.search-config-description {
  @apply text-sm text-muted-foreground mt-1;
}

.search-config-content {
  @apply p-6;
}
```

### 4. Tab System
```css
.ew-tabs-list {
  @apply grid grid-cols-2 mb-6 bg-muted rounded-lg p-1;
}

.ew-tab-trigger {
  @apply flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium;
  @apply transition-all duration-200 ease-in-out;
  @apply data-[state=active]:bg-white data-[state=active]:text-primary;
  @apply data-[state=active]:shadow-sm;
}

.ew-tab-trigger:not([data-state="active"]) {
  @apply text-muted-foreground hover:text-gray-900;
}

.ew-tab-icon {
  @apply h-4 w-4 mr-2;
}
```

### 5. Form Controls
```css
/* Form Grid Layout */
.ew-form-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

/* Labels */
.ew-form-label {
  @apply text-sm font-medium text-gray-900 mb-2 block;
}

/* Select Controls */
.ew-select-trigger {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md;
  @apply bg-white text-gray-900 text-sm;
  @apply focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent;
  @apply transition-all duration-200 ease-in-out;
}

.ew-select-trigger:hover {
  @apply border-gray-400;
}

.ew-select-content {
  @apply bg-white border border-gray-200 rounded-md shadow-lg;
  @apply max-h-60 overflow-auto;
}

.ew-select-item {
  @apply px-3 py-2 text-sm text-gray-900;
  @apply hover:bg-gray-100 cursor-pointer;
  @apply data-[highlighted]:bg-gray-100;
}
```

### 6. Tag Selection System
```css
.ew-tag-container {
  @apply flex flex-wrap gap-2 mt-2;
}

.ew-tag {
  @apply inline-flex items-center px-3 py-1 rounded-full text-xs font-medium;
  @apply cursor-pointer transition-all duration-200 ease-in-out;
  @apply border;
}

.ew-tag--selected {
  @apply bg-primary text-white border-primary;
}

.ew-tag--unselected {
  @apply bg-gray-100 text-gray-700 border-gray-300;
  @apply hover:bg-gray-200 hover:border-gray-400;
}

.ew-tag:focus {
  @apply outline-none ring-2 ring-primary ring-offset-2;
}
```

### 7. Search Button
```css
.ew-search-button {
  @apply w-full md:w-auto mt-4 px-6 py-2;
  @apply bg-primary text-white font-medium text-sm rounded-md;
  @apply hover:bg-primary-hover focus:bg-primary-hover;
  @apply focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2;
  @apply transition-all duration-200 ease-in-out;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.ew-search-button-icon {
  @apply h-4 w-4 mr-2;
}
```

---

## Video Card Styling

### 8. Video Card Container
```css
.ew-video-card {
  @apply bg-white rounded-lg shadow-sm border overflow-hidden;
  @apply transition-all duration-200 ease-in-out;
  @apply hover:shadow-md hover:-translate-y-1;
}

.ew-video-card:focus-within {
  @apply ring-2 ring-primary ring-offset-2;
}
```

### 9. Video Thumbnail Section
```css
.ew-video-thumbnail {
  @apply relative w-full h-48 bg-gray-200;
}

.ew-video-image {
  @apply w-full h-full object-cover;
}

/* Overlay Elements */
.ew-duration-badge {
  @apply absolute bottom-2 right-2 px-2 py-1;
  @apply bg-black bg-opacity-70 text-white text-xs rounded;
}

.ew-intensity-badge {
  @apply absolute top-2 left-2 px-2 py-1;
  @apply text-white text-xs rounded font-medium;
}

.ew-intensity-badge--low {
  @apply bg-green-500;
}

.ew-intensity-badge--moderate {
  @apply bg-yellow-500;
}

.ew-intensity-badge--high {
  @apply bg-red-500;
}

/* Play Button Overlay */
.ew-play-overlay {
  @apply absolute inset-0 flex items-center justify-center;
  @apply bg-black bg-opacity-30 opacity-0 transition-opacity duration-200;
}

.ew-video-thumbnail:hover .ew-play-overlay {
  @apply opacity-100;
}

.ew-play-button {
  @apply h-12 w-12 bg-white bg-opacity-90 rounded-full;
  @apply flex items-center justify-center text-gray-900;
  @apply transition-transform duration-200;
  @apply hover:scale-110 focus:scale-110;
}
```

### 10. Video Card Content
```css
.ew-video-content {
  @apply p-4;
}

.ew-video-title {
  @apply font-semibold text-lg mb-1 text-gray-900;
  @apply line-clamp-1; /* Requires @tailwindcss/line-clamp plugin */
}

.ew-video-meta {
  @apply flex justify-between items-center mb-3;
}

.ew-video-source {
  @apply text-gray-500 text-sm;
}

.ew-video-category-badge {
  @apply px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded;
}
```

### 11. AI Analysis Section
```css
.ew-ai-analysis {
  @apply border border-gray-200 rounded-md p-3 mb-3 bg-gray-50;
}

.ew-ai-analysis-header {
  @apply text-sm font-medium mb-2 text-gray-900;
}

.ew-ai-analysis-content {
  @apply space-y-2 text-sm;
}

.ew-ai-analysis-row {
  @apply flex justify-between items-center;
}

.ew-ai-analysis-label {
  @apply text-muted-foreground;
}

.ew-ai-analysis-value {
  @apply font-medium text-gray-900;
}

/* Badge containers within AI analysis */
.ew-ai-badge-container {
  @apply flex flex-wrap gap-1 mt-1;
}

.ew-ai-badge {
  @apply px-2 py-1 bg-white border border-gray-300 text-gray-700;
  @apply text-xs rounded;
}

/* Precautions section */
.ew-precautions {
  @apply mt-2;
}

.ew-precautions-header {
  @apply flex items-center gap-1 text-red-500 mb-1;
}

.ew-precautions-icon {
  @apply h-3 w-3;
}

.ew-precautions-label {
  @apply text-xs font-medium;
}

.ew-precautions-text {
  @apply text-xs text-red-500;
}

.ew-precautions-more {
  @apply text-xs text-red-400;
}
```

### 12. Video Card Actions
```css
.ew-video-actions {
  @apply flex justify-between gap-2;
}

.ew-action-button {
  @apply px-3 py-2 text-sm font-medium rounded-md;
  @apply transition-all duration-200 ease-in-out;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.ew-action-button--watch {
  @apply border border-gray-300 text-gray-700 bg-white;
  @apply hover:bg-gray-50 hover:border-gray-400;
  @apply focus:ring-gray-500;
}

.ew-action-button--save {
  @apply text-gray-700;
  @apply hover:bg-gray-100;
  @apply focus:ring-gray-500;
}

.ew-action-button--save-active {
  @apply bg-primary text-white;
  @apply hover:bg-primary-hover;
  @apply focus:ring-primary;
}

.ew-action-icon {
  @apply h-4 w-4 mr-1;
}
```

---

## Loading States

### 13. Loading Animations
```css
.ew-loading-container {
  @apply col-span-2 flex flex-col items-center justify-center p-12;
}

.ew-loading-spinner {
  @apply h-10 w-10 text-primary mb-4;
  animation: spin 1s linear infinite;
}

.ew-loading-text {
  @apply text-lg text-gray-600;
}

/* Custom spin animation for consistency */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 14. Empty States
```css
.ew-empty-state {
  @apply col-span-2 flex flex-col items-center justify-center p-12 text-center;
}

.ew-empty-state-text {
  @apply text-lg mb-4 text-gray-600;
}

.ew-empty-state-button {
  @apply bg-primary text-white hover:bg-primary-hover;
  @apply px-6 py-2 rounded-md font-medium text-sm;
  @apply transition-colors duration-200;
}
```

---

## Responsive Design

### 15. Mobile Optimizations
```css
/* Mobile-specific adjustments */
@media (max-width: 768px) {
  .ew-page-container {
    @apply p-2;
  }
  
  .ew-form-grid {
    @apply grid-cols-1 gap-3;
  }
  
  .ew-video-grid {
    @apply grid-cols-1 gap-4;
  }
  
  .ew-search-button {
    @apply w-full;
  }
  
  .ew-video-actions {
    @apply flex-col gap-2;
  }
  
  .ew-action-button {
    @apply w-full justify-center;
  }
  
  .ew-tag-container {
    @apply gap-1;
  }
  
  .ew-tag {
    @apply text-xs px-2 py-1;
  }
}
```

### 16. Desktop Enhancements
```css
/* Desktop-specific improvements */
@media (min-width: 1024px) {
  .ew-page-container {
    @apply p-6;
  }
  
  .ew-video-grid {
    @apply grid-cols-3 gap-6;
  }
  
  .ew-video-card:hover {
    @apply scale-105;
  }
}
```

---

## Accessibility Features

### 17. Focus Management
```css
/* Focus styles for keyboard navigation */
.ew-focusable {
  @apply focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2;
}

/* Skip link for screen readers */
.ew-skip-link {
  @apply sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4;
  @apply bg-primary text-white px-4 py-2 rounded-md z-50;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .ew-video-card {
    @apply border-2 border-gray-900;
  }
  
  .ew-tag--selected {
    @apply bg-gray-900 border-gray-900;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .ew-video-card,
  .ew-action-button,
  .ew-tag,
  .ew-play-button {
    @apply transition-none;
  }
  
  .ew-loading-spinner {
    animation: none;
  }
}
```

### 18. Screen Reader Support
```css
/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only.focusable:active,
.sr-only.focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## Custom Utility Classes

### 19. Layout Utilities
```css
/* Line clamping for text truncation */
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.line-clamp-3 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
```

### 20. Animation Utilities
```css
/* Smooth transitions */
.transition-all-smooth {
  transition: all 0.2s ease-in-out;
}

.transition-colors-smooth {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Hover effects */
.hover-lift {
  @apply transition-transform duration-200;
}

.hover-lift:hover {
  @apply -translate-y-1;
}

/* Scale effects */
.hover-scale {
  @apply transition-transform duration-200;
}

.hover-scale:hover {
  @apply scale-105;
}
```

This comprehensive styling guide ensures the Exercise & Wellness feature maintains consistent visual design and optimal user experience across all devices and use cases.