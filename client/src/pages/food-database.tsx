import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Utensils, Info, AlertTriangle, CloudOff, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

import { useCPD } from "@/hooks/useCPD";

// Updated CPD aligned foods response type for Food Standards integration
interface CpdAlignedResponse {
  foods: FoodStandardsSearchResult[];
  summary: {
    totalResults: number;
    cpdFocus: string;
    nutritionalGuidance: string;
    sourceAuthority: string;
    searchTimestamp: string;
  };
}

// Food Standards search result interface
interface FoodStandardsSearchResult {
  id: string;
  name: string;
  description: string;
  nutritionalInfo: {
    energy_kj?: number;
    energy_kcal?: number;
    protein_g?: number;
    fat_total_g?: number;
    carbohydrate_g?: number;
    sugars_g?: number;
    sodium_mg?: number;
    fibre_g?: number;
  };
  servingSize: string;
  category: string;
  cpdAlignment: {
    relevanceScore: number;
    alignmentReason: string[];
    dietaryBenefits: string[];
  };
  source: {
    name: string;
    url: string;
    lastUpdated: string;
  };
}

const FoodDatabase = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Hardcoded user ID for demonstration - matches existing pattern
  const userId = 2;
  
  // Use CPD hook for diet plan directive
  const {
    dietPlan,
    loadingCPD,
    hasDietDirective
  } = useCPD(userId);
  
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
  
  // Fetch CPD-aligned foods from Australian Food Standards
  const { data: cpdAlignedData, isLoading: cpdAlignedLoading } = useQuery<CpdAlignedResponse>({
    queryKey: ['/api/food-database/cpd-aligned', userId],
    queryFn: async () => {
      if (!userId) return { foods: [], summary: { totalResults: 0, cpdFocus: '', nutritionalGuidance: '', sourceAuthority: '', searchTimestamp: '' } };
      const response = await fetch(`/api/food-database/cpd-aligned/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch CPD-aligned foods');
      return await response.json();
    },
    enabled: isOnline && !!userId,
    retry: isOnline ? 3 : 0,
  });

  return (
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
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Mediterranean Diet Focus</p>
              <p className="text-sm">{dietPlan}</p>
              {hasDietDirective && (
                <div className="mt-2 text-xs text-muted-foreground">
                  ✓ Active dietary guidance from your healthcare provider
                </div>
              )}
            </div>
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
      
      {/* Australian Food Standards Authority Notice */}
      {isOnline && cpdAlignedData?.summary && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-800 mb-1">Australian Food Standards Authority</h3>
              <p className="text-sm text-green-700 mb-2">
                {cpdAlignedData.summary.nutritionalGuidance}
              </p>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <span>Source: {cpdAlignedData.summary.sourceAuthority}</span>
                <span>•</span>
                <a 
                  href="https://www.foodstandards.gov.au/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline font-medium"
                >
                  Visit foodstandards.gov.au
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Food Standards Recommendations */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Recommended Foods
            {cpdAlignedData?.summary?.totalResults ? ` (${cpdAlignedData.summary.totalResults} from Food Standards)` : ' (General)'}
          </h2>
          <Button 
            onClick={() => setLocation('/inspiration-d')}
            variant="outline"
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
          >
            <Utensils className="h-3 w-3" />
            Find recipes with these ingredients
          </Button>
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
          <FoodStandardsList foods={cpdAlignedData?.foods || []} isLoading={cpdAlignedLoading} />
        )}
      </div>
    </div>
  );
};

// Helper component to render food standards recommendations
const FoodStandardsList = ({ foods, isLoading }: { foods: FoodStandardsSearchResult[]; isLoading: boolean }) => {
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-md" />
        ))}
      </div>
    );
  }
  
  if (!foods?.length) {
    return (
      <div className="text-center p-8 border rounded-md bg-gray-50">
        <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Food Standards Recommendations Found</h3>
        <p className="text-muted-foreground mb-4">
          We couldn't find specific recommendations from the Australian Food Standards Authority for your Care Plan Directive.
        </p>
        <Button 
          onClick={() => setLocation('/chatbot')}
          variant="outline"
          className="flex items-center gap-2"
        >
          Ask the Chatbot for General Nutrition Advice
        </Button>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {foods.map(food => (
        <FoodStandardsCard key={food.id} food={food} />
      ))}
    </div>
  );
};

// Food Standards card component for Australian Food Standards data
const FoodStandardsCard = ({ food }: { food: FoodStandardsSearchResult }) => {
  const { toast } = useToast();
  
  // Format nutritional information for display
  const formatNutrition = (value?: number, unit: string = 'g') => {
    if (value === undefined || value === null) return 'N/A';
    return `${value}${unit}`;
  };
  
  // Calculate relevance color based on CPD alignment score
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight mb-1">{food.name}</CardTitle>
            <p className="text-sm text-muted-foreground mb-2">{food.category}</p>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getRelevanceColor(food.cpdAlignment.relevanceScore)}`}
            >
              {Math.round(food.cpdAlignment.relevanceScore * 100)}% CPD Match
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {food.description}
        </p>
        
        {/* Nutritional Information */}
        <div className="bg-gray-50 rounded-md p-3 mb-3">
          <h4 className="font-medium text-sm mb-2">Nutritional Info ({food.servingSize})</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>Energy: {formatNutrition(food.nutritionalInfo.energy_kcal, 'kcal')}</div>
            <div>Protein: {formatNutrition(food.nutritionalInfo.protein_g)}</div>
            <div>Carbs: {formatNutrition(food.nutritionalInfo.carbohydrate_g)}</div>
            <div>Fat: {formatNutrition(food.nutritionalInfo.fat_total_g)}</div>
            <div>Sodium: {formatNutrition(food.nutritionalInfo.sodium_mg, 'mg')}</div>
            <div>Fibre: {formatNutrition(food.nutritionalInfo.fibre_g)}</div>
          </div>
        </div>
        
        {/* CPD Alignment Benefits */}
        {food.cpdAlignment.dietaryBenefits.length > 0 && (
          <div className="mb-3">
            <h4 className="font-medium text-sm mb-1">Health Benefits</h4>
            <div className="flex flex-wrap gap-1">
              {food.cpdAlignment.dietaryBenefits.slice(0, 2).map((benefit, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between items-center">
        <a 
          href={food.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Info className="h-3 w-3" />
          Food Standards Source
        </a>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            toast({
              title: "Recipe Search",
              description: `Search for recipes using ${food.name} in Inspiration Machine D`,
            });
            window.location.href = '/inspiration-d';
          }}
        >
          Find Recipes
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FoodDatabase;