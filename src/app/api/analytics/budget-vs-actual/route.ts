import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateActualSpending,
  getBudgetStatus,
  calculatePercentUsed,
  getCurrentPeriodDates,
} from "@/lib/utils/budget-helpers";

// GET /api/analytics/budget-vs-actual - Budget vs Actual comparison
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "MONTHLY";

    // Validate period
    if (!["WEEKLY", "MONTHLY", "YEARLY"].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be WEEKLY, MONTHLY, or YEARLY" },
        { status: 400 }
      );
    }

    // Fetch active budgets for the specified period
    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        period: period as "WEEKLY" | "MONTHLY" | "YEARLY",
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    // Calculate actual vs budgeted for each budget
    const comparisons = await Promise.all(
      budgets.map(async (budget) => {
        const periodDates = getCurrentPeriodDates(
          budget.period as "WEEKLY" | "MONTHLY" | "YEARLY",
          budget.startDate
        );

        const effectiveEndDate = budget.endDate
          ? (budget.endDate < periodDates.end ? budget.endDate : periodDates.end)
          : periodDates.end;

        const actual = await calculateActualSpending(
          session.user.id,
          budget.categoryId,
          periodDates.start,
          effectiveEndDate,
          prisma
        );

        const budgeted = parseFloat(budget.amount.toString());
        const difference = budgeted - actual;
        const percentUsed = calculatePercentUsed(actual, budgeted);
        const status = getBudgetStatus(actual, budgeted);

        return {
          categoryId: budget.category.id,
          categoryName: budget.category.name,
          categoryIcon: budget.category.icon || "📊",
          categoryColor: budget.category.color || "#8884d8",
          budgeted,
          actual,
          difference,
          percentUsed,
          status,
        };
      })
    );

    // Calculate totals
    const totals = {
      totalBudgeted: comparisons.reduce((sum, item) => sum + item.budgeted, 0),
      totalActual: comparisons.reduce((sum, item) => sum + item.actual, 0),
      totalDifference: comparisons.reduce((sum, item) => sum + item.difference, 0),
    };

    return NextResponse.json({
      comparisons,
      totals,
      period,
    });
  } catch (error) {
    console.error("Error fetching budget vs actual:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget vs actual comparison" },
      { status: 500 }
    );
  }
}
