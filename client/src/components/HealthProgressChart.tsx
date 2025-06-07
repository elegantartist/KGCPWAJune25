import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import React from "react";

// Type: HealthMetric
interface HealthMetric {
  createdAt: string; // ISO date
  diet: number;
  exercise: number;
  medication: number;
}

interface HealthProgressChartProps {
  metrics: HealthMetric[];
}

export const HealthProgressChart: React.FC<HealthProgressChartProps> = ({ metrics }) => {
  const chartData = [...metrics].reverse().map((metric) => ({
    date: new Date(metric.createdAt).toLocaleDateString(),
    Diet: metric.diet,
    Exercise: metric.exercise,
    Medication: metric.medication,
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
            <Tooltip />
            <Line type="monotone" dataKey="Diet" stroke="#E53935" />
            <Line type="monotone" dataKey="Exercise" stroke="#2E8BC0" />
            <Line type="monotone" dataKey="Medication" stroke="#4CAF50" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};