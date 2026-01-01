"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface TrendData {
  month: string;
  totalSpent: number;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
}

interface Insights {
  averageMonthlySpend: number;
  highestMonth: { month: string; amount: number } | null;
  lowestMonth: { month: string; amount: number } | null;
  trend: "INCREASING" | "DECREASING" | "STABLE";
}

export function SpendingTrendChart() {
  const [data, setData] = useState<TrendData[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/analytics/trends?months=6");
      const result = await response.json();

      setData(result.trends || []);
      setInsights(result.insights || null);
    } catch (error) {
      console.error("Failed to fetch trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Last 6 months</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Last 6 months</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>No spending data available</p>
              <p className="text-xs mt-2">Add some expenses to see trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for Recharts
  const chartData = data.map((item) => ({
    month: format(new Date(item.month + "-01"), "MMM yyyy"),
    amount: item.totalSpent,
  }));

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "INCREASING":
        return "📈";
      case "DECREASING":
        return "📉";
      case "STABLE":
        return "➡️";
      default:
        return "📊";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "INCREASING":
        return "text-red-600";
      case "DECREASING":
        return "text-green-600";
      case "STABLE":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold">{payload[0].payload.month}</p>
          <p className="text-sm text-muted-foreground">
            Total: ₹{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Spending Trend</CardTitle>
            <p className="text-sm text-muted-foreground">Last 6 months</p>
          </div>
          {insights && (
            <div className="text-right">
              <div className={`flex items-center gap-1 ${getTrendColor(insights.trend)}`}>
                <span className="text-xl">{getTrendIcon(insights.trend)}</span>
                <span className="text-sm font-semibold capitalize">
                  {insights.trend.toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: ₹{insights.averageMonthlySpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#888888"
              tickFormatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={() => "Total Spent"}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={{ fill: "#8B5CF6", r: 4 }}
              activeDot={{ r: 6 }}
              name="Total Spent"
            />
          </LineChart>
        </ResponsiveContainer>

        {insights && insights.highestMonth && insights.lowestMonth && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Highest Month</p>
              <p className="font-semibold text-sm">
                {format(new Date(insights.highestMonth.month + "-01"), "MMM yyyy")}
              </p>
              <p className="text-xs text-red-600">
                ₹{insights.highestMonth.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lowest Month</p>
              <p className="font-semibold text-sm">
                {format(new Date(insights.lowestMonth.month + "-01"), "MMM yyyy")}
              </p>
              <p className="text-xs text-green-600">
                ₹{insights.lowestMonth.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
