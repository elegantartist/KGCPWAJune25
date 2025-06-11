import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Heart, Info, Cloud, CloudOff, AlertTriangle, Utensils, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Layout from '@/components/layout/Layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Food item type definition based on our schema
interface FoodItem {
  id: number;
  name: string;
  description: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  category: string;
  cpdRelevantTags: string[];
  nutritionData: Record<string, any> | null;
  imageUrl: string | null;
  source: string;
}

// CPD aligned foods response type
interface CpdAlignedResponse {
  foods: FoodItem[];
  relevantTags: string[];
  alignment: 'cpd-specific' | 'general';
}

// Interface for Care Plan Directives
interface CarePlanDirective {
  id: number;
  userId: number;
  directive: string;
  category: string;
  targetValue?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const FoodDatabase = () => {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [, setLocation] = useLocation();
  const [dietPlanDirective, setDietPlanDirective] = useState<string>('');
  const [loadingCPD, setLoadingCPD] = useState<boolean>(true);
  
  // Get current authenticated user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user/current-context'],
    retry: false
  });

  const userId = currentUser?.id;

  // Don't render anything if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access the Food Database.</p>
        </div>
      </div>
    );
  }
  
  // Online/offline status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      
      toast({
        title: "You're offline",
        description: "This feature requires an internet connection to work properly.",
        variant: "destructive"
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);
  
  // Fetch user's care plan directives
  const { data: carePlanDirectives = [] } = useQuery({
    queryKey: ['/api/users', userId, 'care-plan-directives', 'active'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/care-plan-directives/active`);
      if (!response.ok) {
        throw new Error('Failed to fetch care plan directives');
      }
      return response.json() as Promise<CarePlanDirective[]>;
    }
  });
  
  // Fetch and set the latest diet CPD
  useEffect(() => {
    const fetchCarePlanDirectives = async () => {
      try {
        setLoadingCPD(true);
        const response = await fetch(`/api/users/${userId}/care-plan-directives/active`);

        if (!response.ok) {
          throw new Error('Failed to fetch care plan directives');
        }

        const data = await response.json();

        // Find the diet directive
        const dietDirective = data.find((directive: any) => 
          directive.category.toLowerCase() === 'diet' || 
          directive.category.toLowerCase() === 'nutrition' ||
          directive.category.toLowerCase() === 'meal plan' ||
          directive.directive.toLowerCase().includes('diet') ||
          directive.directive.toLowerCase().includes('meal') ||
          directive.directive.toLowerCase().includes('food') ||
          directive.directive.toLowerCase().includes('eat')
        );

        if (dietDirective) {
          // Always display the doctor's exact Diet CPD text in the UI
          setDietPlanDirective(dietDirective.directive);
        } else {
          setDietPlanDirective('Your doctor has not yet provided any Diet care plan directives. Please check back later.');
        }
      } catch (error) {
        console.error('Error fetching care plan directives:', error);
        toast({
          title: "Error",
          description: "Failed to load care plan directives",
          variant: "destructive"
        });
        setDietPlanDirective('Could not load Diet care plan directives. Please try again later.');
      } finally {
        setLoadingCPD(false);
      }
    };

    fetchCarePlanDirectives();
  }, [userId, toast]);
  
  // Fetch CPD-aligned foods
  const { data: cpdAlignedData, isLoading: cpdAlignedLoading } = useQuery<CpdAlignedResponse>({
    queryKey: ['/api/food-database/cpd-aligned'],
    enabled: isOnline,
    retry: isOnline ? 3 : 0,
  });
  
  // Fetch favourites
  const { data: favourites, isLoading: favouritesLoading } = useQuery<FoodItem[]>({
    queryKey: ['/api/food-database/favourites'],
    enabled: isOnline,
    retry: isOnline ? 2 : 0,
  });
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Food Database</h1>
        <Button 
          onClick={() => setLocation('/inspiration-d')}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Utensils className="h-4 w-4" />
          Find Recipes
        </Button>
      </div>
      
      {/* Offline warning */}
      {!isOnline && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Internet Connection Required</AlertTitle>
          <AlertDescription>
            You are currently offline. This feature requires an internet connection to access your food recommendations.
            Please reconnect to continue.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Display Diet Plan Directive */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Your Diet Plan Directive</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCPD ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading your diet plan...</p>
            </div>
          ) : (
            <p className="text-sm">{dietPlanDirective}</p>
          )}
        </CardContent>
      </Card>
      
      {/* CPD-aligned foods explanation */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Care Plan Aligned Food Recommendations</AlertTitle>
        <AlertDescription>
          These food suggestions align with your doctor's Care Plan. For recipes that use these ingredients, click the "Find Recipes" button to access Inspiration Machine D. For general knowledge food related questions, please ask in our Chatbot Window. Download the <a href="https://www.georgeinstitute.org/our-research/research-projects/foodswitch-app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">FoodSwitch app</a> to scan food labels while shopping.
        </AlertDescription>
      </Alert>
      
      {/* CPD-aligned foods badge/alert */}
      {isOnline && cpdAlignedData?.alignment === 'cpd-specific' && (
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Recommended Foods
            {cpdAlignedData?.alignment === 'cpd-specific' ? ' (Personalised)' : ' (General)'}
          </h2>
          <Link href="/inspiration-d" className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1">
            <Utensils className="h-3 w-3" />
            Find recipes with these ingredients
          </Link>
        </div>
        
        {!isOnline ? (
          <div className="text-center p-10 border border-dashed rounded-md bg-gray-50">
            <CloudOff className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Offline Mode</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              Food recommendations require an internet connection. Please connect to the internet to view your 
              personalized food suggestions.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          renderFoodList(cpdAlignedData?.foods || [], cpdAlignedLoading)
        )}
      </div>
      
      {/* Favourites section */}
      {isOnline && favourites && favourites.length > 0 && (
        <div className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Favourites</h2>
            <Link href="/inspiration-d" className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1">
              <Utensils className="h-3 w-3" />
              Find recipes with favorite ingredients
            </Link>
          </div>
          {/* Placeholder for favourites list */}
          <div className="text-center py-8">
            <p className="text-muted-foreground">Food recommendations coming soon</p>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

// Food card component
const FoodCard = ({ food }: { food: FoodItem }) => {
  const [isFavourite, setIsFavourite] = useState(false);
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const toggleFavourite = async () => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Can't update favourites while offline",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch('/api/food-database/favourites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodItemId: food.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsFavourite(data.isFavourite);
        toast({
          title: data.isFavourite ? "Added to favourites" : "Removed from favourites",
          description: `${food.name} ${data.isFavourite ? 'added to' : 'removed from'} your favourites`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to update favourites",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg leading-tight">{food.name}</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={toggleFavourite}
          >
            <Heart className={`h-5 w-5 ${isFavourite ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline">{food.category}</Badge>
          {food.cpdRelevantTags?.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground mb-3">{food.description}</p>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Serving:</span> {food.servingSize}
          </div>
          <div>
            <span className="font-medium">Calories:</span> {food.calories} kcal
          </div>
          <div>
            <span className="font-medium">Protein:</span> {food.protein}g
          </div>
          <div>
            <span className="font-medium">Carbs:</span> {food.carbs}g
          </div>
          <div>
            <span className="font-medium">Fat:</span> {food.fat}g
          </div>
          <div>
            <span className="font-medium">Sodium:</span> {food.sodium}mg
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 text-xs text-muted-foreground">
        <div className="flex justify-between items-center w-full">
          <span>Source: {food.source || 'FSANZ'}</span>
          <div className="flex items-center gap-2">
            {/* Display the first dietary tag as a badge if available */}
            {food.cpdRelevantTags?.[0] && 
              <Badge variant="outline" className="bg-green-50 text-green-800 capitalize">
                {food.cpdRelevantTags[0]?.replace(/-/g, ' ')} Diet
              </Badge>
            }
            <a href="https://www.foodstandards.gov.au/science-data/food-composition-databases" target="_blank" rel="noopener noreferrer">
              <Button variant="link" size="sm" className="h-6 p-0">
                View Source
              </Button>
            </a>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FoodDatabase;