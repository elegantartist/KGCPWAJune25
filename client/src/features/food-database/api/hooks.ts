import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiRequest'; // Corrected import path
import { FoodItem, CpdAlignedResponse } from '../types';

// Hook for fetching CPD-aligned foods
export const useCpdAlignedFoods = (retry = true) => {
  return useQuery<CpdAlignedResponse>({
    queryKey: ['/api/food-database/cpd-aligned'],
    retry,
  });
};

// Hook for fetching favourite foods
export const useFavouriteFoods = () => {
  return useQuery<FoodItem[]>({
    queryKey: ['/api/food-database/favourites'],
    retry: false,
  });
};

// Hook for toggling food item favourite status
export const useToggleFavourite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (foodItemId: number) => {
      // Assuming the API returns the updated favourite status or the item
      // Let's assume it returns { isFavourite: boolean } or the FoodItem
      return apiRequest<{ isFavourite: boolean }>('POST', '/api/food-database/favourites/toggle', { foodItemId });
    },
    onSuccess: () => {
      // Invalidate favourites query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/food-database/favourites'] });
    },
  });
};