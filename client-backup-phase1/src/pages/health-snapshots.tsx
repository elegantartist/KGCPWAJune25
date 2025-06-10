import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart } from "lucide-react";
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
  // Get current authenticated user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['/api/user/current-context'],
    retry: false
  });

  const userId = currentUser?.id;
  const { recordFeatureUsage } = useMCP(userId);

  // Record feature usage
  useEffect(() => {
    if (userId) {
      recordFeatureUsage('health-snapshots');
      console.log('Recorded Health Snapshots feature usage');
    }
  }, [userId, recordFeatureUsage]);

  // Get health metrics data from API
  const { data: healthMetricsData, isLoading } = useQuery({
    queryKey: ['/api/health-metrics', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const response = await fetch(`/api/users/${userId}/health-metrics`);
        if (!response.ok) {
          throw new Error(`Failed to fetch health metrics: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching health metrics:', error);
        toast({
          title: "Error",
          description: "Could not load health metrics.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!userId,
  });

  // Use only authentic patient data from the API
  const healthProgressData = healthMetricsData?.healthProgressData || [];

  const weeklyScoreData = healthMetricsData?.weeklyScoreData || [];

  const activityDistributionData = healthMetricsData?.activityDistributionData || [];

  const COLORS = ['#2E8BC0', '#2E8BC0', '#ff6b6b', '#a4a4a4'];

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
              <TabsTrigger value="weekly" className="text-[#676767]">Weekly Scores</TabsTrigger>
              <TabsTrigger value="activities" className="text-[#676767]">Activity Distribution</TabsTrigger>
            </TabsList>

            <TabsContent value="progress">
              <Card className="border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] text-lg">Health Progress Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={healthProgressData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2E8BC0" />
                        <XAxis dataKey="name" stroke="#676767" />
                        <YAxis stroke="#676767" />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="mealPlan" 
                          name="Diet"
                          stroke="#2E8BC0" 
                          strokeWidth={2} 
                          activeDot={{ r: 8 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="exercise" 
                          name="Exercise"
                          stroke="#2E8BC0" 
                          strokeWidth={2} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="medication" 
                          name="Medication"
                          stroke="#ff6b6b" 
                          strokeWidth={2} 
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly">
              <Card className="border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] text-lg">Weekly Health Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={weeklyScoreData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2E8BC0" />
                        <XAxis dataKey="name" stroke="#676767" />
                        <YAxis domain={[0, 10]} stroke="#676767" />
                        <Tooltip />
                        <Bar 
                          dataKey="score" 
                          name="Daily Score" 
                          fill="#2E8BC0" 
                          radius={[4, 4, 0, 0]}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <Card className="border-[#2E8BC0]/20">
                <CardHeader>
                  <CardTitle className="text-[#676767] text-lg">Activity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={activityDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {activityDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
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