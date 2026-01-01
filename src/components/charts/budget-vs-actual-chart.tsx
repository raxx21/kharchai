"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComparisonData {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budgeted: number;
  actual: number;
  difference: number;
  percentUsed: number;
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET";
}

interface Totals {
  totalBudgeted: number;
  totalActual: number;
  totalDifference: number;
}

export function BudgetVsActualChart() {
  const [data, setData] = useState<ComparisonData[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [period, setPeriod] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/budget-vs-actual?period=${period}`);
      const result = await response.json();

      setData(result.comparisons || []);
      setTotals(result.totals || null);
    } catch (error) {
      console.error("Failed to fetch budget comparison:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <p className="text-sm text-muted-foreground">Current period</p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Budget vs Actual</CardTitle>
              <p className="text-sm text-muted-foreground">Current period</p>
            </div>
            <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>No budgets found for this period</p>
              <p className="text-xs mt-2">Create some budgets to see the comparison</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for Recharts
  const chartData = data.map((item) => ({
    category: item.categoryName,
    icon: item.categoryIcon,
    budgeted: item.budgeted,
    actual: item.actual,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const budgeted = payload[0].value;
      const actual = payload[1]?.value || 0;
      const diff = budgeted - actual;
      const percentUsed = budgeted > 0 ? (actual / budgeted) * 100 : 0;

      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{data.icon}</span>
            <p className="font-semibold">{data.category}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-green-600">
              Budgeted: ₹{budgeted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-red-600">
              Actual: ₹{actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className={diff >= 0 ? "text-green-600" : "text-red-600"}>
              {diff >= 0 ? "Remaining" : "Over"}: ₹
              {Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-muted-foreground">Used: {percentUsed.toFixed(1)}%</p>
          </div>
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
            <CardTitle>Budget vs Actual</CardTitle>
            <p className="text-sm text-muted-foreground">
              {period.charAt(0) + period.slice(1).toLowerCase()} comparison
            </p>
          </div>
          <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11 }}
              stroke="#888888"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#888888"
              tickFormatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="rect"
            />
            <Bar dataKey="budgeted" fill="#10B981" name="Budgeted" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#EF4444" name="Actual Spent" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {totals && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total Budgeted</p>
              <p className="font-semibold text-green-600">
                ₹{totals.totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="font-semibold text-red-600">
                ₹{totals.totalActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Difference</p>
              <p
                className={`font-semibold ${
                  totals.totalDifference >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totals.totalDifference >= 0 ? "+" : "-"}₹
                {Math.abs(totals.totalDifference).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
