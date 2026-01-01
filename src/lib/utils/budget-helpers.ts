import { PrismaClient } from "@prisma/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, addMonths, addYears } from "date-fns";

type BudgetPeriod = "WEEKLY" | "MONTHLY" | "YEARLY";
type BudgetStatus = "ON_TRACK" | "WARNING" | "OVER_BUDGET";

/**
 * Calculate actual spending for a budget period
 */
export async function calculateActualSpending(
  userId: string,
  categoryId: string,
  startDate: Date,
  endDate: Date,
  prisma: PrismaClient
): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      categoryId,
      type: "EXPENSE",
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
    },
  });

  const total = transactions.reduce(
    (sum: number, t: { amount: any }) => sum + parseFloat(t.amount.toString()),
    0
  );

  return total;
}

/**
 * Determine budget status based on percentage used
 */
export function getBudgetStatus(
  actual: number,
  budgeted: number
): BudgetStatus {
  const percentUsed = (actual / budgeted) * 100;

  if (percentUsed < 75) {
    return "ON_TRACK";
  } else if (percentUsed < 100) {
    return "WARNING";
  } else {
    return "OVER_BUDGET";
  }
}

/**
 * Get current period dates based on budget period type
 */
export function getCurrentPeriodDates(
  period: BudgetPeriod,
  startDate: Date
): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case "WEEKLY": {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return { start: weekStart, end: weekEnd };
    }
    case "MONTHLY": {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      return { start: monthStart, end: monthEnd };
    }
    case "YEARLY": {
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);
      return { start: yearStart, end: yearEnd };
    }
    default:
      throw new Error(`Invalid period: ${period}`);
  }
}

/**
 * Calculate percentage used
 */
export function calculatePercentUsed(
  actual: number,
  budgeted: number
): number {
  if (budgeted === 0) return 0;
  return Math.round((actual / budgeted) * 100);
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: BudgetStatus): string {
  switch (status) {
    case "ON_TRACK":
      return "text-green-600";
    case "WARNING":
      return "text-yellow-600";
    case "OVER_BUDGET":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

/**
 * Get progress bar color (hex value for inline styles)
 */
export function getProgressBarColor(status: BudgetStatus): string {
  switch (status) {
    case "ON_TRACK":
      return "#10b981"; // green-500
    case "WARNING":
      return "#eab308"; // yellow-500
    case "OVER_BUDGET":
      return "#ef4444"; // red-500
    default:
      return "#6b7280"; // gray-500
  }
}

/**
 * Get next period start date
 */
export function getNextPeriodStart(
  period: BudgetPeriod,
  currentStart: Date
): Date {
  switch (period) {
    case "WEEKLY":
      return addWeeks(currentStart, 1);
    case "MONTHLY":
      return addMonths(currentStart, 1);
    case "YEARLY":
      return addYears(currentStart, 1);
    default:
      throw new Error(`Invalid period: ${period}`);
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
