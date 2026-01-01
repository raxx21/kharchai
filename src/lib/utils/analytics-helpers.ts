import { startOfWeek, startOfMonth, format, parseISO } from "date-fns";

interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalSpent: number;
  transactionCount: number;
}

interface TimeSeriesData {
  period: string;
  totalSpent: number;
  categories?: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
}

interface Transaction {
  id: string;
  amount: any; // Decimal from Prisma
  transactionDate: Date;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

/**
 * Format category spending data for Recharts pie chart
 */
export function formatForPieChart(
  data: CategorySpending[]
): Array<{ name: string; value: number; color: string; icon: string }> {
  return data.map((item) => ({
    name: item.categoryName,
    value: item.totalSpent,
    color: item.categoryColor || "#8884d8",
    icon: item.categoryIcon || "📊",
  }));
}

/**
 * Format time series data for Recharts line/bar charts
 */
export function formatForTimeSeriesChart(
  data: TimeSeriesData[]
): Array<{ period: string; amount: number }> {
  return data.map((item) => ({
    period: item.period,
    amount: item.totalSpent,
  }));
}

/**
 * Group transactions by time period (day/week/month)
 */
export function groupTransactionsByPeriod(
  transactions: Transaction[],
  groupBy: "day" | "week" | "month"
): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};

  transactions.forEach((transaction) => {
    let key: string;

    switch (groupBy) {
      case "day":
        key = format(transaction.transactionDate, "yyyy-MM-dd");
        break;
      case "week":
        key = format(startOfWeek(transaction.transactionDate, { weekStartsOn: 1 }), "yyyy-'W'II");
        break;
      case "month":
        key = format(transaction.transactionDate, "yyyy-MM");
        break;
      default:
        key = format(transaction.transactionDate, "yyyy-MM-dd");
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(transaction);
  });

  return grouped;
}

/**
 * Calculate spending percentages for categories
 */
export function calculateCategoryPercentages(
  categorySpending: Map<string, number>
): Map<string, number> {
  const total = Array.from(categorySpending.values()).reduce((sum, amount) => sum + amount, 0);
  const percentages = new Map<string, number>();

  categorySpending.forEach((amount, categoryId) => {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    percentages.set(categoryId, Math.round(percentage * 10) / 10); // Round to 1 decimal
  });

  return percentages;
}

/**
 * Aggregate transactions by category
 */
export function aggregateByCategory(
  transactions: Transaction[]
): Map<string, { amount: number; count: number; category: any }> {
  const aggregated = new Map();

  transactions.forEach((transaction) => {
    const categoryId = transaction.category?.id || "uncategorized";

    if (!aggregated.has(categoryId)) {
      aggregated.set(categoryId, {
        amount: 0,
        count: 0,
        category: transaction.category,
      });
    }

    const current = aggregated.get(categoryId);
    current.amount += parseFloat(transaction.amount.toString());
    current.count += 1;
  });

  return aggregated;
}

/**
 * Calculate trend direction (INCREASING, DECREASING, STABLE)
 */
export function calculateTrendDirection(
  data: Array<{ period: string; amount: number }>
): "INCREASING" | "DECREASING" | "STABLE" {
  if (data.length < 2) return "STABLE";

  const sortedData = [...data].sort((a, b) => a.period.localeCompare(b.period));
  const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
  const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));

  const firstHalfAvg =
    firstHalf.reduce((sum, item) => sum + item.amount, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, item) => sum + item.amount, 0) / secondHalf.length;

  const percentageChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  if (percentageChange > 10) return "INCREASING";
  if (percentageChange < -10) return "DECREASING";
  return "STABLE";
}

/**
 * Format period label for display
 */
export function formatPeriodLabel(period: string, groupBy: "day" | "week" | "month"): string {
  try {
    switch (groupBy) {
      case "day":
        return format(parseISO(period), "MMM dd");
      case "week":
        // Format like "2024-W03" to "Week 3, 2024"
        const [year, week] = period.split("-W");
        return `Week ${week}, ${year}`;
      case "month":
        return format(parseISO(period + "-01"), "MMM yyyy");
      default:
        return period;
    }
  } catch {
    return period;
  }
}

/**
 * Calculate month-over-month growth
 */
export function calculateMoMGrowth(currentMonth: number, previousMonth: number): number {
  if (previousMonth === 0) return 0;
  return ((currentMonth - previousMonth) / previousMonth) * 100;
}

/**
 * Get top spending categories
 */
export function getTopCategories(
  categoryData: CategorySpending[],
  limit: number = 5
): CategorySpending[] {
  return [...categoryData]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}
