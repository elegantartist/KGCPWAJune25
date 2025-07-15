import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Utensils, Heart, AlertTriangle, Info, CloudOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useLocation, setLocation } from 'wouter';


// Mock Data - Kiro/Q to replace with API calls
const mockDietPlanDirective = "Based on your recent health assessment, your doctor recommends a diet low in sodium and rich in potassium. Focus on fresh fruits, vegetables, and lean proteins. Please limit processed foods and aim for less than 2000mg of sodium per day.";

const mockCpdAlignedData = {
  alignment: 'cpd-specific',
  relevantTags: ['low-sodium', 'heart-healthy', 'diabetic-friendly', 'high-potassium'],
  foods: [
    { id: 1, name: 'Avocado', description: 'Creamy and nutrient-dense, rich in healthy fats and potassium.', servingSize: '100g', calories: 160, protein: 2, carbs: 9, fat: 15, sodium: 7, category: 'Fruit', cpdRelevantTags: ['low-sodium', 'high-potassium'], source: 'FSANZ' },
    { id: 2, name: 'Salmon', description: 'Excellent source of omega-3 fatty acids and high-quality protein.', servingSize: '100g', calories: 208, protein: 20, carbs: 0, fat: 13, sodium: 59, category: 'Fish', cpdRelevantTags: ['heart-healthy', 'low-sodium'], source: 'FSANZ' },
    { id: 3, name: 'Sweet Potato', description: 'A great source of fiber, vitamins, and minerals.', servingSize: '100g', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, sodium: 55, category: 'Vegetable', cpdRelevantTags: ['high-potassium', 'diabetic-friendly'], source: 'FSANZ' },
    { id: 4, name: 'Spinach', description: 'Low in calories and high in vitamins and minerals like iron and calcium.', servingSize: '100g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, sodium: 79, category: 'Vegetable', cpdRelevantTags: ['low-sodium', 'heart-healthy'], source: 'FSANZ' },
  ]
};

const mockFavourites = [
    { id: 2, name: 'Salmon', description: 'Excellent source of omega-3 fatty acids and high-quality protein.', servingSize: '100g', calories: 208, protein: 20, carbs: 0, fat: 13, sodium: 59, category: 'Fish', cpdRelevantTags: ['heart-healthy', 'low-sodium'], source: 'FSANZ' },
];
// End Mock Data


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
  source: string;
}

const FoodCard = ({ food, isInitialFavourite }: { food: FoodItem, isInitialFavourite: boolean }) => {
  const [isFavourite, setIsFavourite] = useState(isInitialFavourite);
  const { toast } = useToast();
  const [isOnline] = useState(navigator.onLine);

  const toggleFavourite = async () => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Can't update favourites while offline.",
        variant: "destructive"
      });
      return;
    }

    // Mock API call
    console.log(`Toggling favourite for food item: ${food.id}`);
    setIsFavourite(!isFavourite);
    toast({
      title: !isFavourite ? "Added to favourites" : "Removed from favourites",
      description: `${food.name} has been ${!isFavourite ? 'added to' : 'removed from'} your favourites.`,
    });
    // In a real app, you would have error handling here.
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg leading-tight pr-2">{food.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={toggleFavourite}
          >
            <Heart className={`h-5 w-5 transition-colors ${isFavourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
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

      <CardContent className="pb-2 flex-grow">
        <p className="text-sm text-muted-foreground mb-3">{food.description}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span className="font-medium">Serving:</span> {food.servingSize}</div>
          <div><span className="font-medium">Calories:</span> {food.calories} kcal</div>
          <div><span className="font-medium">Protein:</span> {food.protein}g</div>
          <div><span className="font-medium">Carbs:</span> {food.carbs}g</div>
          <div><span className="font-medium">Fat:</span> {food.fat}g</div>
          <div><span className="font-medium">Sodium:</span> {food.sodium}mg</div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center w-full">
          <span>Source: {food.source || 'FSANZ'}</span>
          <div className="flex items-center gap-2">
            {food.cpdRelevantTags?.[0] &&
              <Badge variant="outline" className="border-green-600 bg-green-50 text-green-800 capitalize">
                {food.cpdRelevantTags[0]?.replace(/-/g, ' ')}
              </Badge>
            }
            <a href="https://www.foodstandards.gov.au/science-data/food-composition-databases" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              View Source
            </a>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};


const FoodDatabasePage = () => {
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Loading states
    const [loadingCPD, setLoadingCPD] = useState(true);
    const [loadingFoods, setLoadingFoods] = useState(true);
    const [loadingFavourites, setLoadingFavourites] = useState(true);

    // Data states
    const [dietPlanDirective, setDietPlanDirective] = useState('');
    const [cpdAlignedData, setCpdAlignedData] = useState<any>(null);
    const [favourites, setFavourites] = useState<FoodItem[]>([]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => {
            setIsOnline(false);
            toast({
                title: "You've gone offline",
                description: "Some features may be limited.",
                variant: "destructive"
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Mock data fetching
        const timer1 = setTimeout(() => {
            setDietPlanDirective(mockDietPlanDirective);
            setLoadingCPD(false);
        }, 1000);

        const timer2 = setTimeout(() => {
            setCpdAlignedData(mockCpdAlignedData);
            setLoadingFoods(false);
        }, 1500);

        const timer3 = setTimeout(() => {
            setFavourites(mockFavourites);
            setLoadingFavourites(false);
        }, 1800);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [toast]);

    const favouriteIds = new Set(favourites.map(f => f.id));

    const renderFoodGrid = (foods: FoodItem[], isLoading: boolean, emptyMessage: string, offlineMessage: string) => {
        if (!isOnline) {
            return (
                <div className="text-center p-10 border border-dashed rounded-md bg-gray-50 dark:bg-gray-800">
                    <CloudOff className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">Offline Mode</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">{offlineMessage}</p>
                    <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
                </div>
            );
        }

        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-2/3" />
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </CardContent>
                            <CardFooter><Skeleton className="h-6 w-1/2" /></CardFooter>
                        </Card>
                    ))}
                </div>
            );
        }

        if (!foods || foods.length === 0) {
            return (
                <div className="text-center p-8 border rounded-md">
                    <p className="text-muted-foreground">{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {foods.map(food => (
                    <FoodCard key={food.id} food={food} isInitialFavourite={favouriteIds.has(food.id)} />
                ))}
            </div>
        );
    };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Food Database</h1>
            <Button
                onClick={() => setLocation('/inspiration-d')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
                <Utensils className="h-4 w-4" />
                <span>Find Recipes</span>
            </Button>
        </div>

        {!isOnline && (
            <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Internet Connection Required</AlertTitle>
                <AlertDescription>
                    You are currently offline. This feature requires an internet connection to access your food recommendations. Please reconnect to continue.
                </AlertDescription>
            </Alert>
        )}

        <Card className="mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                    <span role="img" aria-label="clipboard">📋</span> Your Diet Plan Directive
                </CardTitle>
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

        <Alert className="mb-6 border-blue-500">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Care Plan Aligned Food Recommendations</AlertTitle>
            <AlertDescription>
                These food suggestions align with your doctor's Care Plan. For recipes that use these ingredients,
                click the "Find Recipes" button to access Inspiration Machine D. For general food-related
                questions, please ask in our Chatbot Window. Download the{' '}
                <a href="https://www.georgeinstitute.org/our-research/research-projects/foodswitch-app"
                target="_blank" rel="noopener noreferrer"
                className="text-blue-600 font-semibold hover:underline">FoodSwitch app</a>
                {' '}to scan food labels while shopping.
            </AlertDescription>
        </Alert>

        {isOnline && cpdAlignedData?.alignment === 'cpd-specific' && !loadingFoods && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🔵</span> Your Dietary Considerations
                </h3>
                <p className="text-sm text-blue-700 mb-2 pl-6">
                    Based on your Care Plan, these dietary factors have been considered:
                </p>
                <div className="flex flex-wrap gap-2 pl-6">
                {cpdAlignedData.relevantTags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                    {tag}
                    </Badge>
                ))}
                </div>
            </div>
        )}

        <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
                {cpdAlignedData?.alignment === 'cpd-specific' ? "Personalised Recommendations" : "General Recommendations"}
            </h2>
            {renderFoodGrid(
                cpdAlignedData?.foods,
                loadingFoods,
                "No food recommendations found. Please consult with your doctor for updated Care Plan Directives.",
                "Personalised food recommendations are unavailable offline."
            )}
        </section>

        {isOnline && !loadingFavourites && favourites.length > 0 && (
             <section>
                <h2 className="text-xl font-semibold mb-4">Your Favourites</h2>
                {renderFoodGrid(
                    favourites,
                    loadingFavourites,
                    "You haven't added any favourites yet.",
                    "Your favourite foods are unavailable offline."
                )}
            </section>
        )}
    </div>
  );
};

export default FoodDatabasePage;
