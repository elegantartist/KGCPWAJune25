import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, LineChart, PieChart, Trophy, Medal, Star, Award, Play, Calendar, Eye, Heart } from "lucide-react";
import { 
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMCP } from "@/components/chatbot/ModelContextProtocol";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

const HealthSnapshots: React.FC = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [userId, setUserId] = useState<number | null>(null);
  const { recordFeatureUsage } = useMCP(userId || 1);

  // Get the current user (temporarily use patient ID 2 for demonstration with real data)
  useEffect(() => {
    const userString = localStorage.getItem('currentUser');
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        setUserId(userData.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    // For demonstration: If no user data, use patient ID 2 which has real daily scores
    if (!userString) {
      setUserId(2);
    }
  }, []);

  // Record feature usage
  useEffect(() => {
    if (userId) {
      recordFeatureUsage('health-snapshots');
      console.log('Recorded Health Snapshots feature usage');
    }
  }, [userId, recordFeatureUsage]);

  // Get daily self-scores data from API (patientScores table - official daily submissions)
  const { data: dailyScoresData, isLoading: scoresLoading } = useQuery({
    queryKey: ['/api/patient-scores', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const response = await fetch(`/api/users/${userId}/patient-scores`);
        if (!response.ok) {
          throw new Error(`Failed to fetch patient scores: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching patient scores:', error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // Get achievement badges data from Progress Milestones
  const { data: achievementBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ['/api/achievement-badges', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const response = await fetch(`/api/users/${userId}/achievement-badges`);
        if (!response.ok) {
          throw new Error(`Failed to fetch achievement badges: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching achievement badges:', error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // Get favorite videos data from content interactions
  const { data: favoriteVideos, isLoading: videosLoading } = useQuery({
    queryKey: ['/api/favorite-videos', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const response = await fetch(`/api/users/${userId}/favorite-videos`);
        if (!response.ok) {
          throw new Error(`Failed to fetch favorite videos: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching favorite videos:', error);
        return [];
      }
    },
    enabled: !!userId,
  });

  // Process daily scores data for chart visualization
  const processedDailyScores = React.useMemo(() => {
    if (!dailyScoresData || dailyScoresData.length === 0) return [];
    
    return dailyScoresData.map((score: any) => ({
      date: new Date(score.scoreDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
      fullDate: score.scoreDate,
      diet: score.dietScore || 0,
      exercise: score.exerciseScore || 0,
      medication: score.medicationScore || 0,
      overall: Math.round(((score.dietScore || 0) + (score.exerciseScore || 0) + (score.medicationScore || 0)) / 3)
    })).sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [dailyScoresData]);

  // Calculate achievement badge statistics
  const badgeStats = React.useMemo(() => {
    if (!achievementBadges || achievementBadges.length === 0) {
      return { total: 0, bronze: 0, silver: 0, gold: 0, platinum: 0 };
    }
    
    const stats = achievementBadges.reduce((acc: any, badge: any) => {
      acc.total++;
      const level = badge.level?.toLowerCase() || 'bronze';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, { total: 0, bronze: 0, silver: 0, gold: 0, platinum: 0 });
    
    return stats;
  }, [achievementBadges]);

  // Process favorite videos data
  const processedFavoriteVideos = React.useMemo(() => {
    if (!favoriteVideos || favoriteVideos.length === 0) return [];
    
    return favoriteVideos
      .filter((video: any) => video.contentType === 'inspiration_d' || video.contentType === 'inspiration_ew')
      .map((video: any) => ({
        id: video.id,
        title: video.contentTitle,
        type: video.contentType === 'inspiration_d' ? 'Inspiration Machine D' : 'Inspiration Machine E&W',
        savedDate: new Date(video.savedDate).toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        viewCount: video.viewCount || 0,
        lastViewed: video.lastViewedDate ? new Date(video.lastViewedDate).toLocaleDateString('en-AU', { 
          month: 'short', 
          day: 'numeric' 
        }) : 'Never'
      }))
      .sort((a: any, b: any) => new Date(b.savedDate).getTime() - new Date(a.savedDate).getTime());
  }, [favoriteVideos]);

  const COLORS = ['#2E8BC0', '#4CAF50', '#FF9800', '#9C27B0'];
  const isLoading = scoresLoading || badgesLoading || videosLoading;

  return (
    <div className="space-y-6">
      <Card className="bg-[#fdfdfd] border-[#2E8BC0]/20">
        <CardHeader>
          <CardTitle className="text-[#676767] flex items-center">
            <BarChart className="w-6 h-6 text-[#2E8BC0] mr-2" />
            <span>Health Snapshots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-[#2E8BC0] border-t-transparent rounded-full mb-4"></div>
              <p className="text-[#676767]">Loading your health data...</p>
            </div>
          ) : (
          <Tabs defaultValue="progress" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="progress" className="text-[#676767]">Progress Overview</TabsTrigger>
              <TabsTrigger value="badges" className="text-[#676767]">Achievement Badges</TabsTrigger>
              <TabsTrigger value="videos" className="text-[#676767]">Favorite Videos</TabsTrigger>
            </TabsList>

            <TabsContent value="progress">
              <Card className="border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] text-lg">Daily Self-Scores Progress</CardTitle>
                  <p className="text-sm text-[#676767]/70">
                    {processedDailyScores.length > 0 ? 
                      `Tracking ${processedDailyScores.length} daily submissions since you began using the app` :
                      'No daily scores recorded yet'
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  {processedDailyScores.length > 0 ? (
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                          data={processedDailyScores}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e5e9" />
                          <XAxis dataKey="date" stroke="#676767" fontSize={12} />
                          <YAxis domain={[0, 10]} stroke="#676767" />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="diet" 
                            name="Diet Score"
                            stroke="#2E8BC0" 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="exercise" 
                            name="Exercise Score"
                            stroke="#4CAF50" 
                            strokeWidth={3} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="medication" 
                            name="Medication Score"
                            stroke="#FF9800" 
                            strokeWidth={3} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="overall" 
                            name="Overall Score"
                            stroke="#9C27B0" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <LineChart className="w-16 h-16 text-[#2E8BC0]/30 mb-4" />
                      <p className="text-[#676767] text-center">No daily self-scores recorded yet.<br />Start tracking your health progress with daily submissions.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges">
              <Card className="border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] text-lg">Achievement Badges</CardTitle>
                  <p className="text-sm text-[#676767]/70">
                    {badgeStats.total > 0 ? 
                      `Earned ${badgeStats.total} badge${badgeStats.total !== 1 ? 's' : ''} from Progress Milestones` :
                      'No achievement badges earned yet'
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  {achievementBadges && achievementBadges.length > 0 ? (
                    <div className="space-y-4">
                      {/* Badge Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                          <Trophy className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                          <div className="font-semibold text-amber-800">{badgeStats.bronze}</div>
                          <div className="text-xs text-amber-600">Bronze</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                          <Medal className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <div className="font-semibold text-gray-800">{badgeStats.silver}</div>
                          <div className="text-xs text-gray-600">Silver</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                          <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                          <div className="font-semibold text-yellow-800">{badgeStats.gold}</div>
                          <div className="text-xs text-yellow-600">Gold</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                          <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <div className="font-semibold text-purple-800">{badgeStats.platinum}</div>
                          <div className="text-xs text-purple-600">Platinum</div>
                        </div>
                      </div>

                      {/* Badge List */}
                      <div className="space-y-3">
                        {achievementBadges.map((badge: any) => (
                          <div key={badge.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-[#2E8BC0]/20 hover:border-[#2E8BC0]/40 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                badge.level === 'platinum' ? 'bg-purple-100 text-purple-600' :
                                badge.level === 'gold' ? 'bg-yellow-100 text-yellow-600' :
                                badge.level === 'silver' ? 'bg-gray-100 text-gray-600' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                                {badge.level === 'platinum' ? <Award className="w-6 h-6" /> :
                                 badge.level === 'gold' ? <Star className="w-6 h-6" /> :
                                 badge.level === 'silver' ? <Medal className="w-6 h-6" /> :
                                 <Trophy className="w-6 h-6" />}
                              </div>
                              <div>
                                <h4 className="font-medium text-[#676767]">{badge.title}</h4>
                                <p className="text-sm text-[#676767]/70">{badge.description}</p>
                                <div className="flex items-center mt-1 space-x-2">
                                  <Badge variant="outline" className={`text-xs ${
                                    badge.level === 'platinum' ? 'border-purple-300 text-purple-700' :
                                    badge.level === 'gold' ? 'border-yellow-300 text-yellow-700' :
                                    badge.level === 'silver' ? 'border-gray-300 text-gray-700' :
                                    'border-amber-300 text-amber-700'
                                  }`}>
                                    {badge.level?.toUpperCase()}
                                  </Badge>
                                  <span className="text-xs text-[#676767]/50">
                                    <Calendar className="w-3 h-3 inline mr-1" />
                                    {new Date(badge.earnedDate).toLocaleDateString('en-AU')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-[#2E8BC0]">{badge.progress}%</div>
                              <div className="text-xs text-[#676767]/70">Complete</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Trophy className="w-16 h-16 text-[#2E8BC0]/30 mb-4" />
                      <p className="text-[#676767] text-center">No achievement badges earned yet.<br />Complete milestones in Progress Milestones to earn badges.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos">
              <Card className="border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] text-lg">Favorite Videos</CardTitle>
                  <p className="text-sm text-[#676767]/70">
                    {processedFavoriteVideos.length > 0 ? 
                      `Saved ${processedFavoriteVideos.length} video${processedFavoriteVideos.length !== 1 ? 's' : ''} from Inspiration Machine D and E&W` :
                      'No favorite videos saved yet'
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  {processedFavoriteVideos.length > 0 ? (
                    <div className="space-y-4">
                      {processedFavoriteVideos.map((video: any) => (
                        <div key={video.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-[#2E8BC0]/20 hover:border-[#2E8BC0]/40 transition-colors">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-12 h-12 bg-[#2E8BC0]/10 rounded-lg flex items-center justify-center">
                              <Play className="w-6 h-6 text-[#2E8BC0]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-[#676767] truncate">{video.title}</h4>
                              <div className="flex items-center space-x-4 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {video.type}
                                </Badge>
                                <span className="text-xs text-[#676767]/70 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Saved: {video.savedDate}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-[#676767]">
                            <div className="text-center">
                              <div className="flex items-center justify-center">
                                <Eye className="w-4 h-4 mr-1 text-[#2E8BC0]" />
                                <span className="font-medium">{video.viewCount}</span>
                              </div>
                              <div className="text-xs text-[#676767]/70">views</div>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center">
                                <Heart className="w-4 h-4 mr-1 text-red-500" />
                                <span className="text-xs">{video.lastViewed}</span>
                              </div>
                              <div className="text-xs text-[#676767]/70">last viewed</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Play className="w-16 h-16 text-[#2E8BC0]/30 mb-4" />
                      <p className="text-[#676767] text-center">No favorite videos saved yet.<br />Save videos from Inspiration Machine D and E&W to see them here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthSnapshots;