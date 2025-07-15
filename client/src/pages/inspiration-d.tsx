import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, ExternalLink, Trash, Loader2, Heart, Library,
  Youtube, ChefHat, ShoppingCart, Database, RefreshCw,
  Play, Clock, Calendar, X
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';

// Interface definitions
interface CarePlanDirective {
  id: number;
  userId: number;
  directive: string;
  category: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CuratedVideo {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string;
  source_name: string;
  duration?: string;
  cpdAlignment?: boolean;
  aiTags?: string[];
  relevanceScore: number;
}

interface ShoppingListItem {
  id: string;
  name: string;
  amount?: string;
  checked: boolean;
  sourceId: string;
  sourceName: string;
  sourceType: 'video' | 'recipe';
}

interface SavedFavorite {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string;
  type: 'video' | 'recipe';
  savedAt: Date;
  tags?: string[];
}

export default function InspirationMachineD() {
  const { user } = useAuth();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState<string>('videos');
  const [carePlanDirective, setCarePlanDirective] = useState<string>('');
  const [loadingCPD, setLoadingCPD] = useState<boolean>(true);
  const [curatedVideos, setCuratedVideos] = useState<CuratedVideo[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState<string>('all');
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  
  const { toast } = useToast();

  // Fetch Care Plan Directives
  const { data: carePlanDirectives = [], isLoading: isLoadingCPDs } = useQuery({
    queryKey: ['/api/users', userId, 'care-plan-directives', 'active'],
    queryFn: async () => {
      // const response = await apiRequest('GET', `/api/users/${userId}/care-plan-directives/active`);
      // return response.json();
      return []; // Mocked for now
    },
    enabled: !!userId,
  });

  // Fetch Saved Favorites
  const { data: savedFavorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ['/api/users', userId, 'inspiration-favorites'],
    queryFn: async () => {
      // const response = await apiRequest('GET', `/api/users/${userId}/inspiration-favorites`);
      // return response.json();
      return []; // Mocked for now
    },
    enabled: !!userId,
  });

  // Load CPD on mount
  useEffect(() => {
    const dietCPD = carePlanDirectives.find(cpd =>
      cpd.category.toLowerCase().includes('diet') ||
      cpd.category.toLowerCase().includes('nutrition') ||
      cpd.directive.toLowerCase().includes('meal')
    );

    setCarePlanDirective(
      dietCPD ? dietCPD.directive :
      'Your doctor has not yet provided dietary directives. Check back later.'
    );
    setLoadingCPD(false);
  }, [carePlanDirectives]);

  // Load curated videos on component mount and when CPDs change
  useEffect(() => {
    if (!loadingCPD && carePlanDirective) {
      handleLoadCuratedVideos();
    }
  }, [loadingCPD, carePlanDirective]);

  // Load AI-curated videos
  const handleLoadCuratedVideos = async () => {
    setIsLoadingVideos(true);
    
    try {
      const response = await fetch('/api/inspiration/curated-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId,
          cpdDirective: carePlanDirective,
          preferences: {
            // User preferences would be loaded from settings
            cuisinePreferences: [],
            dietaryRestrictions: [],
            skillLevel: 'intermediate'
          }
        })
      });

      if (!response.ok) throw new Error('Failed to load curated videos');

      const videos = await response.json() as CuratedVideo[];
      setCuratedVideos(videos.slice(0, 10)); // Exactly 10 videos
      
      toast({
        title: "Videos Curated",
        description: `Found ${videos.length} videos matching your doctor's plan`,
      });
      trackInspirationUsage.mutate({ action: 'load_videos', details: { count: videos.length } });
    } catch (error) {
      console.error('Error loading curated videos:', error);
      toast({
        title: "Error",
        description: "Failed to load curated videos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleGenerateShoppingList = (source: CuratedVideo | SavedFavorite) => {
    // This will be a manual process for the user
    toast({
      title: "Shopping List",
      description: "You can manually add ingredients to your shopping list.",
    });
  };

  const saveFavoriteMutation = useMutation({
    mutationFn: async (item: CuratedVideo | SavedFavorite) => {
      // Mocked for now
      return Promise.resolve({});
    },
    onSuccess: (data, variables) => {
      refetchFavorites();
      toast({
        title: "Saved to Favorites",
        description: "Item added to your favorites collection",
      });
      trackInspirationUsage.mutate({ action: 'save_favorite', details: { title: variables.title } });
    }
  });

  const trackInspirationUsage = useMutation({
    mutationFn: async (details: { action: string, details: any }) => {
      if (!userId) return;
      await apiRequest('POST', `/api/supervisor-agent/track-inspiration-usage`, {
        userId,
        ...details,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const isItemSaved = useCallback((url: string) => {
    return savedFavorites.some(fav => fav.url === url);
  }, [savedFavorites]);

  const handleLinkToFoodDatabase = () => {
    window.open('/food-database', '_blank');
  };

  const filteredFavorites = savedFavorites.filter(fav => {
    if (favoriteFilter === 'all') return true;
    if (favoriteFilter === 'videos') return fav.type === 'video';
    if (favoriteFilter === 'recipes') return fav.type === 'recipe';
    if (favoriteFilter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(fav.savedAt) > oneWeekAgo;
    }
    return true;
  });

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E8BC0] mb-2">
            Inspiration Machine D
          </h1>
          <p className="text-[#676767] text-lg">
            Personalized meal inspiration aligned with your doctor's recommendations
          </p>
        </div>

        <Card className="mb-8 border-[#2E8BC0]/30 bg-[#2E8BC0]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-3 text-[#2E8BC0]">
              <Library className="h-6 w-6" />
              Doctor's Healthy Meal Plan Directive
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCPD ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading doctor's recommendations...</span>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg border border-[#2E8BC0]/20">
                <p className="text-[#676767] italic text-base leading-relaxed">
                  "{carePlanDirective}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-100">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              Video Inspiration
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Recipe Search
            </TabsTrigger>
            <TabsTrigger value="shopping" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Shopping List
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              My Favorites ({savedFavorites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-[#676767] mb-2">
                  AI-Curated Cooking Videos
                </h2>
                <p className="text-[#a4a4a4]">
                  10 carefully selected videos matching your doctor's dietary recommendations
                </p>
              </div>
              
              <Button
                onClick={handleLoadCuratedVideos}
                variant="outline"
                className="border-[#2E8BC0] text-[#2E8BC0]"
                disabled={isLoadingVideos}
              >
                {isLoadingVideos ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Collection
              </Button>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Database className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">
                  Need nutritional information for ingredients?
                </p>
                <p className="text-sm text-blue-700">
                  Search the Australian Food Database for detailed nutrition facts
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleLinkToFoodDatabase}
                className="border-blue-600 text-blue-600 hover:bg-blue-100"
              >
                Open Food Database
              </Button>
            </div>

            {isLoadingVideos ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#2E8BC0]" />
                <span className="ml-3 text-lg">AI is curating videos for your dietary plan...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {curatedVideos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    index={index}
                    onSave={() => saveFavoriteMutation.mutate(video)}
                    onGenerateShoppingList={() => handleGenerateShoppingList(video)}
                    isSaved={isItemSaved(video.url)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shopping" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-[#676767] mb-2">
                  My Shopping List
                </h2>
                <p className="text-[#a4a4a4]">
                  Manually add ingredients you need for your meal plan.
                </p>
              </div>
              <Button variant="outline" onClick={() => setShoppingList([])}>
                <Trash className="h-4 w-4 mr-2" />
                Clear List
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newShoppingItem}
                onChange={(e) => setNewShoppingItem(e.target.value)}
                placeholder="e.g., Almond milk"
                className="flex-grow p-2 border rounded-md"
              />
              <Button onClick={() => {
                if (newShoppingItem.trim()) {
                  setShoppingList([...shoppingList, { id: crypto.randomUUID(), name: newShoppingItem.trim(), checked: false, sourceId: 'manual', sourceName: 'Manual', sourceType: 'recipe' }]);
                  setNewShoppingItem('');
                }
              }}>Add Item</Button>
            </div>
            <div className="space-y-2">
              {shoppingList.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => {
                        setShoppingList(shoppingList.map(i => i.id === item.id ? { ...i, checked: !!checked } : i));
                      }}
                    />
                    <span className={item.checked ? 'line-through text-gray-500' : ''}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => window.open(`/food-database?search=${encodeURIComponent(item.name)}`, '_blank')}>
                      <Database className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => window.open(`/food-database?search=${encodeURIComponent(item.name)}`, '_blank')}>
                      <Database className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShoppingList(shoppingList.filter(i => i.id !== item.id))}>
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-[#676767] mb-2">
                  My Favorites
                </h2>
                <p className="text-[#a4a4a4]">
                  Your saved recipes and cooking videos
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={favoriteFilter} onValueChange={setFavoriteFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Favorites</SelectItem>
                    <SelectItem value="videos">Videos Only</SelectItem>
                    <SelectItem value="recipes">Recipes Only</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Mock clearing favorites
                    toast({ title: "Favorites Cleared", description: "All your favorites have been removed." });
                  }}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>

            {filteredFavorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFavorites.map((favorite, index) => (
                  <FavoriteCard
                    key={favorite.id}
                    favorite={favorite}
                    onRemove={() => {
                      // Mock removing a favorite
                      toast({ title: "Favorite Removed", description: `${favorite.title} has been removed from your favorites.` });
                    }}
                    onGenerateShoppingList={() => handleGenerateShoppingList(favorite)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-[#676767] mb-2">
                  No favorites saved yet
                </h3>
                <p className="text-[#a4a4a4] mb-4">
                  Save videos and recipes to build your personal collection
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('videos')}
                    className="border-[#2E8BC0] text-[#2E8BC0]"
                  >
                    Browse Videos
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('recipes')}
                    className="border-[#2E8BC0] text-[#2E8BC0]"
                  >
                    Search Recipes
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function VideoCard({ video, index, onSave, onGenerateShoppingList, isSaved }: { video: CuratedVideo, index: number, onSave: () => void, onGenerateShoppingList: () => void, isSaved: boolean }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="relative group cursor-pointer">
        <img
          src={video.thumbnail_url || `https://placehold.co/560x315/ff0000/ffffff?text=${encodeURIComponent(video.title.substring(0, 20))}`}
          alt={video.title}
          className="w-full h-48 object-cover"
          onClick={() => window.open(video.url, '_blank')}
        />

        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
          <div className="bg-red-600 rounded-full p-3 group-hover:scale-110 transition-transform">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>

        {video.cpdAlignment && (
          <Badge className="absolute top-2 right-2 bg-green-600 text-white">
            CPD Aligned
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-[#676767]">
          {video.title}
        </h3>

        <div className="flex items-center text-sm text-[#a4a4a4] mb-3">
          <Youtube className="h-4 w-4 mr-1 text-red-600" />
          <span>{video.source_name || 'YouTube'}</span>
          {video.duration && (
            <>
              <span className="mx-2">•</span>
              <Clock className="h-4 w-4 mr-1" />
              <span>{video.duration}</span>
            </>
          )}
        </div>

        {video.aiTags && (
          <div className="flex flex-wrap gap-1 mb-4">
            {video.aiTags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(video.url, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Watch
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateShoppingList}
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Ingredients
          </Button>

          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={onSave}
            className={isSaved ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Heart className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FavoriteCard({ favorite, onRemove, onGenerateShoppingList }: { favorite: SavedFavorite, onRemove: () => void, onGenerateShoppingList: () => void }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={favorite.thumbnail_url}
          alt={favorite.title}
          className="w-full h-40 object-cover"
        />

        <Badge
          className={`absolute top-2 left-2 ${
            favorite.type === 'video'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {favorite.type === 'video' ? 'Video' : 'Recipe'}
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-4">
        <h3 className="font-medium text-[#676767] mb-2 line-clamp-2">
          {favorite.title}
        </h3>

        <div className="flex items-center text-xs text-[#a4a4a4] mb-3">
          <Calendar className="h-3 w-3 mr-1" />
          <span>Saved on {new Date(favorite.savedAt).toLocaleDateString()}</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(favorite.url, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {favorite.type === 'video' ? 'Watch' : 'View'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateShoppingList}
            className="border-orange-500 text-orange-600"
          >
            <ShoppingCart className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
