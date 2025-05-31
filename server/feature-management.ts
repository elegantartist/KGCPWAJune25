import fs from 'fs';
import path from 'path';

// Define types for feature configuration
export interface FeatureConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, any>;
}

// In-memory cache of feature configurations (in a real app, this would be stored in the database)
let featureConfigurations: Record<string, FeatureConfig> = {};

// File path for persisting feature configurations
const configFilePath = path.join(__dirname, '../data/feature-configs.json');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load feature configurations from disk on startup
export function loadFeatureConfigurations(): Record<string, FeatureConfig> {
  try {
    if (fs.existsSync(configFilePath)) {
      const fileContent = fs.readFileSync(configFilePath, 'utf8');
      featureConfigurations = JSON.parse(fileContent);
      console.log('Loaded feature configurations from disk');
    } else {
      console.log('No feature configuration file found, using defaults');
      // Initialize with default configurations for all features
      initializeDefaultConfigurations();
    }
  } catch (error) {
    console.error('Error loading feature configurations:', error);
    // Initialize defaults if there's an error
    initializeDefaultConfigurations();
  }
  
  return featureConfigurations;
}

// Initialize default configurations for all features
function initializeDefaultConfigurations() {
  // These would typically come from the feature registry
  const defaultFeatures = [
    { id: 'dailySelfScores', enabled: true },
    { id: 'motivationalImageProcessing', enabled: true },
    { id: 'inspirationMachineD', enabled: true },
    { id: 'dietLogistics', enabled: true },
    { id: 'inspirationMachineEW', enabled: true },
    { id: 'ewSupport', enabled: true },
    { id: 'mbpWiz', enabled: true },
    { id: 'journaling', enabled: true },
    { id: 'progressMilestones', enabled: true },
    { id: 'foodDatabase', enabled: true },
    { id: 'chatbot', enabled: true },
    { id: 'doctorDashboard', enabled: true },
    { id: 'adminDashboard', enabled: true },
  ];
  
  featureConfigurations = {};
  defaultFeatures.forEach(feature => {
    featureConfigurations[feature.id] = {
      id: feature.id,
      enabled: feature.enabled,
      config: {},
    };
  });
  
  // Persist the default configurations
  saveFeatureConfigurations();
}

// Save feature configurations to disk
export function saveFeatureConfigurations(): void {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(featureConfigurations, null, 2), 'utf8');
    console.log('Saved feature configurations to disk');
  } catch (error) {
    console.error('Error saving feature configurations:', error);
  }
}

// Get all feature configurations
export function getAllFeatureConfigurations(): Record<string, FeatureConfig> {
  return { ...featureConfigurations };
}

// Get a specific feature configuration
export function getFeatureConfiguration(featureId: string): FeatureConfig | undefined {
  return featureConfigurations[featureId];
}

// Update a feature configuration
export function updateFeatureConfiguration(
  featureId: string, 
  updates: Partial<FeatureConfig>
): FeatureConfig | undefined {
  const feature = featureConfigurations[featureId];
  if (!feature) return undefined;
  
  // Update the feature
  featureConfigurations[featureId] = {
    ...feature,
    ...updates,
    id: featureId, // Ensure ID doesn't change
    config: {
      ...(feature.config || {}),
      ...(updates.config || {}),
    }
  };
  
  // Persist changes
  saveFeatureConfigurations();
  
  return featureConfigurations[featureId];
}

// Enable or disable a feature
export function setFeatureEnabled(featureId: string, enabled: boolean): FeatureConfig | undefined {
  const feature = featureConfigurations[featureId];
  if (!feature) return undefined;
  
  // Update enabled state
  featureConfigurations[featureId] = {
    ...feature,
    enabled,
  };
  
  // Persist changes
  saveFeatureConfigurations();
  
  return featureConfigurations[featureId];
}

// Reset a feature to defaults
export function resetFeatureConfiguration(featureId: string): FeatureConfig | undefined {
  const feature = featureConfigurations[featureId];
  if (!feature) return undefined;
  
  // Reset to defaults (in this simple implementation, just enable it with empty config)
  featureConfigurations[featureId] = {
    id: featureId,
    enabled: true,
    config: {},
  };
  
  // Persist changes
  saveFeatureConfigurations();
  
  return featureConfigurations[featureId];
}

// Load configurations on module import
loadFeatureConfigurations();