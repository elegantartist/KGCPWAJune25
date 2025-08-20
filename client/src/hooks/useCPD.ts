import { useQuery } from "@tanstack/react-query";

export interface CarePlanDirective {
  id: number;
  userId: number;
  directive: string;
  category: string;
  targetValue: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Unified CPD (Care Plan Directives) hook for all patient dashboard features
 * Provides consistent loading, caching, and error handling across the application
 */
export function useCPD(userId: number | string | undefined) {
  const {
    data: carePlanDirectives = [],
    isLoading: loadingCPD,
    error: cpdError,
    refetch: refetchCPD
  } = useQuery<CarePlanDirective[]>({
    queryKey: [`/api/users/${userId}/care-plan-directives/active`],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes for real-time updates
  });

  // Helper functions to get specific directive types
  const getDietDirective = () => 
    carePlanDirectives.find(directive => 
      directive.category.toLowerCase() === 'diet' || 
      directive.category.toLowerCase() === 'nutrition'
    );

  const getExerciseDirective = () => 
    carePlanDirectives.find(directive => 
      directive.category.toLowerCase() === 'exercise' || 
      directive.category.toLowerCase() === 'fitness'
    );

  const getMedicationDirective = () => 
    carePlanDirectives.find(directive => 
      directive.category.toLowerCase() === 'medication' || 
      directive.category.toLowerCase() === 'medications' ||
      directive.category.toLowerCase() === 'prescription'
    );

  return {
    // Raw data
    carePlanDirectives,
    loadingCPD,
    cpdError,
    refetchCPD,
    
    // Helper functions
    getDietDirective,
    getExerciseDirective,
    getMedicationDirective,
    
    // Formatted content with fallbacks
    dietPlan: getDietDirective()?.directive || 'Your doctor has not yet provided a specific diet plan. Please check back later or contact your healthcare provider.',
    exercisePlan: getExerciseDirective()?.directive || 'Your doctor has not yet provided a specific exercise plan. Please check back later or contact your healthcare provider.',
    medicationPlan: getMedicationDirective()?.directive || 'Your doctor has not yet provided any medication care plan directives. Please check back later.',
    
    // Status indicators
    hasDietDirective: !!getDietDirective(),
    hasExerciseDirective: !!getExerciseDirective(),
    hasMedicationDirective: !!getMedicationDirective(),
    hasAnyDirectives: carePlanDirectives.length > 0
  };
}