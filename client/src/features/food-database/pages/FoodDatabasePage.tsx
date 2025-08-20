import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';


// Import feature-specific components
import FoodCard from '../components/FoodCard';
import OfflineStatus from '../components/OfflineStatus';

// Import feature-specific hooks
import { useOfflineStorage } from '../hooks/useOfflineStorage';
import { useCpdAlignedFoods, useFavouriteFoods } from '../api/hooks';
import { FoodItem } from '../types';

const FoodDatabasePage: React.FC = () => {
  // Reuben Collins - Patient (userId=2)
  const userId = 2;
  
  // Use our custom hooks
  const { 
    isOnline, 
    offlineStatus, 
    refreshCache 
  } = useOfflineStorage({ userId });
  
  // Fetch CPD-aligned foods - only retry if we don't have offline cache
  const { 
    data: cpdAlignedData, 
    isLoading: cpdAlignedLoading 
  } = useCpdAlignedFoods(!offlineStatus.cached);
  
  // Fetch favourites
  const { 
    data: favourites, 
    isLoading: favouritesLoading 
  } = useFavouriteFoods();
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">CPD-Aligned Foods</h1>
      </div>
      
      {/* Offline status component */}
      <OfflineStatus 
        isOnline={isOnline} 
        status={offlineStatus} 
        onRefresh={refreshCache} 
      />
      
      {/* CPD-aligned foods explanation */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Care Plan Aligned Food Recommendations</AlertTitle>
        <AlertDescription>
          These food suggestions align with your doctor's Care Plan Directives. For specific food questions or broader dietary advice, please use the KGC Chatbot.
        </AlertDescription>
      </Alert>
      
      {/* CPD-aligned foods badge/alert */}
      {cpdAlignedData?.alignment === 'cpd-specific' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
          <h3 className="font-semibold text-blue-800 mb-1">Your Dietary Considerations</h3>
          <p className="text-sm text-blue-700 mb-2">
            Based on your Care Plan, these dietary factors have been considered:
          </p>
          <div className="flex flex-wrap gap-1">
            {cpdAlignedData.relevantTags.map(tag => (
              <Badge key={tag} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Food list */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">
          Recommended Foods
          {cpdAlignedData?.alignment === 'cpd-specific' ? ' (Personalised)' : ' (General)'}
        </h2>
        {renderFoodList(cpdAlignedData?.foods || [], cpdAlignedLoading)}
      </div>
      
      {/* Favourites section */}
      {favourites && favourites.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Your Favourites</h2>
          {renderFoodList(favourites, favouritesLoading, true)}
        </div>
      )}
    </div>
  );
  
  // Helper function to render food list
  function renderFoodList(foods: FoodItem[], isLoading: boolean, isFavourite = false) {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-md" />
          ))}
        </div>
      );
    }
    
    if (!foods?.length) {
      return (
        <div className="text-center p-8 border rounded-md">
          <p className="text-muted-foreground">No food recommendations found. Please consult with your doctor for updated Care Plan Directives.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {foods.map(food => (
          <FoodCard key={food.id} food={food} isFavourite={isFavourite} />
        ))}
      </div>
    );
  }
};

export default FoodDatabasePage;