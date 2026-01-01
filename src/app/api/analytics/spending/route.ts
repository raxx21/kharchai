import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";

// GET /api/analytics/spending - Spending analytics
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "category";
    const categoryId = searchParams.get("categoryId");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    // Build transaction query
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
      orderBy: {
        transactionDate: "desc",
      },
    });

    if (groupBy === "category") {
      // Group by category
      const categoryMap = new Map<
        string,
        {
          categoryId: string;
          categoryName: string;
          categoryIcon: string;
          categoryColor: string;
          totalSpent: number;
          transactionCount: number;
        }
      >();

      transactions.forEach((transaction) => {
        const catId = transaction.category?.id || "uncategorized";
        const catName = transaction.category?.name || "Uncategorized";
        const catIcon = transaction.category?.icon || "📊";
        const catColor = transaction.category?.color || "#8884d8";

        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            categoryIcon: catIcon,
            categoryColor: catColor,
            totalSpent: 0,
            transactionCount: 0,
          });
        }

        const categoryData = categoryMap.get(catId)!;
        categoryData.totalSpent += parseFloat(transaction.amount.toString());
        categoryData.transactionCount += 1;
      });

      const data = Array.from(categoryMap.values());
      const totalSpent = data.reduce((sum, item) => sum + item.totalSpent, 0);

      // Calculate percentages
      const dataWithPercentages = data.map((item) => ({
        ...item,
        percentage: totalSpent > 0 ? (item.totalSpent / totalSpent) * 100 : 0,
      }));

      return NextResponse.json({
        data: dataWithPercentages,
        totalSpent,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    } else {
      // Group by time period (day/week/month)
      const periodMap = new Map<
        string,
        {
          period: string;
          totalSpent: number;
          categoryBreakdown: Map<
            string,
            { categoryId: string; categoryName: string; amount: number }
          >;
        }
      >();

      transactions.forEach((transaction) => {
        let periodKey: string;

        switch (groupBy) {
          case "day":
            periodKey = format(transaction.transactionDate, "yyyy-MM-dd");
            break;
          case "week":
            periodKey = format(
              startOfWeek(transaction.transactionDate, { weekStartsOn: 1 }),
              "yyyy-'W'II"
            );
            break;
          case "month":
            periodKey = format(transaction.transactionDate, "yyyy-MM");
            break;
          default:
            periodKey = format(transaction.transactionDate, "yyyy-MM-dd");
        }

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            period: periodKey,
            totalSpent: 0,
            categoryBreakdown: new Map(),
          });
        }

        const periodData = periodMap.get(periodKey)!;
        periodData.totalSpent += parseFloat(transaction.amount.toString());

        // Add to category breakdown
        const catId = transaction.category?.id || "uncategorized";
        const catName = transaction.category?.name || "Uncategorized";

        if (!periodData.categoryBreakdown.has(catId)) {
          periodData.categoryBreakdown.set(catId, {
            categoryId: catId,
            categoryName: catName,
            amount: 0,
          });
        }

        const catData = periodData.categoryBreakdown.get(catId)!;
        catData.amount += parseFloat(transaction.amount.toString());
      });

      const data = Array.from(periodMap.values()).map((item) => ({
        period: item.period,
        totalSpent: item.totalSpent,
        categoryBreakdown: Array.from(item.categoryBreakdown.values()),
      }));

      // Sort by period
      data.sort((a, b) => a.period.localeCompare(b.period));

      const totalSpent = data.reduce((sum, item) => sum + item.totalSpent, 0);

      return NextResponse.json({
        data,
        totalSpent,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    }
  } catch (error) {
    console.error("Error fetching spending analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch spending analytics" },
      { status: 500 }
    );
  }
}
