import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCPD } from '@/hooks/useCPD';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Heart, Info, Search, Youtube, ThumbsUp, ThumbsDown, Filter, Play, 
  RefreshCw, ShoppingBag, X, Loader2 } from 'lucide-react';
import RecipeService, { RecipeSearchFilters, RecipeSearchResult } from '@/services/recipeService';
import { Badge } from '@/components/ui/badge';

import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';

// Renamed to InspirationDNew to avoid conflicts with old component
export default function InspirationDNew() {
  // User ID for Marijke Collins (production user)
  const userId = 2; // Reuben Collins - Patient

  // State variables
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<RecipeSearchResult[]>([]);
  const [favoriteVideos, setFavoriteVideos] = useState<RecipeSearchResult[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [isHeartHealthRelated, setIsHeartHealthRelated] = useState(false);
  const [internalSearchParams, setInternalSearchParams] = useState<{
    doctorCPD: string;
    ahfGuidelines: string;
  }>({ doctorCPD: '', ahfGuidelines: '' });
  // Shopping list feature state
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingListItems, setShoppingListItems] = useState<string>(() => {
    // Get saved shopping list from localStorage
    const savedList = localStorage.getItem(`user_${userId}_shopping_list`);
    return savedList || '';
  });

  // Search filters
  const [filters, setFilters] = useState<RecipeSearchFilters>({
    ingredients: [],
    cuisineType: 'any',
    mealType: 'any',
    dietaryPreferences: ['any'],
    userId
  });

  // Form inputs
  const [ingredientInput, setIngredientInput] = useState('');

  const { toast } = useToast();
  
  // Use the unified CPD hook
  const {
    carePlanDirectives: directives,
    loadingCPD: isLoadingDirectives,
    cpdError: directivesError,
    getDietDirective,
    dietPlan,
    hasDietDirective
  } = useCPD(userId);
  
  // Get the diet-related directive
  const dietDirective = getDietDirective();
  
  // Define loadingDietPlan for UI compatibility
  const loadingDietPlan = isLoadingDirectives;

  // Analyze CPD for heart health related content and set up search params
  useEffect(() => {
    const setupSearchParams = async () => {
      try {
        // Get Australian Heart Foundation recommendations as fallback
        const ahfGuidelines = getAustralianHeartFoundationRecommendations(filters);
        
        if (dietDirective) {
          // Check if directive is related to heart health
          const heartHealthRelated = await analyzeForHeartHealth(dietDirective.directive);
          setIsHeartHealthRelated(heartHealthRelated);
          
          // Update search parameters with the actual directive
          setInternalSearchParams({
            doctorCPD: dietDirective.directive,
            ahfGuidelines: ahfGuidelines
          });
        } else {
          // If no directive is found, reset heart health flag and use AHF guidelines
          setIsHeartHealthRelated(false);
          setInternalSearchParams({
            doctorCPD: "",
            ahfGuidelines: ahfGuidelines
          });
        }
      } catch (error) {
        console.error('Error analyzing diet plan:', error);
        
        // Use AHF guidelines as fallback for search
        const ahfGuidelines = getAustralianHeartFoundationRecommendations(filters);
        setIsHeartHealthRelated(false);
        setInternalSearchParams({
          doctorCPD: "",
          ahfGuidelines: ahfGuidelines
        });
      }
    };
    
    setupSearchParams();
  }, [dietDirective, filters.cuisineType, filters.dietaryPreferences]);

  // Analyze function for heart health content
  const analyzeForHeartHealth = async (directive: string): Promise<boolean> => {
    try {
      // Keywords related to heart health
      const heartHealthKeywords = [
        'heart', 'cardiac', 'cardiovascular', 'stroke', 'blood pressure',
        'cholesterol', 'hypertension', 'omega', 'fish oil', 'saturated fat'
      ];

      const lowerDirective = directive.toLowerCase();
      return heartHealthKeywords.some(keyword => lowerDirective.includes(keyword));
    } catch (error) {
      console.error('Error analyzing for heart health:', error);
      return false; // Default to false if analysis fails
    }
  };

  // Helper function to get Australian Heart Foundation recommendations
  const getAustralianHeartFoundationRecommendations = (filters: RecipeSearchFilters): string => {
    let cuisineSpecific = '';
    if (filters.cuisineType && filters.cuisineType !== 'any') {
      cuisineSpecific = `\n\nFor your preferred ${filters.cuisineType} cuisine, focus on heart-healthy dishes like `;

      switch (filters.cuisineType) {
        case 'Mediterranean':
          cuisineSpecific += 'olive oil-based dishes, fresh seafood, and vegetable-rich meals.';
          break;
        case 'Asian':
          cuisineSpecific += 'steamed dishes, stir-fries with plenty of vegetables, and dishes with tofu and fish.';
          break;
        case 'Mexican':
          cuisineSpecific += 'bean-based dishes, avocado, grilled fish tacos, and vegetable-filled fajitas.';
          break;
        case 'Italian':
          cuisineSpecific += 'tomato-based sauces, vegetable antipasti, and seafood dishes.';
          break;
        case 'Indian':
          cuisineSpecific += 'lentil dahls, vegetable curries, tandoori fish, and dishes with turmeric and other heart-healthy spices.';
          break;
        case 'American':
          cuisineSpecific += 'grilled fish, bean chilis, vegetable soups, and whole grain options.';
          break;
        case 'Middle Eastern':
          cuisineSpecific += 'hummus, tabbouleh, grilled kebabs with lean proteins, and olive oil-based dishes.';
          break;
        default:
          cuisineSpecific = '';
      }
    }

    let dietarySpecific = '';
    if (filters.dietaryPreferences && filters.dietaryPreferences.length > 0 && !filters.dietaryPreferences.includes('any')) {
      const preference = filters.dietaryPreferences[0];
      dietarySpecific = `\n\nFor your ${preference} dietary preference: `;

      switch(preference) {
        case 'vegetarian':
          dietarySpecific += 'Ensure you get enough plant-based proteins from legumes, nuts, seeds, and dairy.';
          break;
        case 'vegan':
          dietarySpecific += 'Focus on a variety of plant proteins, and consider vitamin B12 and omega-3 supplements.';
          break;
        case 'gluten-free':
          dietarySpecific += 'Choose whole grain alternatives like brown rice, quinoa, and buckwheat.';
          break;
        case 'dairy-free':
          dietarySpecific += 'Ensure adequate calcium intake from leafy greens, fortified plant milks, and suitable alternatives.';
          break;
        case 'keto':
          dietarySpecific += 'Choose heart-healthy fats like avocados, nuts, and olive oil over saturated fats.';
          break;
        case 'low-carb':
          dietarySpecific += 'Include low-carb vegetables and focus on quality proteins and healthy fats.';
          break;
        case 'paleo':
          dietarySpecific += 'Emphasize lean proteins, vegetables, fruits, and nuts while limiting processed foods.';
          break;
        default:
          dietarySpecific = '';
      }
    }

    return `Australian Heart Foundation Recommendations:\n
• Eat plenty of vegetables, fruits, and whole grains
• Include a variety of healthy protein sources like fish, legumes, and nuts
• Choose unflavoured dairy products and limit eggs
• Limit red meat to 1-3 times per week
• Minimize processed foods high in salt, sugar, and unhealthy fats
• If you drink alcohol, limit to no more than 10 standard drinks per week${cuisineSpecific}${dietarySpecific}`;
  };

  // Load user's favorite videos on component mount and when the tab changes to favorites
  useEffect(() => {
    if (activeTab === 'favorites') {
      loadFavoriteVideos();
    }
  }, [activeTab, userId]);
  
  // Save shopping list to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`user_${userId}_shopping_list`, shoppingListItems);
    
    // Dispatch a custom event to notify other components about the change
    const event = new CustomEvent('shopping_list_updated', { 
      detail: { userId, items: shoppingListItems } 
    });
    window.dispatchEvent(event);
  }, [shoppingListItems, userId]);
  
  // Listen for shopping list updates from other components
  useEffect(() => {
    const handleShoppingListUpdate = (e: CustomEvent) => {
      const data = e.detail;
      if (data.userId === userId && data.items !== shoppingListItems) {
        setShoppingListItems(data.items);
      }
    };
    
    // Add event listener with type assertion for CustomEvent
    window.addEventListener('shopping_list_updated', handleShoppingListUpdate as EventListener);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('shopping_list_updated', handleShoppingListUpdate as EventListener);
    };
  }, [userId, shoppingListItems]);

  // Load user's favorite videos from the API
  const loadFavoriteVideos = async () => {
    try {
      setLoadingFavorites(true);
      const videos = await RecipeService.getFavoriteVideos(userId);
      setFavoriteVideos(videos);
    } catch (error) {
      console.error('Error loading favorite videos:', error);
      toast({
        title: 'Failed to load favorites',
        description: 'Could not retrieve your favorite videos. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Add an ingredient to the search filters
  const addIngredient = () => {
    if (!ingredientInput.trim()) return;

    const ingredients = [...(filters.ingredients || [])];
    if (!ingredients.includes(ingredientInput.trim())) {
      ingredients.push(ingredientInput.trim());
      setFilters({ ...filters, ingredients });
    }

    setIngredientInput('');
  };

  // Remove an ingredient from the search filters
  const removeIngredient = (ingredient: string) => {
    const ingredients = [...(filters.ingredients || [])];
    const index = ingredients.indexOf(ingredient);

    if (index !== -1) {
      ingredients.splice(index, 1);
      setFilters({ ...filters, ingredients });
    }
  };

  // Search for cooking videos based on the current filters
  const searchVideos = async () => {
    try {
      setLoading(true);

      // Process filters to handle 'any' values
      const searchFilters = { ...filters };
      if (searchFilters.cuisineType === 'any') searchFilters.cuisineType = '';
      if (searchFilters.mealType === 'any') searchFilters.mealType = '';
      if (searchFilters.dietaryPreferences?.includes('any')) searchFilters.dietaryPreferences = [];

      // Include doctor's CPD and AHF guidelines in the search context for better results
      // This sends both to the backend but neither appears directly in the UI
      const results = await RecipeService.searchCookingVideos({
        ...searchFilters,
        userId,
        additionalContext: {
          doctorCPD: internalSearchParams.doctorCPD,
          ahfGuidelines: internalSearchParams.ahfGuidelines
        }
      });

      setSearchResults(results);

      if (results.length === 0) {
        toast({
          title: 'No videos found',
          description: 'Try adjusting your search criteria.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error searching videos:', error);
      toast({
        title: 'Search failed',
        description: typeof error === 'string' ? error : 'Failed to search for cooking videos. Please try again.',
        variant: 'destructive'
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Save a video to favorites
  const saveToFavorites = async (video: RecipeSearchResult) => {
    try {
      await RecipeService.saveFavoriteVideo(userId, video);

      toast({
        title: 'Video saved',
        description: 'Video added to your favorites.',
        variant: 'default'
      });

      // If on favorites tab, refresh the list
      if (activeTab === 'favorites') {
        loadFavoriteVideos();
      }
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save video to favorites. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Remove a video from favorites
  const removeFromFavorites = async (videoId: number) => {
    try {
      await RecipeService.deleteFavoriteVideo(userId, videoId);

      toast({
        title: 'Video removed',
        description: 'Video removed from your favorites.',
        variant: 'default'
      });

      // Update the favorites list
      setFavoriteVideos(favoriteVideos.filter(video => video.id !== videoId));
    } catch (error) {
      console.error('Error removing video:', error);
      toast({
        title: 'Remove failed',
        description: 'Failed to remove video from favorites. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Shopping list functions
  const handleShoppingListChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newList = e.target.value;
    setShoppingListItems(newList);
    // The useEffect hook will handle saving to localStorage
  };
  
  const clearShoppingList = () => {
    setShoppingListItems('');
    localStorage.removeItem(`user_${userId}_shopping_list`);
    
    // Dispatch a custom event to notify other components about the cleared list
    const event = new CustomEvent('shopping_list_updated', { 
      detail: { userId, items: '' } 
    });
    window.dispatchEvent(event);
    
    toast({
      title: 'Shopping List Cleared',
      description: 'Your healthy ingredients shopping list has been cleared.',
      variant: 'default'
    });
  };
  
  const toggleShoppingList = () => {
    setShowShoppingList(prev => !prev);
  };

  // Extract YouTube video ID from a URL
  const extractYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;

    try {
      // Handle different YouTube URL formats
      let videoId: string | null = null;

      // youtu.be format
      if (url.includes('youtu.be/')) {
        const parts = url.split('youtu.be/');
        if (parts.length > 1) {
          videoId = parts[1].split('?')[0].split('&')[0];
        }
      } 
      // youtube.com/watch?v= format
      else if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v');
      } 
      // youtube.com/v/ or /embed/ format
      else if (url.includes('/v/') || url.includes('/embed/')) {
        const regex = /\/(?:v|embed)\/([^/?&]+)/;
        const match = url.match(regex);
        videoId = match ? match[1] : null;
      }

      return videoId;
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
      return null;
    }
  };

  // Render a video card component
  const VideoCard = ({ video, isFavorite = false }: { video: RecipeSearchResult, isFavorite?: boolean }) => {
    // Handle case when URL is invalid or missing
    const videoUrl = video.url || '';
    // Get videoId from either the stored property or by extracting from URL
    const videoId = video.videoId || extractYoutubeVideoId(videoUrl);
    
    // Nutritional analysis data
    const nutritionalInfo = video.nutritionalAnalysis;
    const healthScore = nutritionalInfo?.healthScore;
    const calories = nutritionalInfo?.calories;
    const difficulty = nutritionalInfo?.difficulty;
    const allergens = nutritionalInfo?.allergens || [];
    const dietCompatibility = nutritionalInfo?.dietCompatibility || {};
    
    // Determine health score color
    const getHealthScoreColor = (score?: number) => {
      if (!score) return 'text-gray-400';
      if (score >= 8) return 'text-green-600';
      if (score >= 5) return 'text-yellow-600';
      return 'text-red-600';
    };
    
    // Get difficulty badge color
    const getDifficultyColor = (level?: string) => {
      if (!level) return 'bg-gray-100 text-gray-600';
      switch (level.toLowerCase()) {
        case 'easy': return 'bg-green-100 text-green-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'hard': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-600';
      }
    };

    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="p-4 pb-2 space-y-1">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg font-medium line-clamp-2 flex-grow">{video.title}</CardTitle>
            {healthScore && (
              <div className={`flex items-center ${getHealthScoreColor(healthScore)} font-semibold text-sm rounded-full px-2 py-0.5 whitespace-nowrap`}>
                <span className="mr-1">Health:</span>
                <span>{healthScore}/10</span>
              </div>
            )}
          </div>
          <CardDescription className="line-clamp-1 flex items-center justify-between">
            <span>{video.source_name || 'YouTube'}</span>
            {difficulty && (
              <Badge variant="outline" className={`ml-2 ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-0 flex-grow">
          <div className="mb-3">
            <AspectRatio ratio={16/9}>
              {videoId ? (
                <div className="relative">
                  <img 
                    src={video.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                    alt={video.title}
                    className="rounded-md w-full h-full object-cover"
                  />
                  {calories && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                      ~{calories} cal
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-12 h-12 bg-black/30 hover:bg-black/50 text-white rounded-full"
                      onClick={(e) => {
                        e.preventDefault();
                        // Ensure URL opens safely in a new tab with security attributes
                        const newWindow = window.open(videoUrl, '_blank');
                        if (newWindow) {
                          newWindow.opener = null; // Prevent the new page from having access to window.opener
                          newWindow.focus(); // Focus the new window/tab
                        } else {
                          // If window.open fails (e.g., due to popup blockers)
                          toast({
                            title: 'Popup blocked',
                            description: 'Please allow popups for this site to view the video.',
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      <Play size={24} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                  <Youtube size={40} className="opacity-30" />
                </div>
              )}
            </AspectRatio>
          </div>

          <p className="text-sm line-clamp-3 mb-2">
            {video.description || 'No description available.'}
          </p>
          
          {/* Diet compatibility indicators */}
          {Object.keys(dietCompatibility).length > 0 && (
            <div className="mt-2 mb-2">
              <p className="text-xs text-muted-foreground mb-1">Diet Compatibility:</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(dietCompatibility).map(([diet, isCompatible]) => (
                  <Badge 
                    key={diet} 
                    variant={isCompatible ? "default" : "outline"}
                    className={`text-xs ${isCompatible ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'text-gray-500'}`}
                  >
                    {diet}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Allergens warning */}
          {allergens.length > 0 && (
            <div className="mt-2 bg-red-50 p-2 rounded-md">
              <p className="text-xs text-red-700 font-medium">Potential allergens: {allergens.join(', ')}</p>
            </div>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              // Ensure URL opens safely in a new tab with security attributes
              const newWindow = window.open(videoUrl, '_blank');
              if (newWindow) {
                newWindow.opener = null; // Prevent the new page from having access to window.opener
                newWindow.focus(); // Focus the new window/tab
              } else {
                // If window.open fails (e.g., due to popup blockers)
                toast({
                  title: 'Popup blocked',
                  description: 'Please allow popups for this site to view the video.',
                  variant: 'destructive'
                });
              }
            }}
          >
            <Youtube className="h-4 w-4 mr-2" />
            Watch Video
          </Button>

          {isFavorite ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFromFavorites(video.id as number)}
            >
              <Heart className="h-4 w-4 mr-2 fill-destructive text-destructive" />
              Remove
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveToFavorites(video)}
            >
              <Heart className="h-4 w-4 mr-2" />
              Favorite
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Inspiration Machine D</h1>
              <p className="text-muted-foreground">Find Delicious Meals to Prepare Yourself or Use Your Diet Logistics Feature to have Ingredients or Similar Meals Delivered</p>
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
          
          {/* Healthy Ingredients Shopping List */}
          {showShoppingList && (
            <Card className="mb-4 border-green-100">
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
                <div className="flex justify-end mt-3">
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
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Dietary Recommendations
              </CardTitle>
              <CardDescription className="flex items-center">
                {!dietDirective ? (
                  "Awaiting doctor's recommendation"
                ) : isHeartHealthRelated ? (
                  <>
                    <Heart className="h-3 w-3 mr-1 text-red-500" fill="currentColor" />
                    Your doctor's exact diet plan with heart health guidance
                  </>
                ) : (
                  "Your Doctor's Healthy Meal Plan Recommendations"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDietPlan ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              ) : dietDirective ? (
                <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-md whitespace-pre-wrap text-sm overflow-auto max-h-[300px] custom-scrollbar">
                  {dietPlan}
                </div>
              ) : (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md whitespace-pre-wrap text-sm">
                  <p className="text-amber-700">Your doctor has not yet provided a specific diet plan. Please check back later or contact your healthcare provider.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs 
          defaultValue="search" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Search Videos
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center">
              <Heart className="h-4 w-4 mr-2" />
              My Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Healthy Meal Plan Inspiration Search
                </CardTitle>
                <CardDescription>
                  Include your preferences in your Healthy Meal Plan Inspiration search
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cuisineType">Cuisine Type</Label>
                    <Select 
                      value={filters.cuisineType || 'any'} 
                      onValueChange={(value) => setFilters({...filters, cuisineType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cuisine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Cuisine</SelectItem>
                        <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                        <SelectItem value="Asian">Asian</SelectItem>
                        <SelectItem value="Mexican">Mexican</SelectItem>
                        <SelectItem value="Italian">Italian</SelectItem>
                        <SelectItem value="Indian">Indian</SelectItem>
                        <SelectItem value="American">American</SelectItem>
                        <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mealType">Meal Type</Label>
                    <Select 
                      value={filters.mealType || 'any'} 
                      onValueChange={(value) => setFilters({...filters, mealType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select meal type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Meal</SelectItem>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="dietaryPreference">Dietary Preference</Label>
                    <Select 
                      value={(filters.dietaryPreferences || [])[0] || 'any'} 
                      onValueChange={(value) => setFilters({...filters, dietaryPreferences: value ? [value] : []})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">No Preference</SelectItem>
                        <SelectItem value="omnivore">Omnivore</SelectItem>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="gluten-free">Gluten-Free</SelectItem>
                        <SelectItem value="dairy-free">Dairy-Free</SelectItem>
                        <SelectItem value="keto">Keto</SelectItem>
                        <SelectItem value="low-carb">Low Carb</SelectItem>
                        <SelectItem value="paleo">Paleo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ingredients">Main Ingredients</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="ingredients"
                      placeholder="Type an ingredient and press Add"
                      value={ingredientInput}
                      onChange={(e) => setIngredientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addIngredient();
                        }
                      }}
                    />
                    <Button onClick={addIngredient} type="button">Add</Button>
                  </div>

                  {(filters.ingredients || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {filters.ingredients?.map((ingredient, i) => (
                        <Badge 
                          key={i} 
                          className="flex items-center gap-1 cursor-pointer"
                          variant="secondary"
                          onClick={() => removeIngredient(ingredient)}
                        >
                          {ingredient}
                          <span className="text-xs">×</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="justify-between flex-wrap gap-2">
                <Button variant="outline" onClick={() => setFilters({
                  ingredients: [],
                  cuisineType: 'any',
                  mealType: 'any',
                  dietaryPreferences: ['any'],
                  userId
                })}>
                  Reset Filters
                </Button>
                <Button onClick={searchVideos} disabled={loading}>
                  {loading ? 'Searching...' : 'Inspiration Search'}
                </Button>
              </CardFooter>
            </Card>

            {searchResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Search Results</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchResults.map((video, index) => (
                    <VideoCard key={index} video={video} />
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Card key={i} className="h-full">
                    <CardHeader className="p-4 pb-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Skeleton className="h-36 w-full mb-3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6 mt-1" />
                      <Skeleton className="h-4 w-4/6 mt-1" />
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between">
                      <Skeleton className="h-9 w-[100px]" />
                      <Skeleton className="h-9 w-[100px]" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  My Favorite Videos
                </CardTitle>
                <CardDescription>
                  Videos you've saved for easy reference
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFavorites ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i} className="h-full">
                        <CardHeader className="p-4 pb-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <Skeleton className="h-36 w-full mb-3" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6 mt-1" />
                        </CardContent>
                        <CardFooter className="p-4 pt-0 flex justify-between">
                          <Skeleton className="h-9 w-[100px]" />
                          <Skeleton className="h-9 w-[100px]" />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : favoriteVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                    {favoriteVideos.map((video, index) => (
                      <VideoCard key={index} video={video} isFavorite={true} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <Heart className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't saved any cooking tutorials. Search for videos and add them to your favorites.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('search')}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search Videos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}