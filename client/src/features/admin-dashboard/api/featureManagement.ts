import { apiRequest } from '@/lib/apiRequest'; // Corrected import path

// Type definitions for feature management API
export interface FeatureConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, any>;
}

// API to get all feature configurations
export async function getFeatureConfigurations(): Promise<Record<string, FeatureConfig>> {
  return apiRequest<Record<string, FeatureConfig>>('/api/admin/features', 'GET');
}

// API to update a feature's configuration
export async function updateFeatureConfiguration(
  featureId: string, 
  config: Partial<FeatureConfig>
): Promise<FeatureConfig> {
  return apiRequest<FeatureConfig>('PATCH', `/api/admin/features/${featureId}`, config);
}

// API to enable or disable a feature
export async function setFeatureEnabled(featureId: string, enabled: boolean): Promise<FeatureConfig> {
  return apiRequest<FeatureConfig>('PATCH', `/api/admin/features/${featureId}/enabled`, { enabled });
}

// API to reset a feature to default configuration
export async function resetFeatureConfiguration(featureId: string): Promise<FeatureConfig> {
  return apiRequest<FeatureConfig>('POST', `/api/admin/features/${featureId}/reset`);
}