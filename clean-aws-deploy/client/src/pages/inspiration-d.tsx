import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { useToast } from "../hooks/use-toast";
import { useIsMobile } from "../hooks/use-mobile";
import { Search, ExternalLink, Trash, Loader2, BookmarkCheck, Library, Clock, Youtube, ArrowLeft, Heart, Award, ChefHat } from "lucide-react";
import { 
  searchCookingVideos,
  saveFavoriteVideo,
  getFavoriteVideos,
  deleteFavoriteVideo,
  type RecipeSearchFilters
} from "../services/recipeService";
import { queryClient } from "../lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

// Import recipe service types we need
import type { RecipeSearchResult } from "../services/recipeService";

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

// Import fallback food images (used if a video has no thumbnail)
import foodImage1 from "@assets/image_1744127067136.jpeg";
import foodImage2 from "@assets/image_1744127100239.jpeg";
import foodImage3 from "@assets/image_1744127300035.jpeg";

// Use these images as fallback thumbnails
const fallbackImages = [foodImage1, foodImage2, foodImage3];

// Interface for enhanced recipe data
interface EnhancedRecipe extends RecipeSearchResult {
  healthScore?: number;
  analysis?: {
    difficultyLevel: string;
    caloriesEstimate: string;
    nutritionalValue: string;
    healthBenefits: string[];
    alternatives: { ingredient: string; alternatives: string[] }[];
    tips: string[];
  };
}

// Interface for video data
interface VideoResult extends RecipeSearchResult {
  id: number;
  tags?: string[];
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
  const [activeTab, setActiveTab] = useState<string>("recipes");
  const [analyzedRecipes, setAnalyzedRecipes] = useState<EnhancedRecipe[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState<boolean>(false);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [usedHeartHealthFallback, setUsedHeartHealthFallback] = useState<boolean>(false);
  const [carePlanDirective, setCarePlanDirective] = useState<string>('');
  const [loadingCPD, setLoadingCPD] = useState<boolean>(true);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // User ID for Marijke Collins (production user)
  const userId = 2; // Reuben Collins - Patient

  // Functions to interact with the API
  // These are stub implementations for type checking purposes
  const getSavedRecipes = async (userId: number) => {
    return [] as EnhancedRecipe[];
  };
  
  const saveRecipe = async (userId: number, recipe: EnhancedRecipe) => {
    return recipe;
  };
  
  const searchRecipes = async (filters: RecipeSearchFilters) => {
    return [] as EnhancedRecipe[];
  };
  
  const analyzeRecipe = async (recipe: any, userId: number) => {
    return recipe as EnhancedRecipe;
  };
  
  // Get all saved recipes for the user
  const { data: savedRecipes = [] } = useQuery({
    queryKey: ['/api/users', userId, 'saved-recipes'],
    queryFn: () => getSavedRecipes(userId)
  });
  
  // Fetch user's care plan directives
  const { data: carePlanDirectives = [], isLoading: isLoadingCPDs } = useQuery({
    queryKey: ['/api/users', userId, 'care-plan-directives', 'active'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/care-plan-directives/active`);
      if (!response.ok) {
        throw new Error('Failed to fetch care plan directives');
      }
      return response.json() as Promise<CarePlanDirective[]>;
    }
  });
  
  // Fetch care plan directives and update the carePlanDirective state
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
          setCarePlanDirective(dietDirective.directive);
        } else {
          setCarePlanDirective('Your doctor has not yet provided any Diet care plan directives. Please check back later.');
        }
      } catch (error) {
        console.error('Error fetching care plan directives:', error);
        toast({
          title: "Error",
          description: "Failed to load care plan directives",
          variant: "destructive"
        });
        setCarePlanDirective('Could not load Diet care plan directives. Please try again later.');
      } finally {
        setLoadingCPD(false);
      }
    };

    fetchCarePlanDirectives();
  }, [userId, toast]);

  // Mutation for saving a recipe
  const saveMutation = useMutation({
    mutationFn: (recipe: EnhancedRecipe) => saveRecipe(userId, recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'saved-recipes'] });
      toast({
        title: "Recipe saved",
        description: "Recipe has been added to your favorites",
      });
    },
    onError: (error) => {
      console.error("Error saving recipe:", error);
      toast({
        title: "Error saving recipe",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  });

  // Check if a recipe is already saved
  const isRecipeSaved = useCallback((url: string) => {
    return savedRecipes.some(recipe => recipe.url === url);
  }, [savedRecipes]);

  // Function to get the latest diet CPD without any interpretation
  const getLatestDietCPD = (): CarePlanDirective | null => {
    if (!carePlanDirectives || carePlanDirectives.length === 0) {
      return null;
    }
    
    // Get diet-related CPDs
    const dietCPDs = carePlanDirectives.filter(cpd => 
      cpd.category.toLowerCase() === 'diet'
    );
    
    if (dietCPDs.length === 0) {
      return null;
    }
    
    // Sort by updatedAt date and get the most recent one
    return [...dietCPDs].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  };
  
  // Terms used for heart healthy recipes - ONLY used internally for search, never displayed
  // Per SaMD Class 1 requirements, these are never shown to patients
  const getHeartHealthTerms = (): string[] => {
    return [
      'low-sodium',
      'low-salt',
      'low-fat',
      'whole-grain',
      'vegetable-rich',
      'fruit-rich',
      'high-fiber',
      'legumes',
      'nuts'
    ];
  };
  
  // Extract search terms from CPDs
  // NOTE: This function only impacts search criteria, not what's displayed to users
  const extractDietaryTermsFromCPDs = (): string[] => {
    const dietTerms: string[] = [];
    const latestDietCPD = getLatestDietCPD();
    
    // Always add heart healthy terms for the search (but never display them)
    dietTerms.push(...getHeartHealthTerms());
    
    // If there's a diet CPD, extract terms for search
    if (latestDietCPD) {
      const directive = latestDietCPD.directive.toLowerCase();
      
      // Extract specific terms for search only
      if (directive.includes('low carb') || directive.includes('reduce carb')) {
        dietTerms.push('low-carb');
      }
      if (directive.includes('low fat') || directive.includes('reduce fat')) {
        dietTerms.push('low-fat');
      }
      if (directive.includes('low sodium') || directive.includes('reduce salt') || directive.includes('reduce sodium')) {
        dietTerms.push('low-sodium');
      }
      if (directive.includes('high protein') || directive.includes('increase protein')) {
        dietTerms.push('high-protein');
      }
      if (directive.includes('high fiber') || directive.includes('increase fiber')) {
        dietTerms.push('high-fiber');
      }
      if (directive.includes('mediterranean')) {
        dietTerms.push('mediterranean');
      }
      if (directive.includes('vegetarian')) {
        dietTerms.push('vegetarian');
      }
      if (directive.includes('vegan')) {
        dietTerms.push('vegan');
      }
      if (directive.includes('keto') || directive.includes('ketogenic')) {
        dietTerms.push('keto');
      }
      if (directive.includes('paleo')) {
        dietTerms.push('paleo');
      }
      if (directive.includes('whole grain')) {
        dietTerms.push('whole-grain');
      }
      if (directive.includes('reduce sugar') || directive.includes('less sugar')) {
        dietTerms.push('low-sugar');
      }
    }
    
    // Remove duplicates and return
    const uniqueTermsSet = new Set(dietTerms);
    return Array.from(uniqueTermsSet);
  };

  // Create search filters based on selected options and CPDs
  const createSearchFilters = (): RecipeSearchFilters => {
    // Get allergy-based dietary restrictions
    const dietaryPreferences = Object.entries(allergies)
      .filter(([_, isChecked]) => isChecked)
      .map(([allergy]) => `no-${allergy}`);
    
    // Add user-selected diet if specified
    if (selectedDiet && selectedDiet !== "omnivore") {
      dietaryPreferences.push(selectedDiet);
    }
    
    // Add CPD-derived dietary terms
    const cpdDietaryTerms = extractDietaryTermsFromCPDs();
    dietaryPreferences.push(...cpdDietaryTerms);
    
    return {
      ingredients: selectedIngredients,
      cuisineType: selectedCuisine,
      mealType: selectedMealType,
      dietaryPreferences: Array.from(new Set(dietaryPreferences)), // Remove duplicates
      userId,
      useCPDs: true, // Flag to indicate CPDs should be considered in the search
      additionalContext: {
        doctorCPD: carePlanDirective // Include doctor's exact CPD text
      }
    };
  };

  // Search for recipes from our backend API
  const handleSearchRecipes = async () => {
    if (activeTab === "recipes") {
      setIsLoadingRecipes(true);
    } else {
      setIsLoadingVideos(true);
    }
    
    const filters = createSearchFilters();
    
    try {
      if (activeTab === "recipes") {
        // Search for text-based recipes
        const recipeResults = await searchRecipes(filters);
        
        if (recipeResults.length === 0) {
          toast({
            title: "No recipes found",
            description: "Try adjusting your search criteria and try again",
            variant: "destructive"
          });
          setAnalyzedRecipes([]);
        } else {
          // Analyze the first 3 recipes to avoid too many API calls
          const recipesToAnalyze = recipeResults.slice(0, 3);
          const analyzedResults = await Promise.all(
            recipesToAnalyze.map(recipe => analyzeRecipe(recipe, userId))
          );
          
          setAnalyzedRecipes(analyzedResults);
          
          toast({
            title: "Recipes found",
            description: `Found ${recipeResults.length} recipes matching your preferences`,
          });
        }
      } else {
        // Search for YouTube cooking videos that match meal preparation criteria
        const videoResults = await searchCookingVideos(filters);
        
        if (videoResults.length === 0) {
          toast({
            title: "No videos found",
            description: "Try adjusting your search criteria and try again",
            variant: "destructive"
          });
          setVideos([]);
        } else {
          // Convert results to video format with IDs and enhanced tags
          const formattedVideos = videoResults.map((result, index) => {
            // Create comprehensive tags from all available sources
            const baseTags = [
              selectedMealType || "meal", 
              selectedDiet || "recipe",
              selectedCuisine || "food"
            ].filter(Boolean);
            
            // Add any CPD-related tags that came from the server
            const allTags = [...baseTags];
            
            // If the server returned tags that match CPDs, add those
            if (result.tags && result.tags.length > 0) {
              allTags.push(...result.tags);
            }
            
            // If this is for an individual meal (better matches our requirement)
            if (result.title.toLowerCase().includes("how to make") || 
                result.title.toLowerCase().includes("how to cook") ||
                result.title.toLowerCase().includes("recipe")) {
              allTags.push("individual-meal");
            }
            
            return {
              ...result,
              id: index + 1,
              tags: Array.from(new Set(allTags)) // Remove duplicates
            };
          });
          
          setVideos(formattedVideos);
          
          toast({
            title: "Meal Videos Found",
            description: `Found ${formattedVideos.length} cooking videos matching your doctor's plan`,
          });
        }
      }
      
      setSearchPerformed(true);
    } catch (error) {
      console.error(`Error searching for ${activeTab}:`, error);
      toast({
        title: `Error searching for ${activeTab}`,
        description: "Please check your network connection and try again",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRecipes(false);
      setIsLoadingVideos(false);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Clear previous search results when switching tabs
    if (value === "recipes") {
      setVideos([]);
    } else {
      setAnalyzedRecipes([]);
    }
    setSearchPerformed(false);
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

  // Get thumbnail - use the provided one or fall back to our images
  const getThumbnail = (item: RecipeSearchResult | EnhancedRecipe, index: number): string => {
    // First try to use the thumbnail from the API
    if (item.thumbnail_url && item.thumbnail_url.startsWith('http')) {
      return item.thumbnail_url;
    }
    
    // If no thumbnail or invalid URL, generate a placeholder based on title
    if (!item.thumbnail_url && activeTab === 'videos') {
      // Red background for YouTube videos
      return `https://placehold.co/320x180/ff0000/ffffff?text=${encodeURIComponent(item.title.substring(0, 20))}`;
    } else if (!item.thumbnail_url) {
      // Blue/green background for recipes
      return `https://placehold.co/600x400/e6f7ff/1e6091?text=${encodeURIComponent(item.title.substring(0, 20))}`;
    }
    
    // Final fallback - use our predefined images
    return fallbackImages[index % fallbackImages.length];
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Inspiration Machine D</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Meal Ideas for Your Doctor's Plan</CardTitle>
          <CardDescription>
            Find exciting and delicious meals that match your doctor's recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Doctor's CPD for Diet */}
            {loadingCPD ? (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <p>Loading doctor's recommendations...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6 border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Library className="h-5 w-5 text-primary" />
                    Doctor's Diet Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic">"{carePlanDirective}"</p>
                </CardContent>
              </Card>
            )}
            
            <Tabs defaultValue="recipes" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="recipes">Recipe Search</TabsTrigger>
                <TabsTrigger value="videos">Video Tutorials</TabsTrigger>
              </TabsList>
              
              <TabsContent value="recipes" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Find healthy recipes with nutritional analysis and health scores.
                </p>
              </TabsContent>
              
              <TabsContent value="videos" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Discover cooking tutorial videos to help you prepare healthy meals.
                </p>
              </TabsContent>
            </Tabs>
            
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
                    <SelectItem value="dessert">Dessert</SelectItem>
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
                    <SelectItem value="mexican">Mexican</SelectItem>
                    <SelectItem value="indian">Indian</SelectItem>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="australian">Australian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="diet">Dietary Preference</Label>
                <Select value={selectedDiet} onValueChange={setSelectedDiet}>
                  <SelectTrigger id="diet">
                    <SelectValue placeholder="Select diet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="omnivore">Omnivore</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="pescatarian">Pescatarian</SelectItem>
                    <SelectItem value="keto">Keto</SelectItem>
                    <SelectItem value="low-sodium">Low-Sodium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block">Allergies & Restrictions</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(allergies).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`allergy-${key}`} 
                      checked={value}
                      onCheckedChange={(checked) => {
                        setAllergies({
                          ...allergies,
                          [key]: checked === true
                        });
                      }}
                    />
                    <Label htmlFor={`allergy-${key}`} className="capitalize">{key}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={handleSearchRecipes}
              className="bg-primary text-white hover:bg-primary/90 w-full md:w-auto"
              disabled={isLoadingRecipes || isLoadingVideos}
            >
              {(isLoadingRecipes || isLoadingVideos) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Find {activeTab === "recipes" ? "Recipes" : "Videos"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Recipe Tab Content */}
      {activeTab === "recipes" && (
        <>
          {isLoadingRecipes ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-lg">Searching for healthy recipes and analyzing nutritional value...</span>
            </div>
          ) : analyzedRecipes.length > 0 ? (
            <div className="space-y-6">
              {analyzedRecipes.map((recipe, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="md:flex">
                    <div className="md:w-1/3">
                      <img 
                        src={getThumbnail(recipe, index)} 
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
                        {recipe.source_name && (
                          <Badge variant="outline" className="bg-purple-50">
                            {recipe.source_name}
                          </Badge>
                        )}
                      </div>
                      
                      {recipe.analysis && (
                        <div className="mb-3">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center">
                              <Award className="h-4 w-4 text-amber-500 mr-1" />
                              <span className="text-sm font-medium">
                                Health Score: {recipe.healthScore}/100
                              </span>
                            </div>
                            
                            <div className="flex items-center">
                              <ChefHat className="h-4 w-4 text-blue-500 mr-1" />
                              <span className="text-sm">
                                Difficulty: {recipe.analysis.difficultyLevel}
                              </span>
                            </div>
                            
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-red-400 mr-1" />
                              <span className="text-sm">
                                ~{recipe.analysis.caloriesEstimate}
                              </span>
                            </div>
                          </div>
                          
                          <Accordion type="single" collapsible className="mt-2">
                            <AccordionItem value="nutrition">
                              <AccordionTrigger className="text-sm py-2">
                                Nutritional Analysis
                              </AccordionTrigger>
                              <AccordionContent>
                                <p className="text-sm mb-2">{recipe.analysis.nutritionalValue}</p>
                                
                                <h4 className="text-sm font-semibold mb-1">Health Benefits:</h4>
                                <ul className="text-sm list-disc pl-5 mb-2">
                                  {recipe.analysis.healthBenefits.map((benefit, i) => (
                                    <li key={i}>{benefit}</li>
                                  ))}
                                </ul>
                                
                                {recipe.analysis.alternatives.length > 0 && (
                                  <>
                                    <h4 className="text-sm font-semibold mb-1">Ingredient Alternatives:</h4>
                                    <ul className="text-sm list-disc pl-5">
                                      {recipe.analysis.alternatives.slice(0, 2).map((alt, i) => (
                                        <li key={i}>
                                          {alt.ingredient}: {alt.alternatives.join(', ')}
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                            
                            {recipe.analysis.tips.length > 0 && (
                              <AccordionItem value="tips">
                                <AccordionTrigger className="text-sm py-2">
                                  Cooking Tips
                                </AccordionTrigger>
                                <AccordionContent>
                                  <ul className="text-sm list-disc pl-5">
                                    {recipe.analysis.tips.map((tip, i) => (
                                      <li key={i}>{tip}</li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            )}
                          </Accordion>
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
              <p>Try adjusting your search terms or dietary preferences.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg">Use the search options above to find healthy recipes.</p>
              <p>Select a meal type and your dietary preferences to get started.</p>
            </div>
          )}
        </>
      )}
      
      {/* Video Tab Content */}
      {activeTab === "videos" && (
        <>
          {isLoadingVideos ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-lg">Searching for cooking videos...</span>
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((video, index) => (
                <Card key={video.id} className="overflow-hidden">
                  <div className="relative">
                    <img 
                      src={getThumbnail(video, index)} 
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{video.title}</h3>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-gray-500 text-sm">{video.source_name || 'YouTube'}</p>
                      <div className="flex gap-1">
                        {video.tags && video.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => window.open(video.url, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Watch
                      </Button>
                      <Button 
                        variant={isRecipeSaved(video.url) ? "default" : "secondary"} 
                        size="sm"
                        onClick={() => handleSaveRecipe(video)}
                        disabled={saveMutation.isPending || isRecipeSaved(video.url)}
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Heart className="h-4 w-4 mr-1" fill={isRecipeSaved(video.url) ? "currentColor" : "none"} />
                        )}
                        {isRecipeSaved(video.url) ? "Saved" : "Save"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchPerformed ? (
            <div className="text-center py-8">
              <p className="text-lg">No videos found matching your criteria.</p>
              <p>Try adjusting your search terms or dietary preferences.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg">Use the search options above to find cooking videos.</p>
              <p>Select a meal type and your dietary preferences to get started.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InspirationD;