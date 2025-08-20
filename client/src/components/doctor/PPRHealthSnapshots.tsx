import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface PPRHealthSnapshotsProps {
  healthSnapshotsData: any;
  reportPeriod: {
    start: Date;
    end: Date;
  };
}

const PPRHealthSnapshots: React.FC<PPRHealthSnapshotsProps> = ({ 
  healthSnapshotsData, 
  reportPeriod 
}) => {
  const isMobile = useIsMobile();



  if (!healthSnapshotsData) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Health Snapshots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No health snapshots data provided.</p>
        </CardContent>
      </Card>
    );
  }

  if (!healthSnapshotsData.healthProgressData) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Health Snapshots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No health progress data available for this period.</p>
          <p className="text-sm text-gray-500 mt-2">Data structure: {JSON.stringify(Object.keys(healthSnapshotsData))}</p>
        </CardContent>
      </Card>
    );
  }

  // Map the server data structure to what the component expects
  const charts = {
    weeklyProgress: healthSnapshotsData.healthProgressData || [],
    healthDistribution: healthSnapshotsData.healthDistributionData || []
  };
  
  const summary = {
    averageScores: {
      diet: healthSnapshotsData.periodSummary?.avgDiet || 0,
      exercise: healthSnapshotsData.periodSummary?.avgExercise || 0,
      medication: healthSnapshotsData.periodSummary?.avgMedication || 0
    },
    submissionDays: healthSnapshotsData.periodSummary?.totalSubmissions || 0,
    trends: {
      diet: healthSnapshotsData.trendAnalysis?.dietTrend || 'stable',
      exercise: 'stable', // Not provided by server, using default
      medication: 'stable' // Not provided by server, using default
    },
    overallAssessment: `Patient completed ${healthSnapshotsData.periodSummary?.totalSubmissions || 0} daily score submissions during this period.`
  };

  // Color schemes for charts
  const lineColors = {
    dietScore: "#22c55e", // green
    exerciseScore: "#3b82f6", // blue  
    medicationScore: "#f59e0b" // amber
  };

  const pieColors = ["#22c55e", "#3b82f6", "#f59e0b"];

  // Format period summary data for trend indicators
  const getTrendIcon = (trend: string) => {
    if (trend?.toLowerCase().includes('increasing') || trend?.toLowerCase().includes('improving')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (trend?.toLowerCase().includes('decreasing') || trend?.toLowerCase().includes('declining')) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Health Snapshots - Visual Progress Analysis
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            Period: {format(reportPeriod.start, "MMM dd, yyyy")} - {format(reportPeriod.end, "MMM dd, yyyy")}
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Progress Line Chart */}
      {charts.weeklyProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Weekly Progress Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "w-full relative mb-4", 
              isMobile ? "h-56" : "h-80"
            )}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={charts.weeklyProgress}
                  margin={isMobile 
                    ? { top: 5, right: 5, left: 5, bottom: 5 } 
                    : { top: 20, right: 30, left: 20, bottom: 5 }
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    stroke="#64748b"
                  />
                  <YAxis 
                    domain={[1, 10]} 
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    width={isMobile ? 30 : 40}
                    stroke="#64748b"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: '#334155',
                      borderColor: '#e2e8f0',
                      borderWidth: 1,
                      borderRadius: 8,
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: isMobile ? 8 : 12,
                      fontSize: isMobile ? 12 : 14
                    }}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toFixed(1)}/10`, 
                      name === 'diet' ? 'Diet' : 
                      name === 'exercise' ? 'Exercise' : 'Medication'
                    ]}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: isMobile ? 12 : 14 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="diet" 
                    stroke={lineColors.dietScore}
                    strokeWidth={3}
                    dot={{ fill: lineColors.dietScore, strokeWidth: 2, r: 4 }}
                    name="Diet Score"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="exercise" 
                    stroke={lineColors.exerciseScore}
                    strokeWidth={3}
                    dot={{ fill: lineColors.exerciseScore, strokeWidth: 2, r: 4 }}
                    name="Exercise Score"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="medication" 
                    stroke={lineColors.medicationScore}
                    strokeWidth={3}
                    dot={{ fill: lineColors.medicationScore, strokeWidth: 2, r: 4 }}
                    name="Medication Score"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.averageScores.diet.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Avg Diet</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {summary.averageScores.exercise.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Avg Exercise</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {summary.averageScores.medication.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Avg Medication</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Distribution Pie Chart */}
      {charts.healthDistribution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Health Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "w-full relative", 
              isMobile ? "h-64" : "h-80"
            )}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.healthDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}`}
                    outerRadius={isMobile ? 80 : 120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {charts.healthDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: string) => [`${Number(value).toFixed(1)}/10`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Summary with Trends */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Period Summary & Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Metrics */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-800">Key Performance Metrics</h3>
                <div className="space-y-3">
                  {summary.averageScores && (
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Diet Score:</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {Number(summary.averageScores.diet || 0).toFixed(1)}/10
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Exercise Score:</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {Number(summary.averageScores.exercise || 0).toFixed(1)}/10
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Medication Score:</span>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {Number(summary.averageScores.medication || 0).toFixed(1)}/10
                        </Badge>
                      </div>
                    </div>
                  )}
                  {summary.submissionDays && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Days with Submissions:</span>
                      <Badge variant="outline">
                        {summary.submissionDays} days
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Trends Analysis */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-800">Trend Analysis</h3>
                <div className="space-y-3">
                  {summary.trends && (
                    <>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(summary.trends.diet)}
                        <span className="text-sm">Diet: {summary.trends.diet || 'Stable'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(summary.trends.exercise)}
                        <span className="text-sm">Exercise: {summary.trends.exercise || 'Stable'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(summary.trends.medication)}
                        <span className="text-sm">Medication: {summary.trends.medication || 'Stable'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Assessment */}
            {summary.overallAssessment && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-semibold mb-2 text-gray-800">Overall Assessment</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {summary.overallAssessment}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PPRHealthSnapshots;