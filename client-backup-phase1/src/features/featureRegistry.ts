// Feature Registry for KGC Application
// This centralized registry allows for easy enabling/disabling of features

// Feature metadata interface
export interface FeatureConfig {
  id: string;           // Unique identifier for the feature
  name: string;         // Display name
  enabled: boolean;     // Whether the feature is enabled
  menuPath: string;     // URL path for menu navigation
  description: string;  // Brief description of what the feature does
  adminConfigurable: boolean; // Whether this feature can be configured from Admin Dashboard
  requiresAuth: boolean; // Whether this feature requires authentication
  dashboardCategory: 'patient' | 'doctor' | 'admin' | 'all'; // Which dashboard this feature belongs to
  dependencies: string[]; // Features that this feature depends on (by ID)
}

// Define all application features
const features: Record<string, FeatureConfig> = {
  // Patient dashboard core features
  dailySelfScores: {
    id: 'dailySelfScores',
    name: 'Daily Self Scores',
    enabled: true,
    menuPath: '/profile',
    description: 'Track daily health metrics and view progress over time',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  motivationalImageProcessing: {
    id: 'motivationalImageProcessing',
    name: 'MIP',
    enabled: true,
    menuPath: '/motivation',
    description: 'Upload and enhance a motivational image, integrated with the "Keep Going" button and its offline functionality',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  inspirationMachineD: {
    id: 'inspirationMachineD',
    name: 'Inspiration Machine D',
    enabled: true,
    menuPath: '/inspiration-d',
    description: 'Diet and nutrition inspiration and suggestions',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  dietLogistics: {
    id: 'dietLogistics',
    name: 'Diet Logistics',
    enabled: true,
    menuPath: '/diet-logistics',
    description: 'Tools for planning and managing diet adherence',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: ['inspirationMachineD'],
  },
  inspirationMachineEW: {
    id: 'inspirationMachineEW',
    name: 'Inspiration Machine E&W',
    enabled: true,
    menuPath: '/inspiration-ew',
    description: 'Provides 10 YouTube videos of workouts, yoga, meditation, Pilates, or other relevant activities based on preferences and ability level',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  ewSupport: {
    id: 'ewSupport',
    name: 'E&W Support',
    enabled: true,
    menuPath: '/ew-support',
    description: 'Provides a search function for local gyms, personal trainers, yoga, and Pilates studios based on patient location',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: ['inspirationMachineEW'],
  },
  mbpWiz: {
    id: 'mbpWiz',
    name: 'MBP Wiz',
    enabled: true,
    menuPath: '/mbp-wiz',
    description: 'Works with Chemist Warehouse to find best prices on medications not covered by PBS or private health insurance, and provides pharmacy location information',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  journaling: {
    id: 'journaling',
    name: 'Journaling',
    enabled: true,
    menuPath: '/journaling',
    description: 'Health journaling tools for tracking progress',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  healthSnapshots: {
    id: 'healthSnapshots',
    name: 'Health Snapshots',
    enabled: true,
    menuPath: '/health-snapshots',
    description: 'Visualize health metrics and track progress over time',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  progressMilestones: {
    id: 'progressMilestones',
    name: 'Progress Milestones',
    enabled: true,
    menuPath: '/progress-milestones',
    description: 'Track and celebrate health progress milestones',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  foodDatabase: {
    id: 'foodDatabase',
    name: 'Food Database',
    enabled: true,
    menuPath: '/food-database',
    description: 'Searchable database of nutrition information',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  chatbot: {
    id: 'chatbot',
    name: 'Chatbot',
    enabled: true,
    menuPath: '/chatbot',
    description: 'AI-powered health assistant chatbot',
    adminConfigurable: true,
    requiresAuth: true,
    dashboardCategory: 'patient',
    dependencies: [],
  },
  
  // Doctor dashboard features
  doctorDashboard: {
    id: 'doctorDashboard',
    name: 'Doctor Dashboard',
    enabled: true,
    menuPath: '/doctor-dashboard',
    description: 'Main dashboard for doctors to manage patients',
    adminConfigurable: false,
    requiresAuth: true,
    dashboardCategory: 'doctor',
    dependencies: [],
  },
  
  // Admin dashboard features
  adminDashboard: {
    id: 'adminDashboard',
    name: 'Admin Dashboard',
    enabled: true,
    menuPath: '/admin-dashboard',
    description: 'Administration dashboard for system management',
    adminConfigurable: false,
    requiresAuth: true,
    dashboardCategory: 'admin',
    dependencies: [],
  },
};

// Get a list of all enabled features
export function getEnabledFeatures(): FeatureConfig[] {
  return Object.values(features).filter(feature => feature.enabled);
}

// Get features for a specific dashboard
export function getFeaturesByDashboard(dashboard: 'patient' | 'doctor' | 'admin' | 'all'): FeatureConfig[] {
  return Object.values(features).filter(
    feature => feature.enabled && (feature.dashboardCategory === dashboard || feature.dashboardCategory === 'all')
  );
}

// Get a specific feature by ID
export function getFeatureById(id: string): FeatureConfig | undefined {
  return features[id];
}

// Check if a feature is enabled
export function isFeatureEnabled(id: string): boolean {
  return features[id]?.enabled || false;
}

// Check if a feature can be shown (enabled and all dependencies are enabled)
export function canShowFeature(id: string): boolean {
  const feature = features[id];
  if (!feature || !feature.enabled) return false;
  
  // Check if all dependencies are enabled
  return feature.dependencies.every(depId => isFeatureEnabled(depId));
}

// Enable or disable a feature
export function setFeatureEnabled(id: string, enabled: boolean): void {
  if (features[id]) {
    features[id].enabled = enabled;
  }
}

// Export the feature configuration object for admin use
export function getAllFeatures(): Record<string, FeatureConfig> {
  return { ...features };
}

// Get menu items for the current user based on their role
export function getMenuItems(role: 'patient' | 'doctor' | 'admin'): {
  path: string;
  name: string;
  id: string;
}[] {
  let dashboard: 'patient' | 'doctor' | 'admin' = role;
  
  return getFeaturesByDashboard(dashboard)
    .filter(feature => canShowFeature(feature.id))
    .map(feature => ({
      path: feature.menuPath,
      name: feature.name,
      id: feature.id
    }));
}