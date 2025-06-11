import { apiRequest } from '@/lib/queryClient';

// Type definitions for feature management API
export interface FeatureConfig {
  id: string;
  enabled: boolean;
  config?: Record<string, any>;
}

// API to get all feature configurations
export async function getFeatureConfigurations(): Promise<Record<string, FeatureConfig>> {
  const response = await apiRequest('GET', '/api/admin/features');
  return response.json();
}

// API to update a feature's configuration
export async function updateFeatureConfiguration(
  featureId: string, 
  config: Partial<FeatureConfig>
): Promise<FeatureConfig> {
  const response = await apiRequest('PATCH', `/api/admin/features/${featureId}`, config);
  return response.json();
}

// API to enable or disable a feature
export async function setFeatureEnabled(featureId: string, enabled: boolean): Promise<FeatureConfig> {
  const response = await apiRequest('PATCH', `/api/admin/features/${featureId}/enabled`, { enabled });
  return response.json();
}

// API to reset a feature to default configuration
export async function resetFeatureConfiguration(featureId: string): Promise<FeatureConfig> {
  const response = await apiRequest('POST', `/api/admin/features/${featureId}/reset`);
  return response.json();
}