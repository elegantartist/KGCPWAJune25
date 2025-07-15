import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { useToast } from "../hooks/use-toast";
import { Search, ExternalLink, Loader2, Library, Clock, Heart, Award, ChefHat, ShoppingBag, X, RefreshCw, Database } from "lucide-react";
import { Textarea } from "../components/ui/textarea";
import { 
  searchCookingVideos,
  saveFavoriteVideo,
  getFavoriteVideos,
  deleteFavoriteVideo,
  type RecipeSearchFilters,
  type RecipeSearchResult
} from "../services/recipeService";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";

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

// Interface for enhanced recipe data
interface EnhancedRecipe {
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
  videoId?: string;
  source_name: string;
  cuisine_type?: string;
  meal_type?: string;
  relevanceScore?: number;
  nutritionalAnalysis?: {
    calories?: number;
    difficulty?: string;
    healthScore?: number;
    allergens?: string[];
    dietCompatibility?: Record<string, boolean>;
  };
  enhancedMetadata?: {
    tags?: string[];
    recommendedFor?: string[];
    equipmentNeeded?: string[];
    skillLevel?: string;
  };
  analysis?: {
    nutritionalValue: string;
    healthBenefits: string[];
    caloriesEstimate: string;
    difficultyLevel: string;
    alternatives: { ingredient: string; alternatives: string[] }[];
    tips: string[];
  };
  healthScore?: number;
}

const InspirationD: React.FC = () => {
  const [selectedCuisine, setSelectedCuisine] = useState<string>("");
  const [selectedDiet, setSelectedDiet] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<string>("");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<Record<string, boolean>>({
    nuts: false,
    dairy: false,
    gluten: false,
    shellfish: false,
    soy: false
  });
  const [activeTab, setActiveTab] = useState<string>("search");
  const [analyzedRecipes, setAnalyzedRecipes] = useState<EnhancedRecipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(false);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [carePlanDirective, setCarePlanDirective] = useState<string>('');
  const [loadingCPD, setLoadingCPD] = useState<boolean>(true);
  
  // Shopping list state
  const [showShoppingList, setShowShoppingList] = useState<boolean>(false);
  const [shoppingListItems, setShoppingListItems] = useState<string>(() => {
    const savedList = localStorage.getItem(`user_${userId}_shopping_list`);
    return savedList || '';
  });
  
  const { toast } = useToast();
  
  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: () => apiRequest<{ id: number; name: string }>('GET', '/api/users/me'),
    retry: false,
  });

  const userId = (currentUser as any)?.id;

  // Get saved recipes for the user
  const { data: savedRecipes = [] } = useQuery({
    queryKey: ['/api/users', userId, 'saved-recipes'],
    queryFn: () => getFavoriteVideos(userId),
    enabled: !!userId
  });
  
  // Get care plan directives
  const { data: carePlanDirectives = [], isLoading: isLoadingCPDs } = useQuery({
    queryKey: [`/api/users/${userId}/care-plan-directives/active`],
    queryFn: () => apiRequest<CarePlanDirective[]>('GET', `/api/users/${userId}/care-plan-directives/active`),
    enabled: !!userId,
    retry: false
  });
  
  // Update care plan directive state when data changes
  useEffect(() => {
    if (Array.isArray(carePlanDirectives) && carePlanDirectives.length > 0) {
      const dietDirective = carePlanDirectives.find((directive: CarePlanDirective) => 
        directive.category.toLowerCase() === 'diet' || 
        directive.category.toLowerCase() === 'nutrition' ||
        directive.category.toLowerCase() === 'meal plan' ||
        directive.directive.toLowerCase().includes('diet') ||
        directive.directive.toLowerCase().includes('meal') ||
        directive.directive.toLowerCase().includes('food') ||
        directive.directive.toLowerCase().includes('eat')
      );

      if (dietDirective) {
        setCarePlanDirective(dietDirective.directive);
      } else {
        setCarePlanDirective('Your doctor has not yet provided any Diet care plan directives. Please check back later.');
      }
      setLoadingCPD(false);
    } else if (!isLoadingCPDs && userId) {
      setCarePlanDirective('Your doctor has not yet provided any Diet care plan directives. Please check back later.');
      setLoadingCPD(false);
    }
  }, [carePlanDirectives, isLoadingCPDs, userId]);

  // Create search filters
  const createSearchFilters = (): RecipeSearchFilters => {
    const filters: RecipeSearchFilters = {
      mealType: selectedMealType || undefined,
      cuisineType: selectedCuisine || undefined,
      ingredients: selectedIngredients.length > 0 ? selectedIngredients : undefined,
      dietaryPreferences: []
    };

    // Add dietary preferences
    if (selectedDiet) {
      filters.dietaryPreferences?.push(selectedDiet);
    }

    // Add allergy restrictions
    Object.entries(allergies).forEach(([allergy, isChecked]) => {
      if (isChecked) {
        filters.dietaryPreferences?.push(`no-${allergy}`);
      }
    });

    return filters;
  };

  // Search for recipes that match CPDs
  const handleSearchRecipes = async () => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please login and try again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingRecipes(true);
    
    try {
      const filters = createSearchFilters();
      
      // Search for cooking videos that match CPDs
      const videos = await searchCookingVideos(filters);
      
      if (videos && videos.length > 0) {
        // Convert video results to recipe format
        const formattedRecipes = videos.map((video: any) => ({
          title: video.title,
          description: video.description || 'No description available',
          url: video.url,
          thumbnail_url: video.thumbnail_url,
          videoId: video.videoId,
          source_name: 'YouTube',
          cuisine_type: filters.cuisineType,
          meal_type: filters.mealType,
          relevanceScore: (video as any).relevanceScore || 5,
          nutritionalAnalysis: video.nutritionalAnalysis || {},
          enhancedMetadata: (video as any).enhancedMetadata || {},
          healthScore: video.nutritionalAnalysis?.healthScore || 5
        }));

        setAnalyzedRecipes(formattedRecipes);
        
        toast({
          title: "Recipes Found",
          description: `Found ${formattedRecipes.length} recipes matching your care plan`,
        });
      } else {
        setAnalyzedRecipes([]);
        toast({
          title: "No recipes found",
          description: "Try adjusting your search criteria and try again",
          variant: "destructive"
        });
      }
      
      setSearchPerformed(true);
    } catch (error) {
      console.error(`Error searching for recipes:`, error);
      toast({
        title: `Error searching for recipes`,
        description: "Please check your network connection and try again",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  // Mutation for saving a recipe
  const saveMutation = useMutation({
    mutationFn: (recipe: EnhancedRecipe) => saveFavoriteVideo(userId, recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'saved-recipes'] });
      toast({
        title: "Recipe saved",
        description: "Recipe added to your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving recipe",
        description: "Could not save recipe. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Check if recipe is saved
  const isRecipeSaved = (url: string): boolean => {
    return savedRecipes.some((recipe: any) => recipe.url === url);
  };

  // Save a recipe
  const handleSaveRecipe = (recipe: EnhancedRecipe) => {
    if (!isRecipeSaved(recipe.url)) {
      saveMutation.mutate(recipe);
    } else {
      toast({
        title: "Recipe already saved",
        description: "This recipe is already in your favorites",
      });
    }
  };

  // Shopping list functions
  const handleShoppingListChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newList = e.target.value;
    setShoppingListItems(newList);
  };
  
  const clearShoppingList = () => {
    setShoppingListItems('');
    if (userId) {
      localStorage.removeItem(`user_${userId}_shopping_list`);
    }
    toast({
      title: 'Shopping List Cleared',
      description: 'Your shopping list has been cleared.',
    });
  };
  
  const toggleShoppingList = () => {
    setShowShoppingList(prev => !prev);
  };

  // Auto-save shopping list to localStorage
  useEffect(() => {
    if (userId && shoppingListItems !== undefined) {
      localStorage.setItem(`user_${userId}_shopping_list`, shoppingListItems);
    }
  }, [shoppingListItems, userId]);

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2E8BC0]">Inspiration Machine D</h1>
            <p className="text-[#676767]">Find Delicious Meals to Prepare Yourself or Use Your Diet Logistics Feature to have Ingredients or Similar Meals Delivered</p>
          </div>
          <div>
            <Button
              onClick={toggleShoppingList}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              {showShoppingList ? 'Hide' : 'Show'} Shopping List
            </Button>
          </div>
        </div>
        {/* Shopping List Card */}
        {showShoppingList && (
          <Card className="mb-6 border-green-100">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-green-600" />
                  Healthy Ingredients Shopping List
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleShoppingList}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Note down ingredients you need for your healthy meals
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="Write your shopping list here... 
Example:
- 2 cups spinach
- 1 avocado
- 250g lean chicken breast
- 1 bunch fresh herbs"
                className="min-h-[150px] font-mono text-sm"
                value={shoppingListItems}
                onChange={handleShoppingListChange}
              />
              <div className="flex justify-between mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/food-database', '_blank')}
                  className="border-blue-600 text-blue-600 hover:bg-blue-100"
                >
                  <Database className="h-3.5 w-3.5 mr-1" />
                  Food Database
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={clearShoppingList}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Clear List
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3 text-[#2E8BC0]">
            <Library className="h-6 w-6" />
            Doctor's Healthy Meal Plan Directive
          </CardTitle>
          <CardDescription>
            Your doctor's exact dietary recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Doctor's CPD Display */}
            {loadingCPD ? (
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading doctor's recommendations...</span>
              </div>
            ) : (
              <div className="bg-[#2E8BC0]/5 border-l-4 border-[#2E8BC0] p-4 rounded-md mb-4">
                <p className="text-[#676767] italic text-base leading-relaxed">
                  "{carePlanDirective}"
                </p>
              </div>
            )}
            
            {/* Main Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Recipe Search
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  My Favorites
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  Preferences
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="preferences" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="mealType">Meal Type</Label>
                    <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                      <SelectTrigger id="mealType">
                        <SelectValue placeholder="Select meal type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="cuisine">Cuisine Type</Label>
                    <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                      <SelectTrigger id="cuisine">
                        <SelectValue placeholder="Select cuisine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mediterranean">Mediterranean</SelectItem>
                        <SelectItem value="asian">Asian</SelectItem>
                        <SelectItem value="american">American</SelectItem>
                        <SelectItem value="italian">Italian</SelectItem>
                        <SelectItem value="mexican">Mexican</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="diet">Diet Type</Label>
                    <Select value={selectedDiet} onValueChange={setSelectedDiet}>
                      <SelectTrigger id="diet">
                        <SelectValue placeholder="Select diet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="omnivore">Omnivore</SelectItem>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="keto">Keto</SelectItem>
                        <SelectItem value="low-carb">Low Carb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="search" className="space-y-4">
                <p className="text-sm text-[#a4a4a4] mb-4">
                  Search for cooking videos that match your doctor's dietary recommendations and your preferences.
                </p>
              </TabsContent>
              
              <TabsContent value="favorites" className="space-y-4">
                <div className="text-center py-8">
                  <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-[#676767] mb-2">My Favorite Recipes</h3>
                  <p className="text-[#a4a4a4] mb-4">
                    Your saved recipes will appear here
                  </p>
                  {savedRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {savedRecipes.map((recipe: any, index: number) => (
                        <Card key={index} className="text-left">
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">{recipe.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>
                            <div className="flex justify-between">
                              <Button variant="outline" size="sm" onClick={() => window.open(recipe.url, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Heart className="h-4 w-4 fill-current" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No saved recipes yet. Start searching to save your favorites!</p>
                  )}
                </div>
              </TabsContent>

            </Tabs>
            
            <Button 
              onClick={handleSearchRecipes}
              className="bg-primary text-white hover:bg-primary/90 w-full md:w-auto"
              disabled={isLoadingRecipes}
            >
              {isLoadingRecipes ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Inspiration Search
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Recipe Results */}
      {isLoadingRecipes ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Searching for recipes that match your care plan...</span>
        </div>
      ) : analyzedRecipes.length > 0 ? (
        <div className="space-y-6">
          {analyzedRecipes.map((recipe, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/3">
                  <img 
                    src={recipe.thumbnail_url || `https://placehold.co/600x400/e6f7ff/1e6091?text=${encodeURIComponent(recipe.title.substring(0, 20))}`}
                    alt={recipe.title}
                    className="w-full h-48 md:h-full object-cover"
                  />
                </div>
                <div className="md:w-2/3 p-4">
                  <h3 className="font-semibold text-xl mb-2">{recipe.title}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{recipe.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recipe.meal_type && (
                      <Badge variant="outline" className="bg-blue-50">
                        {recipe.meal_type}
                      </Badge>
                    )}
                    {recipe.cuisine_type && (
                      <Badge variant="outline" className="bg-green-50">
                        {recipe.cuisine_type}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-purple-50">
                      {recipe.source_name}
                    </Badge>
                  </div>
                  
                  {recipe.nutritionalAnalysis && (
                    <div className="mb-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center">
                          <Award className="h-4 w-4 text-amber-500 mr-1" />
                          <span className="text-sm font-medium">
                            Health Score: {recipe.healthScore || recipe.nutritionalAnalysis.healthScore || 'N/A'}
                          </span>
                        </div>
                        
                        {recipe.nutritionalAnalysis.difficulty && (
                          <div className="flex items-center">
                            <ChefHat className="h-4 w-4 text-blue-500 mr-1" />
                            <span className="text-sm">
                              Difficulty: {recipe.nutritionalAnalysis.difficulty}
                            </span>
                          </div>
                        )}
                        
                        {recipe.nutritionalAnalysis.calories && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-red-400 mr-1" />
                            <span className="text-sm">
                              ~{recipe.nutritionalAnalysis.calories} calories
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between mt-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(recipe.url, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Recipe
                    </Button>
                    <Button 
                      variant={isRecipeSaved(recipe.url) ? "default" : "secondary"} 
                      size="sm"
                      onClick={() => handleSaveRecipe(recipe)}
                      disabled={saveMutation.isPending || isRecipeSaved(recipe.url)}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Heart className="h-4 w-4 mr-1" fill={isRecipeSaved(recipe.url) ? "currentColor" : "none"} />
                      )}
                      {isRecipeSaved(recipe.url) ? "Saved" : "Save Recipe"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : searchPerformed ? (
        <div className="text-center py-8">
          <p className="text-lg">No recipes found matching your criteria.</p>
          <p>Try adjusting your search preferences or check back later.</p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-lg">Use the search options above to find recipes that match your care plan.</p>
          <p>Set your preferences and click "Inspiration Search" to get started.</p>
        </div>
      )}
      
      </div>
    </Layout>
  );
};

export default InspirationD;