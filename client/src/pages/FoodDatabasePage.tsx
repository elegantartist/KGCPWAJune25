import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const FoodDatabasePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const { data: cpdAlignedFoods, isLoading: isLoadingCpdFoods } = useQuery({
    queryKey: ['cpd-aligned-foods'],
    queryFn: () => apiRequest('/api/food-database/cpd-aligned'),
  });

  const { data: favoriteFoods, isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['favorite-foods'],
    queryFn: () => apiRequest('/api/food-database/favourites'),
  });

  const searchFoodsMutation = useMutation({
    mutationFn: (searchTerm: string) => apiRequest(`/api/food-database/search?q=${searchTerm}`),
    onSuccess: (data: any) => {
      setSearchResults(data);
    },
    onError: (error: any) => {
      toast({ title: 'Error searching foods', description: error.message, variant: 'destructive' });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (foodId: number) => apiRequest('/api/food-database/favourites/toggle', { method: 'POST', body: { foodItemId: foodId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-foods'] });
      toast({ title: 'Favorites updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating favorites', description: error.message, variant: 'destructive' });
    },
  });

  const handleSearch = () => {
    if (searchTerm.trim() === '') return;
    searchFoodsMutation.mutate(searchTerm);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Food Database</h1>
      <div className="flex space-x-2">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for a food..."
        />
        <Button onClick={handleSearch} disabled={searchFoodsMutation.isPending}>
          {searchFoodsMutation.isPending ? 'Searching...' : 'Search'}
        </Button>
      </div>
      {/* ... (UI for displaying search results, CPD-aligned foods, and favorites) */}
    </div>
  );
};

export default FoodDatabasePage;
