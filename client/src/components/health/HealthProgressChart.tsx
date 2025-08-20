import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HealthMetric } from "@shared/schema";
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
} from "recharts";

interface HealthProgressChartProps {
  metrics: HealthMetric[];
}

const HealthProgressChart: React.FC<HealthProgressChartProps> = ({ metrics }) => {
  const isMobile = useIsMobile();
  
  const formatDate = (date: Date) => {
    return format(new Date(date), isMobile ? "MM-dd" : "yyyy-MM-dd");
  };

  // Format the data for Recharts
  const chartData = metrics.map((metric) => ({
    date: formatDate(metric.date),
    healthyMealPlan: metric.dietScore,
    exerciseWellness: metric.exerciseScore,
    prescriptionMed: metric.medicationScore,
  })).reverse(); // Reverse to show oldest to newest (left to right)

  // Get latest metrics
  const latestMetrics = metrics[0];

  return (
    <Card className="mb-6">
      <CardContent className={cn("p-6", isMobile && "p-4")}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Weekly Health Progress</h2>
        
        {/* Health Progress Chart */}
        <div className="mb-6">
          <div className={cn(
            "w-full relative", 
            isMobile ? "h-56" : "h-64"
          )}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={isMobile 
                  ? { top: 5, right: 5, left: 5, bottom: 5 } 
                  : { top: 5, right: 30, left: 20, bottom: 5 }
                }
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  reversed={true}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                />
                <YAxis 
                  domain={[3, 10]} 
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  width={isMobile ? 25 : 35}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    color: '#333',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: isMobile ? 8 : 12,
                    fontSize: isMobile ? 12 : 14,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="healthyMealPlan"
                  stroke="#4CAF50"
                  activeDot={{ r: isMobile ? 6 : 8 }}
                  strokeWidth={2}
                  dot={{ r: isMobile ? 3 : 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="exerciseWellness"
                  stroke="#2E8BC0"
                  activeDot={{ r: isMobile ? 6 : 8 }}
                  strokeWidth={2}
                  dot={{ r: isMobile ? 3 : 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="prescriptionMed"
                  stroke="#E53935"
                  activeDot={{ r: isMobile ? 6 : 8 }}
                  strokeWidth={2}
                  dot={{ r: isMobile ? 3 : 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Metric value boxes - repositioned for mobile */}
            <div className={cn(
              "absolute p-1 bg-white border border-gray-200 rounded shadow-sm text-xs border-l-[3px]",
              isMobile ? "top-1 right-1 left-auto" : "top-4 left-14"
            )}
            style={{ borderLeftColor: "#4CAF50" }}>
              Meal:{latestMetrics?.dietScore}
            </div>
            <div className={cn(
              "absolute p-1 bg-white border border-gray-200 rounded shadow-sm text-xs border-l-[3px]",
              isMobile ? "top-8 right-1 left-auto" : "top-16 left-14"
            )}
            style={{ borderLeftColor: "#2E8BC0" }}>
              Exercise:{latestMetrics?.exerciseScore}
            </div>
            <div className={cn(
              "absolute p-1 bg-white border border-gray-200 rounded shadow-sm text-xs border-l-[3px]",
              isMobile ? "top-15 right-1 left-auto" : "top-28 left-14"
            )}
            style={{ borderLeftColor: "#E53935" }}>
              Medication:{latestMetrics?.medicationScore}
            </div>
          </div>
          
          {/* Chart Legend */}
          <div className={cn(
            "flex justify-center mt-4", 
            isMobile ? "gap-3" : "gap-6"
          )}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#4CAF50" }}></span>
              <span className="text-sm text-gray-600">Healthy Meal Plan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#2E8BC0" }}></span>
              <span className="text-sm text-gray-600">Exercise and Wellness</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#E53935" }}></span>
              <span className="text-sm text-gray-600">Prescription Medication</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthProgressChart;
