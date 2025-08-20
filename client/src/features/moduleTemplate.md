# KGC Feature Module Structure

This document outlines the recommended structure for each KGC feature module. Following this structure will ensure proper separation of concerns and maintainability.

## Directory Structure

```
client/src/features/[feature-name]/
├── api/                # API integration for this feature
│   ├── endpoints.ts    # API endpoint definitions
│   └── hooks.ts        # React Query hooks for data fetching
├── components/         # UI components specific to this feature
│   ├── FeatureCard.tsx # Main component
│   └── ...             # Other components
├── context/            # Context providers if needed
│   └── FeatureContext.tsx
├── hooks/              # Custom hooks for this feature
│   └── useFeatureLogic.ts
├── pages/              # Page components for this feature
│   └── FeaturePage.tsx # Main page
├── utils/              # Utility functions
│   └── helpers.ts
├── types.ts            # Type definitions
├── constants.ts        # Constants and configuration
└── index.ts            # Public API of the feature module
```

## Feature Module Integration

Each feature should export its public API through its index.ts file:

```typescript
// features/[feature-name]/index.ts
export { default as FeaturePage } from './pages/FeaturePage';
export * from './types';
export * from './constants';
// Export any other components or utilities that should be accessible outside the feature
```

## Feature Module Registration

To register your feature in the KGC application:

1. Add your feature configuration to the `features` object in `featureRegistry.ts`
2. Create the necessary route in `App.tsx` using the exported page component
3. Ensure your feature respects the enabled/disabled state from the registry

## Dependencies

If your feature depends on shared services (like the KGC Chatbot):

1. List these dependencies in your feature's configuration
2. Use dependency injection patterns to access these services
3. Handle gracefully when dependencies are not available

## Admin Configuration

If your feature is admin-configurable:

1. Create a corresponding configuration component in `features/admin-dashboard/components/[feature-name]-config.tsx`
2. Ensure all configuration options are properly documented
3. Implement proper validation for configuration changes

## Best Practices

1. Keep feature-specific code within the feature module
2. Minimize dependencies between features
3. Use the application's central state management only when necessary
4. Include proper error handling and fallbacks
5. Document any non-obvious implementation details