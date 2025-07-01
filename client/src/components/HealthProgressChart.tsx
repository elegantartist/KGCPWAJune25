import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import React from "react";
import { format } from 'date-fns';

/**
 * Represents a single health metric record from the API.
 * This interface matches the data returned from the `/api/patients/me/health-metrics/history` endpoint.
 */
interface HealthMetric {
  date: string; // ISO date string from the database
  dietScore: number;
  exerciseScore: number;
  medicationScore: number;
}

interface HealthProgressChartProps {
  metrics: HealthMetric[];
}

const lineColors = {
  Diet: "#E53935",       // A reddish color
  Exercise: "#2E8BC0",    // A blue color
  Medication: "#4CAF50",  // A green color
};

export const HealthProgressChart: React.FC<HealthProgressChartProps> = ({ metrics }) => {
  // Sort metrics by date ascending to ensure the chart displays correctly,
  // regardless of the order they arrive from the API.
  const chartData = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((metric) => ({
    // Format date as 'Month/Day' for a clean and consistent X-axis.
    date: format(new Date(metric.date), 'MM/dd'),
    Diet: metric.dietScore,
    Exercise: metric.exerciseScore,
    Medication: metric.medicationScore,
  }));

  return (
    <div className="mb-6 bg-white p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-2">Weekly Health Progress</h2>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[1, 10]} />
            <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ccc' }} />
            <Legend />
            <Line type="monotone" dataKey="Diet" stroke={lineColors.Diet} strokeWidth={2} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="Exercise" stroke={lineColors.Exercise} strokeWidth={2} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="Medication" stroke={lineColors.Medication} strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};