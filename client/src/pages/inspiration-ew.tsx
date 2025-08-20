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
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/auth-context";
import { useCPD } from "@/hooks/useCPD";
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
  summary?: string;
  tags?: string[];
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

// Using unified CPD interface from useCPD hook

// Import images for fallback thumbnails
import foodImage1 from "@assets/KGCLady3_1746596042812.jpeg";
import foodImage2 from "@assets/KGCLady4_1746595967200.jpeg";
import foodImage3 from "@assets/image_1744127300035.jpeg";

// Use these images as fallback video thumbnails
const imageAssets = [foodImage1, foodImage2, foodImage3];

const InspirationEW: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("exercise");
  const [intensity, setIntensity] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [wellnessType, setWellnessType] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);

  const { toast } = useToast();
  const isMobile = useIsMobile();
  // For now, use hardcoded user ID since this is a demo without full authentication
  // const { user, isAuthenticated } = useAuth();
  // const userId = user?.id;
  
  // Use hardcoded user ID for demo purposes
  const userId = 2; // Patient Reuben Collins
  const isAuthenticated = true;

  // Use unified CPD hook
  const {
    carePlanDirectives,
    loadingCPD,
    getExerciseDirective,
    exercisePlan,
    hasExerciseDirective
  } = useCPD(userId);

  // Query for saved videos - temporarily disabled due to database issue
  const savedVideos: VideoResult[] = [];
  const refetchSavedVideos = () => {};
  // const { data: savedVideos = [], refetch: refetchSavedVideos } = useQuery({
  //   queryKey: ['/api/users', userId, 'favorite-videos', 'exercise-wellness'],
  //   enabled: !!userId,
  //   retry: false,
  // });

  // Setup mutation for searching videos with real user data
  const videoSearchMutation = useMutation<VideoSearchResponse, Error, any>({
    mutationFn: async (searchData) => {
      if (!userId) throw new Error('User must be authenticated');
      
      // Use the proper exercise-wellness video endpoint with CPD integration
      const response = await apiRequest('POST', '/api/exercise-wellness/videos', {
        userId,
        category: activeTab, // 'exercise' or 'wellness'
        intensity: searchData.intensity || 'moderate',
        duration: searchData.duration || '30min',
        tags: searchData.tags || [],
        useCPDs: true, // Enable CPD integration for doctor's directive alignment
        additionalContext: {
          exerciseCPD: displayedExercisePlan
        }
      });
      return response;
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

  // Mutation for saving/removing favorite videos
  const saveFavoriteMutation = useMutation({
    mutationFn: async ({ video, action }: { video: VideoResult; action: 'save' | 'remove' }) => {
      if (!userId) throw new Error('User must be authenticated');
      
      if (action === 'save') {
        return apiRequest('POST', `/api/users/${userId}/favorite-videos/exercise-wellness`, {
          videoId: video.videoId || '',
          title: video.title,
          url: video.url,
          description: video.summary || '',
          thumbnail: video.image || '',
          tags: [activeTab, ...(video.tags || [])]
        });
      } else {
        return apiRequest('DELETE', `/api/users/${userId}/favorite-videos/exercise-wellness/${video.videoId || ''}`);
      }
    },
    onSuccess: (_, { action }) => {
      refetchSavedVideos();
      toast({
        title: action === 'save' ? "Video saved" : "Video removed",
        description: action === 'save' ? "Video added to your favorites" : "Video removed from favorites",
      });
    },
    onError: (error) => {
      console.error('Error updating favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle search button click with real user data
  const handleSearch = () => {
    if (!isAuthenticated || !userId) {
      toast({
        title: "Authentication required",
        description: "Please log in to search for videos.",
        variant: "destructive"
      });
      return;
    }

    const searchParams = {
      category: activeTab,
      intensity: activeTab === "exercise" ? intensity : undefined,
      duration: duration || wellnessType,
      tags: selectedTags,
      useCPDs: true, // Use Care Plan Directives for personalized results
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

  // Toggle saving a video with real database integration
  const toggleSaveVideo = (video: VideoResult) => {
    if (!isAuthenticated || !userId) {
      toast({
        title: "Authentication required",
        description: "Please log in to save videos.",
        variant: "destructive"
      });
      return;
    }

    const isSaved = savedVideos.some((savedVideo: any) => 
      savedVideo.url === video.url || savedVideo.videoId === video.videoId
    );
    const action = isSaved ? 'remove' : 'save';
    
    saveFavoriteMutation.mutate({ video, action });
  };

  // Get thumbnail image - use the image URL if available, otherwise use fallback
  const getVideoThumbnail = (video: VideoResult, index: number) => {
    return video.image || imageAssets[index % imageAssets.length];
  };

  // Use the exercise plan from unified CPD hook (remove debug logs for production)
  const displayedExercisePlan = exercisePlan;

  // Show authentication required message if user is not logged in
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access Exercise & Wellness videos and personalized recommendations.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <p className="whitespace-pre-line">{displayedExercisePlan}</p>
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
                      variant={savedVideos.some((savedVideo: any) => 
                        savedVideo.url === video.url || savedVideo.videoId === video.videoId
                      ) ? "default" : "ghost"} 
                      size="sm"
                      onClick={() => toggleSaveVideo(video)}
                      disabled={saveFavoriteMutation.isPending}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {savedVideos.some((savedVideo: any) => 
                        savedVideo.url === video.url || savedVideo.videoId === video.videoId
                      ) ? "Saved" : "Save"}
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