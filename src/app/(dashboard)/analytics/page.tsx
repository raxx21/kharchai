"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpendingByCategoryChart } from "@/components/charts/spending-by-category-chart";
import { SpendingTrendChart } from "@/components/charts/spending-trend-chart";
import { BudgetVsActualChart } from "@/components/charts/budget-vs-actual-chart";
import { Badge } from "@/components/ui/badge";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { TrendingUp, TrendingDown, Calendar, Download, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

type TimePeriod = "7days" | "30days" | "3months" | "6months" | "12months" | "custom";

interface AnalyticsData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  topCategories: Array<{
    categoryName: string;
    categoryIcon: string;
    totalSpent: number;
    percentage: number;
  }>;
  trends: {
    averageMonthlySpend: number;
    trend: "increasing" | "decreasing" | "stable";
  };
}

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30days");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    topCategories: [],
    trends: {
      averageMonthlySpend: 0,
      trend: "stable",
    },
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();

    switch (timePeriod) {
      case "7days":
        startDate = subDays(endDate, 7);
        break;
      case "30days":
        startDate = subDays(endDate, 30);
        break;
      case "3months":
        startDate = subMonths(endDate, 3);
        break;
      case "6months":
        startDate = subMonths(endDate, 6);
        break;
      case "12months":
        startDate = subMonths(endDate, 12);
        break;
    }

    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      // Fetch spending data
      const spendingRes = await fetch(
        `/api/analytics/spending?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=category`
      );
      const spendingData = await spendingRes.json();

      // Fetch transactions for income calculation
      const transactionsRes = await fetch(
        `/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=10000`
      );
      const transactionsData = await transactionsRes.json();

      // Calculate income and expenses
      const totalIncome = transactionsData.transactions
        ?.filter((t: any) => t.type === "INCOME")
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

      const totalExpenses = spendingData.totalSpent || 0;
      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

      // Get top 5 categories
      const topCategories = (spendingData.data || [])
        .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      // Fetch trends
      const trendsRes = await fetch(`/api/analytics/trends?months=6`);
      const trendsData = await trendsRes.json();

      setAnalytics({
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        topCategories,
        trends: trendsData.insights || { averageMonthlySpend: 0, trend: "stable" },
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "3months":
        return "Last 3 Months";
      case "6months":
        return "Last 6 Months";
      case "12months":
        return "Last 12 Months";
      default:
        return "Custom";
    }
  };

  const getTrendIcon = () => {
    if (analytics.trends.trend === "increasing") {
      return <TrendingUp className="h-4 w-4 text-red-600" />;
    } else if (analytics.trends.trend === "decreasing") {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Detailed insights into your financial behavior
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <SelectTrigger className="w-full sm:w-[200px] text-sm sm:text-base">
              <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm w-full sm:w-auto">
            <Download className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Period Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
          {getPeriodLabel()}
        </Badge>
        <span className="text-xs sm:text-sm text-muted-foreground">
          {format(getDateRange().startDate, "MMM dd, yyyy")} - {format(getDateRange().endDate, "MMM dd, yyyy")}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Income
              <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              ₹{analytics.totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Expenses
              <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              ₹{analytics.totalExpenses.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              Net Savings
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${analytics.netSavings >= 0 ? "text-green-600" : "text-red-600"}`}>
              ₹{Math.abs(analytics.netSavings).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.netSavings >= 0 ? "Surplus" : "Deficit"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              Savings Rate
              {getTrendIcon()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${analytics.savingsRate >= 20 ? "text-green-600" : analytics.savingsRate >= 10 ? "text-yellow-600" : "text-red-600"}`}>
              {analytics.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.savingsRate >= 20 ? "Excellent" : analytics.savingsRate >= 10 ? "Good" : "Needs Improvement"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Spending Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Top Spending Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {analytics.topCategories.length === 0 ? (
              <p className="text-center text-sm sm:text-base text-muted-foreground py-6 sm:py-8">
                No spending data for this period
              </p>
            ) : (
              analytics.topCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex-shrink-0">
                      <span className="text-base sm:text-xl">{category.categoryIcon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium truncate">{category.categoryName}</p>
                      <div className="mt-1 h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-2 sm:ml-4 flex-shrink-0">
                    <p className="text-sm sm:text-base font-semibold">
                      ₹{category.totalSpent.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SpendingByCategoryChart />
        <SpendingTrendChart />
      </div>

      {/* Budget vs Actual */}
      <BudgetVsActualChart />

      {/* Insights Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Insights & Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Average Monthly Spend</p>
              <p className="text-xl sm:text-2xl font-bold">
                ₹{analytics.trends.averageMonthlySpend.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Spending Trend</p>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <p className="text-base sm:text-lg font-semibold capitalize">{analytics.trends.trend}</p>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Financial Health</p>
              <Badge variant={analytics.savingsRate >= 20 ? "default" : analytics.savingsRate >= 10 ? "secondary" : "destructive"} className="text-xs sm:text-sm">
                {analytics.savingsRate >= 20 ? "Healthy" : analytics.savingsRate >= 10 ? "Moderate" : "At Risk"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
