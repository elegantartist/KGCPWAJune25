import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getFeatureConfigurations, 
  updateFeatureConfiguration, 
  setFeatureEnabled,
  resetFeatureConfiguration,
  FeatureConfig 
} from '../api/featureManagement';

// Hook for managing features from the admin dashboard
export function useFeatureManagement() {
  const queryClient = useQueryClient();
  const queryKey = ['/api/admin/features'];
  
  // Query to get all feature configurations
  const { 
    data: features, 
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey,
    queryFn: getFeatureConfigurations,
  });
  
  // Mutation to update a feature's configuration
  const updateFeatureMutation = useMutation({
    mutationFn: ({ 
      featureId, 
      config 
    }: { 
      featureId: string, 
      config: Partial<FeatureConfig> 
    }) => {
      return updateFeatureConfiguration(featureId, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  
  // Mutation to enable or disable a feature
  const toggleFeatureMutation = useMutation({
    mutationFn: ({ 
      featureId, 
      enabled 
    }: { 
      featureId: string, 
      enabled: boolean 
    }) => {
      return setFeatureEnabled(featureId, enabled);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  
  // Mutation to reset a feature to its default configuration
  const resetFeatureMutation = useMutation({
    mutationFn: (featureId: string) => {
      return resetFeatureConfiguration(featureId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  
  return {
    features,
    isLoading,
    error,
    refetch,
    updateFeature: updateFeatureMutation.mutateAsync,
    toggleFeature: toggleFeatureMutation.mutateAsync,
    resetFeature: resetFeatureMutation.mutateAsync,
    isUpdating: updateFeatureMutation.isPending,
    isToggling: toggleFeatureMutation.isPending,
    isResetting: resetFeatureMutation.isPending,
  };
}