# Exercise & Wellness Feature - Complete Component Code

## Component 1: Inspiration Machine E&W (`client/src/pages/inspiration-ew.tsx`)

```typescript
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, ExternalLink, ThumbsUp, Activity, Brain, Loader2, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import axios from "axios";

// Interface for video result from API
interface VideoResult {
  title: string;
  url: string;
  content: string;
  image: string | null;
  videoId: string | null;
  category: string;
  intensity: string;
  duration: string;
  fitnessAnalysis?: {
    difficultyLevel?: string;
    targetMuscleGroups?: string[];
    caloriesBurn?: number;
    suitableFor?: string[];
    equipment?: string[];
    healthBenefits?: string[];
    precautions?: string[];
    skillLevel?: string;
    intensityScore?: number;
    // For wellness videos
    practiceType?: string;
    duration?: number;
    benefitsFor?: string[];
  };
}

interface VideoSearchResponse {
  videos: VideoResult[];
  query: string;
  answer?: string;
}

// Import images for fallback thumbnails
import foodImage1 from "@assets/image_1744127067136.jpeg";
import foodImage2 from "@assets/image_1744127100239.jpeg";
import foodImage3 from "@assets/image_1744127300035.jpeg";

// Use these images as fallback video thumbnails
const imageAssets = [foodImage1, foodImage2, foodImage3];

const InspirationEW: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("exercise");
  const [intensity, setIntensity] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [wellnessType, setWellnessType] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savedVideos, setSavedVideos] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [carePlanDirective, setCarePlanDirective] = useState<string>('');
  const [loadingCPD, setLoadingCPD] = useState<boolean>(true);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Default user ID (should be replaced with actual user ID from context/auth)
  const userId = 73; // Marijke Collins - using existing user ID

  // Setup mutation for searching videos
  const videoSearchMutation = useMutation<VideoSearchResponse, Error, any>({
    mutationFn: async (searchData) => {
      const response = await axios.post<VideoSearchResponse>(
        '/api/exercise-wellness/videos',
        searchData
      );
      return response.data;
    },
    onSuccess: (data) => {
      setVideos(data.videos);
      toast({
        title: `${activeTab === "exercise" ? "Exercise" : "Wellness"} videos updated`,
        description: `Found ${data.videos.length} videos matching your preferences`,
      });
    },
    onError: (error) => {
      console.error('Error searching videos:', error);
      toast({
        title: "Error",
        description: "Failed to fetch videos. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle search button click
  const handleSearch = () => {
    const searchParams = {
      userId: 73,
      category: activeTab,
      intensity: activeTab === "exercise" ? intensity : undefined,
      duration: duration || wellnessType,
      tags: selectedTags
    };

    videoSearchMutation.mutate(searchParams);
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Toggle saving a video
  const toggleSaveVideo = (videoId: string) => {
    if (savedVideos.includes(videoId)) {
      setSavedVideos(savedVideos.filter(id => id !== videoId));
      toast({
        title: "Video removed",
        description: "Video removed from your favorites",
      });
    } else {
      setSavedVideos([...savedVideos, videoId]);
      toast({
        title: "Video saved",
        description: "Video added to your favorites",
      });
    }
  };

  // Get thumbnail image - use the image URL if available, otherwise use fallback
  const getVideoThumbnail = (video: VideoResult, index: number) => {
    return video.image || imageAssets[index % imageAssets.length];
  };

  // Fetch care plan directives on component mount
  useEffect(() => {
    const fetchCarePlanDirectives = async () => {
      try {
        setLoadingCPD(true);
        const response = await fetch(`/api/users/${userId}/care-plan-directives/active`);

        if (!response.ok) {
          throw new Error('Failed to fetch care plan directives');
        }

        const data = await response.json();

        // Find the exercise or wellness directive
        const ewDirective = data.find((directive: any) => 
          directive.category.toLowerCase() === 'exercise' || 
          directive.category.toLowerCase() === 'wellness' ||
          directive.category.toLowerCase() === 'physical activity'
        );

        if (ewDirective) {
          setCarePlanDirective(ewDirective.directive);
        } else {
          setCarePlanDirective('Your doctor has not yet provided any Exercise & Wellness care plan directives. Please check back later.');
        }
      } catch (error) {
        console.error('Error fetching care plan directives:', error);
        toast({
          title: "Error",
          description: "Failed to load care plan directives",
          variant: "destructive"
        });
        setCarePlanDirective('Could not load Exercise & Wellness care plan directives. Please try again later.');
      } finally {
        setLoadingCPD(false);
      }
    };

    fetchCarePlanDirectives();
  }, [userId, toast]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Inspiration Machine E&W</h1>

      {/* Doctor's CPD for Exercise & Wellness */}
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
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Doctor's recommendations:</p>
            <p className="whitespace-pre-line">{carePlanDirective}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Exercise & Wellness Videos</CardTitle>
          <CardDescription>
            Guided exercises and wellness activities that match your physical abilities and your Doctor's Care Plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="exercise" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="exercise">
                <Activity className="h-4 w-4 mr-2" />
                Exercise
              </TabsTrigger>
              <TabsTrigger value="wellness">
                <Brain className="h-4 w-4 mr-2" />
                Wellness
              </TabsTrigger>
            </TabsList>

            <TabsContent value="exercise" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="intensity">Intensity Level</Label>
                  <Select onValueChange={setIntensity}>
                    <SelectTrigger id="intensity">
                      <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Impact</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">Higher Intensity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Select onValueChange={setDuration}>
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (5-15 min)</SelectItem>
                      <SelectItem value="medium">Medium (15-30 min)</SelectItem>
                      <SelectItem value="long">Longer (30+ min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {['Seated Exercises', 'Walking', 'Water Exercises', 'Strength Training', 'Balance', 'Cardio Training', 'Stretch', 'Yoga'].map((tag) => (
                  <Badge 
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="wellness" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wellness-type">Wellness Type</Label>
                  <Select onValueChange={setWellnessType}>
                    <SelectTrigger id="wellness-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meditation">Meditation</SelectItem>
                      <SelectItem value="breathing">Breathing Exercises</SelectItem>
                      <SelectItem value="mindfulness">Mindfulness</SelectItem>
                      <SelectItem value="sleep">Sleep Support</SelectItem>
                      <SelectItem value="relaxation">Relaxation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wellness-duration">Duration</Label>
                  <Select onValueChange={setDuration}>
                    <SelectTrigger id="wellness-duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (5-10 min)</SelectItem>
                      <SelectItem value="medium">Medium (10-20 min)</SelectItem>
                      <SelectItem value="long">Longer (20+ min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {['Stress Relief', 'Anxiety', 'Sleep Aid', 'Mood Improvement', 'Pain Management'].map((tag) => (
                  <Badge 
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <Button 
              onClick={handleSearch}
              className="bg-primary text-white hover:bg-primary/90 w-full md:w-auto mt-4"
            >
              <Search className="h-4 w-4 mr-2" />
              Inspiration Search
            </Button>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videoSearchMutation.isPending ? (
          <div className="col-span-2 flex flex-col items-center justify-center p-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg">Searching for {activeTab} videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center p-12 text-center">
            <p className="text-lg mb-4">No videos found. Select your preferences and click "Inspiration Search".</p>
            <Button onClick={handleSearch} className="bg-primary text-white hover:bg-primary/90">
              <Search className="h-4 w-4 mr-2" />
              Inspiration Search
            </Button>
          </div>
        ) : (
          <>
            {videos.map((video: VideoResult, index: number) => (
              <Card key={video.videoId || index} className="overflow-hidden">
                <div className="relative">
                  <img 
                    src={getVideoThumbnail(video, index)} 
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    {video.duration}
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge className={`${video.intensity === 'low' ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                      {video.intensity === 'low' ? 'Low Impact' : 'Moderate Impact'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">{video.title}</h3>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-gray-500 text-sm">YouTube</p>
                    <div className="flex gap-1">
                      {video.category && (
                        <Badge variant="secondary" className="text-xs">
                          {video.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* AI Analysis Details */}
                  {video.fitnessAnalysis && (
                    <div className="border border-muted rounded-md p-3 mb-3 bg-muted/20">
                      <div className="text-sm font-medium mb-2">AI Analysis</div>
                      <div className="space-y-2 text-sm">
                        {video.category === 'exercise' ? (
                          <>
                            {video.fitnessAnalysis.difficultyLevel && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Difficulty:</span>
                                <span className="font-medium">{video.fitnessAnalysis.difficultyLevel}</span>
                              </div>
                            )}
                            {video.fitnessAnalysis.caloriesBurn && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Est. Calories:</span>
                                <span className="font-medium">{video.fitnessAnalysis.caloriesBurn} cal/30min</span>
                              </div>
                            )}
                            {video.fitnessAnalysis.targetMuscleGroups && video.fitnessAnalysis.targetMuscleGroups.length > 0 && (
                              <div>
                                <span className="text-muted-foreground">Targets:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {video.fitnessAnalysis.targetMuscleGroups.slice(0, 3).map((muscle, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{muscle}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {video.fitnessAnalysis.equipment && video.fitnessAnalysis.equipment.length > 0 && (
                              <div>
                                <span className="text-muted-foreground">Equipment:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {video.fitnessAnalysis.equipment.slice(0, 2).map((item, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {video.fitnessAnalysis.practiceType && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="font-medium">{video.fitnessAnalysis.practiceType}</span>
                              </div>
                            )}
                            {video.fitnessAnalysis.duration && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="font-medium">{video.fitnessAnalysis.duration} min</span>
                              </div>
                            )}
                            {video.fitnessAnalysis.benefitsFor && video.fitnessAnalysis.benefitsFor.length > 0 && (
                              <div>
                                <span className="text-muted-foreground">Benefits:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {video.fitnessAnalysis.benefitsFor.slice(0, 3).map((benefit, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{benefit}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Common for both exercise and wellness */}
                        {video.fitnessAnalysis.suitableFor && video.fitnessAnalysis.suitableFor.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Suitable for:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {video.fitnessAnalysis.suitableFor.slice(0, 2).map((person, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{person}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Precautions - Important for safety */}
                        {video.fitnessAnalysis.precautions && video.fitnessAnalysis.precautions.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1 text-red-500">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-xs font-medium">Precautions:</span>
                            </div>
                            <div className="text-xs text-red-500 mt-1">
                              {video.fitnessAnalysis.precautions.slice(0, 1).map((precaution, i) => (
                                <div key={i}>{precaution}</div>
                              ))}
                              {video.fitnessAnalysis.precautions.length > 1 && (
                                <div className="text-xs">+{video.fitnessAnalysis.precautions.length - 1} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => window.open(video.url, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Watch
                    </Button>
                    <Button 
                      variant={savedVideos.includes(video.videoId || '') ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => toggleSaveVideo(video.videoId || '')}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {savedVideos.includes(video.videoId || '') ? "Saved" : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default InspirationEW;
```

## Component 2: E&W Support Service Interface (`client/src/services/exerciseWellnessService.ts`)

```typescript
import { apiRequest } from '../lib/queryClient';

export interface ExerciseWellnessSearchFilters {
  userId?: number;
  category: 'exercise' | 'wellness';
  intensity?: 'low' | 'moderate' | 'high';
  duration?: 'short' | 'medium' | 'long';
  tags?: string[];
  useCPDs?: boolean;
  additionalContext?: {
    doctorCPD?: string;
    healthConditions?: string[];
  };
  limit?: number;
}

export interface ExerciseWellnessResult {
  id?: number;
  userId?: number;
  title: string;
  description?: string;
  content?: string;
  url: string;
  image?: string | null;
  thumbnail_url?: string;
  videoId?: string;
  source_name?: string;
  category: 'exercise' | 'wellness';
  intensity?: 'low' | 'moderate' | 'high';
  duration?: string;
  tags?: string[];
  createdAt?: string;
  fitnessAnalysis?: {
    difficultyLevel?: string;
    targetMuscleGroups?: string[];
    caloriesBurn?: number;
    suitableFor?: string[];
    equipment?: string[];
    healthBenefits?: string[];
    precautions?: string[];
    skillLevel?: string;
    intensityScore?: number;
  };
}

export interface ExerciseWellnessSearchResponse {
  videos: ExerciseWellnessResult[];
  query: string;
  answer?: string;
}

/**
 * Search for exercise and wellness videos with advanced parameters
 */
export async function searchExerciseWellnessVideos(
  filters: ExerciseWellnessSearchFilters
): Promise<ExerciseWellnessSearchResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await apiRequest<ExerciseWellnessSearchResponse>(
        'POST', 
        '/api/exercise-wellness/videos', 
        { ...filters, limit: filters.limit || 10 },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response || !response.videos) {
        console.error('Invalid response format from video search API');
        return { videos: [], query: filters.category };
      }

      // Ensure all video results have a thumbnail_url
      const videosWithThumbnails = response.videos.map(video => {
        if (!video.thumbnail_url && video.videoId) {
          video.thumbnail_url = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
        } else if (!video.thumbnail_url) {
          video.thumbnail_url = `https://placehold.co/320x180/5a67d8/ffffff?text=${encodeURIComponent(video.category + ": " + video.title.substring(0, 15))}`;
        }
        
        return video;
      });
      
      return {
        videos: videosWithThumbnails,
        query: response.query,
        answer: response.answer
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Video search request timed out');
        throw new Error('Video search request timed out. Please try again.');
      }

      throw error;
    }
  } catch (error: unknown) {
    console.error('Exercise & Wellness video search error:', error);

    let errorMessage = 'Failed to search for videos';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      if (errorObj.response?.data?.message) {
        errorMessage = errorObj.response.data.message;
      }
    }

    throw new Error(errorMessage);
  }
}

export async function saveFavoriteEwVideo(userId: number, video: ExerciseWellnessResult): Promise<any> {
  try {
    return await apiRequest('POST', `/api/users/${userId}/favorite-ew-videos`, video);
  } catch (error) {
    console.error('Save favorite E&W video error:', error);
    throw new Error('Failed to save favorite video');
  }
}

export async function getFavoriteEwVideos(userId: number): Promise<ExerciseWellnessResult[]> {
  try {
    return await apiRequest<ExerciseWellnessResult[]>('GET', `/api/users/${userId}/favorite-ew-videos`);
  } catch (error) {
    console.error('Get favorite E&W videos error:', error);
    throw new Error('Failed to retrieve favorite videos');
  }
}

export async function deleteFavoriteEwVideo(userId: number, videoId: number): Promise<void> {
  try {
    await apiRequest('DELETE', `/api/users/${userId}/favorite-ew-videos/${videoId}`);
  } catch (error) {
    console.error('Delete favorite E&W video error:', error);
    throw new Error('Failed to delete favorite video');
  }
}

export default {
  searchExerciseWellnessVideos,
  saveFavoriteEwVideo,
  getFavoriteEwVideos,
  deleteFavoriteEwVideo
};
```

## CSS Styles for E&W Components

```css
/* Add to your global CSS or component-specific styles */

/* Exercise & Wellness Card Styles */
.ew-video-card {
  @apply overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm;
  transition: all 0.2s ease-in-out;
}

.ew-video-card:hover {
  @apply shadow-md;
  transform: translateY(-2px);
}

/* Video thumbnail overlay styles */
.video-thumbnail-overlay {
  @apply absolute inset-0 flex items-center justify-center bg-black bg-opacity-30;
  transition: background-color 0.2s ease-in-out;
}

.video-thumbnail-overlay:hover {
  @apply bg-opacity-50;
}

/* Play button styles */
.play-button {
  @apply flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground;
  transition: all 0.2s ease-in-out;
}

.play-button:hover {
  @apply scale-110;
}

/* AI Analysis section styles */
.ai-analysis-section {
  @apply rounded-md border border-muted bg-muted/20 p-3;
}

.ai-analysis-header {
  @apply mb-2 text-sm font-medium;
}

.ai-analysis-row {
  @apply flex justify-between text-sm;
}

.ai-analysis-badges {
  @apply mt-1 flex flex-wrap gap-1;
}

/* Precautions warning styles */
.precautions-warning {
  @apply mt-2 text-xs text-red-500;
}

.precautions-icon {
  @apply h-3 w-3 text-red-500;
}

/* Tag selection styles */
.tag-selector {
  @apply cursor-pointer transition-colors;
}

.tag-selector:hover {
  @apply opacity-80;
}

/* Search button styles */
.inspiration-search-button {
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
  transition: background-color 0.2s ease-in-out;
}

/* Care Plan Directive card styles */
.cpd-card {
  @apply mb-6 border-l-4 border-l-primary;
}

.cpd-content {
  @apply whitespace-pre-line;
}

/* Loading states */
.loading-spinner {
  @apply h-10 w-10 animate-spin text-primary;
}

.loading-container {
  @apply col-span-2 flex flex-col items-center justify-center p-12;
}

/* Responsive grid adjustments */
@media (max-width: 768px) {
  .ew-video-grid {
    @apply grid-cols-1;
  }
  
  .ew-form-grid {
    @apply grid-cols-1;
  }
}

@media (min-width: 768px) {
  .ew-video-grid {
    @apply grid-cols-2;
  }
  
  .ew-form-grid {
    @apply grid-cols-2;
  }
}
```

## Key Integration Points

### 1. API Endpoints Required
```typescript
// Video search endpoint
POST /api/exercise-wellness/videos
{
  userId: number,
  category: 'exercise' | 'wellness',
  intensity?: string,
  duration?: string,
  tags?: string[]
}

// Care Plan Directives endpoint
GET /api/users/{userId}/care-plan-directives/active

// Favorites management
POST /api/users/{userId}/favorite-ew-videos
GET /api/users/{userId}/favorite-ew-videos
DELETE /api/users/{userId}/favorite-ew-videos/{videoId}
```

### 2. Required Dependencies
```json
{
  "@tanstack/react-query": "^5.x",
  "axios": "^1.x",
  "lucide-react": "^0.x",
  "@/components/ui/*": "shadcn/ui components",
  "@/hooks/use-toast": "Toast notification hook",
  "@/hooks/use-mobile": "Mobile detection hook"
}
```

### 3. Asset Requirements
- Fallback thumbnail images stored in `attached_assets/`
- KGC brand colors in Tailwind configuration
- Proper icon sizing and accessibility

This complete code provides the exact implementation of the Exercise & Wellness feature as it appears in the current KGC system.