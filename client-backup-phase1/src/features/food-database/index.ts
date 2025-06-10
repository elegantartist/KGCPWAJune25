// Export the main components and types for the Food Database feature

// Export the main page component
export { default as FoodDatabasePage } from './pages/FoodDatabasePage';

// Export components that might be reused elsewhere
export { default as FoodCard } from './components/FoodCard';
export { default as OfflineStatus } from './components/OfflineStatus';

// Export hooks for advanced usage
export { useOfflineStorage } from './hooks/useOfflineStorage';
export { useCpdAlignedFoods, useFavouriteFoods, useToggleFavourite } from './api/hooks';

// Export types
export * from './types';

// Feature metadata for the registry
export const featureMetadata = {
  id: 'foodDatabase',
  name: 'Food Database',
  description: 'CPD-aligned food recommendations and nutrition information',
  version: '1.0.0',
  // Add any other metadata that might be useful
};