import { PrismaClient } from "@prisma/client";
import { calculateActualSpending, getCurrentPeriodDates } from "@/lib/utils/budget-helpers";
import {
  generateBillReminders,
  generateOverdueBillAlerts,
  ensureUpcomingPayments,
} from "./bill-reminder-generator";

type InsightType = "SPENDING_PATTERN" | "BUDGET_ALERT" | "SAVINGS_OPPORTUNITY" | "UNUSUAL_SPENDING" | "BILL_REMINDER" | "BILL_OVERDUE";

interface GeneratedInsight {
  type: InsightType;
  title: string;
  description: string;
  data: any;
}

/**
 * Generate budget alerts when approaching or exceeding limits
 */
export async function generateBudgetAlerts(
  userId: string,
  prisma: PrismaClient
): Promise<GeneratedInsight[]> {
  const alerts: GeneratedInsight[] = [];

  // Get all active budgets
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
    include: {
      category: true,
    },
  });

  for (const budget of budgets) {
    const periodDates = getCurrentPeriodDates(
      budget.period as "WEEKLY" | "MONTHLY" | "YEARLY",
      budget.startDate
    );

    const effectiveEndDate = budget.endDate
      ? (budget.endDate < periodDates.end ? budget.endDate : periodDates.end)
      : periodDates.end;

    const actualSpent = await calculateActualSpending(
      userId,
      budget.categoryId,
      periodDates.start,
      effectiveEndDate,
      prisma
    );

    const budgetAmount = parseFloat(budget.amount.toString());
    const percentUsed = (actualSpent / budgetAmount) * 100;

    // Check if we should create an alert (avoid duplicates by checking recent alerts)
    const recentAlert = await prisma.insight.findFirst({
      where: {
        userId,
        type: "BUDGET_ALERT",
        data: {
          path: ["budgetId"],
          equals: budget.id,
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentAlert) continue; // Skip if alert already exists for today

    // Generate alerts at different thresholds
    if (percentUsed >= 100) {
      alerts.push({
        type: "BUDGET_ALERT",
        title: `🚨 ${budget.category.name} budget exceeded`,
        description: `You've exceeded your ${budget.period.toLowerCase()} budget by ₹${(actualSpent - budgetAmount).toFixed(2)}. Current spending: ₹${actualSpent.toFixed(2)} (${percentUsed.toFixed(0)}% of ₹${budgetAmount.toFixed(2)})`,
        data: {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          percentUsed: Math.round(percentUsed),
          actualSpent,
          budgetAmount,
          period: budget.period,
          severity: "critical",
        },
      });
    } else if (percentUsed >= 90) {
      alerts.push({
        type: "BUDGET_ALERT",
        title: `⚠️ ${budget.category.name} budget almost exceeded`,
        description: `Warning! You've used ${percentUsed.toFixed(0)}% of your ${budget.period.toLowerCase()} budget. Only ₹${(budgetAmount - actualSpent).toFixed(2)} remaining out of ₹${budgetAmount.toFixed(2)}.`,
        data: {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          percentUsed: Math.round(percentUsed),
          actualSpent,
          budgetAmount,
          period: budget.period,
          severity: "high",
        },
      });
    } else if (percentUsed >= 75) {
      alerts.push({
        type: "BUDGET_ALERT",
        title: `💡 ${budget.category.name} budget at ${percentUsed.toFixed(0)}%`,
        description: `You've used ₹${actualSpent.toFixed(2)} of your ₹${budgetAmount.toFixed(2)} ${budget.period.toLowerCase()} budget. You have ₹${(budgetAmount - actualSpent).toFixed(2)} remaining.`,
        data: {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          percentUsed: Math.round(percentUsed),
          actualSpent,
          budgetAmount,
          period: budget.period,
          severity: "medium",
        },
      });
    }
  }

  return alerts;
}

/**
 * Generate savings opportunities based on budget usage
 */
export async function generateSavingsOpportunities(
  userId: string,
  prisma: PrismaClient
): Promise<GeneratedInsight[]> {
  const opportunities: GeneratedInsight[] = [];

  // Get budgets with low utilization
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
    include: {
      category: true,
    },
  });

  for (const budget of budgets) {
    const periodDates = getCurrentPeriodDates(
      budget.period as "WEEKLY" | "MONTHLY" | "YEARLY",
      budget.startDate
    );

    const effectiveEndDate = budget.endDate
      ? (budget.endDate < periodDates.end ? budget.endDate : periodDates.end)
      : periodDates.end;

    const actualSpent = await calculateActualSpending(
      userId,
      budget.categoryId,
      periodDates.start,
      effectiveEndDate,
      prisma
    );

    const budgetAmount = parseFloat(budget.amount.toString());
    const percentUsed = (actualSpent / budgetAmount) * 100;

    // If consistently under 50%, suggest reducing budget
    if (percentUsed < 50 && actualSpent > 0) {
      const potentialSavings = (budgetAmount - actualSpent) * 0.5;

      opportunities.push({
        type: "SAVINGS_OPPORTUNITY",
        title: `💰 Potential savings in ${budget.category.name}`,
        description: `You're only using ${percentUsed.toFixed(0)}% of your ${budget.category.name} budget. Consider reducing it by ₹${potentialSavings.toFixed(2)} and allocating to savings or other categories.`,
        data: {
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          currentBudget: budgetAmount,
          actualSpent,
          percentUsed: Math.round(percentUsed),
          suggestedBudget: actualSpent * 1.2, // 20% buffer
          potentialSavings,
        },
      });
    }
  }

  return opportunities;
}

/**
 * Detect unusual spending patterns
 */
export async function generateUnusualSpendingAlerts(
  userId: string,
  prisma: PrismaClient
): Promise<GeneratedInsight[]> {
  const alerts: GeneratedInsight[] = [];

  // Get last 7 days of transactions
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      transactionDate: {
        gte: sevenDaysAgo,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      amount: "desc",
    },
  });

  // Check for unusually large transactions (top 3)
  const largeTransactions = recentTransactions.slice(0, 3);

  if (largeTransactions.length > 0) {
    const avgAmount = recentTransactions.reduce(
      (sum: number, t: { amount: any }) => sum + parseFloat(t.amount.toString()),
      0
    ) / recentTransactions.length;

    for (const transaction of largeTransactions) {
      const amount = parseFloat(transaction.amount.toString());

      // If transaction is 3x the average, flag it
      if (amount > avgAmount * 3) {
        alerts.push({
          type: "UNUSUAL_SPENDING",
          title: `🔍 Unusual transaction detected`,
          description: `A large ${transaction.category?.name || 'expense'} of ₹${amount.toFixed(2)} was recorded. This is significantly higher than your average spending.`,
          data: {
            transactionId: transaction.id,
            categoryId: transaction.categoryId,
            categoryName: transaction.category?.name || "Uncategorized",
            amount,
            averageAmount: avgAmount,
            description: transaction.description,
            date: transaction.transactionDate,
          },
        });
      }
    }
  }

  return alerts;
}

/**
 * Save generated insights to database
 */
export async function saveInsights(
  userId: string,
  insights: GeneratedInsight[],
  prisma: PrismaClient
): Promise<void> {
  for (const insight of insights) {
    await prisma.insight.create({
      data: {
        userId,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        data: insight.data,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  }
}

/**
 * Generate all insights for a user
 */
export async function generateAllInsights(
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  // First, ensure upcoming bill payments exist
  await ensureUpcomingPayments(userId, prisma);

  // Generate all types of insights
  const [
    budgetAlerts,
    savingsOpportunities,
    unusualSpending,
    billReminders,
    overdueBillAlerts,
  ] = await Promise.all([
    generateBudgetAlerts(userId, prisma),
    generateSavingsOpportunities(userId, prisma),
    generateUnusualSpendingAlerts(userId, prisma),
    generateBillReminders(userId, prisma),
    generateOverdueBillAlerts(userId, prisma),
  ]);

  const allInsights = [
    ...budgetAlerts,
    ...savingsOpportunities,
    ...unusualSpending,
    ...billReminders,
    ...overdueBillAlerts,
  ];

  await saveInsights(userId, allInsights, prisma);

  return allInsights.length;
}
