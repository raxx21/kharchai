import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { calculateTrendDirection } from "@/lib/utils/analytics-helpers";

// GET /api/analytics/trends - Spending trends over time
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const monthsParam = searchParams.get("months");
    const months = monthsParam ? parseInt(monthsParam, 10) : 6;

    // Validate months
    if (months < 1 || months > 24) {
      return NextResponse.json(
        { error: "Months must be between 1 and 24" },
        { status: 400 }
      );
    }

    // Calculate date range (last N months)
    const endDate = endOfMonth(new Date());
    const startDate = startOfMonth(subMonths(endDate, months - 1));

    // Build query
    const where: any = {
      userId: session.user.id,
      type: "EXPENSE",
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
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

    // Group by month
    const monthMap = new Map<
      string,
      {
        month: string;
        totalSpent: number;
        categories: Map<
          string,
          { categoryId: string; categoryName: string; amount: number }
        >;
      }
    >();

    transactions.forEach((transaction) => {
      const monthKey = format(transaction.transactionDate, "yyyy-MM");

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          totalSpent: 0,
          categories: new Map(),
        });
      }

      const monthData = monthMap.get(monthKey)!;
      monthData.totalSpent += parseFloat(transaction.amount.toString());

      // Add to category breakdown
      const catId = transaction.category?.id || "uncategorized";
      const catName = transaction.category?.name || "Uncategorized";

      if (!monthData.categories.has(catId)) {
        monthData.categories.set(catId, {
          categoryId: catId,
          categoryName: catName,
          amount: 0,
        });
      }

      const catData = monthData.categories.get(catId)!;
      catData.amount += parseFloat(transaction.amount.toString());
    });

    // Convert to array and sort
    const trends = Array.from(monthMap.values())
      .map((item) => ({
        month: item.month,
        totalSpent: item.totalSpent,
        categories: Array.from(item.categories.values()),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Fill in missing months with zero spending
    const allMonths: Array<{ month: string; totalSpent: number; categories: any[] }> = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const monthKey = format(currentDate, "yyyy-MM");
      const existingData = trends.find((t) => t.month === monthKey);

      if (existingData) {
        allMonths.push(existingData);
      } else {
        allMonths.push({
          month: monthKey,
          totalSpent: 0,
          categories: [],
        });
      }

      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    // Calculate insights
    const amounts = allMonths.map((m) => ({ period: m.month, amount: m.totalSpent }));
    const totalSpent = amounts.reduce((sum, item) => sum + item.amount, 0);
    const averageMonthlySpend = allMonths.length > 0 ? totalSpent / allMonths.length : 0;

    const nonZeroMonths = allMonths.filter((m) => m.totalSpent > 0);
    const highestMonth =
      nonZeroMonths.length > 0
        ? nonZeroMonths.reduce((max, m) => (m.totalSpent > max.totalSpent ? m : max))
        : null;
    const lowestMonth =
      nonZeroMonths.length > 0
        ? nonZeroMonths.reduce((min, m) => (m.totalSpent < min.totalSpent ? m : min))
        : null;

    const trend = calculateTrendDirection(amounts);

    const insights = {
      averageMonthlySpend: Math.round(averageMonthlySpend * 100) / 100,
      highestMonth: highestMonth
        ? { month: highestMonth.month, amount: highestMonth.totalSpent }
        : null,
      lowestMonth: lowestMonth
        ? { month: lowestMonth.month, amount: lowestMonth.totalSpent }
        : null,
      trend,
    };

    return NextResponse.json({
      trends: allMonths,
      insights,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        months,
      },
    });
  } catch (error) {
    console.error("Error fetching spending trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch spending trends" },
      { status: 500 }
    );
  }
}
