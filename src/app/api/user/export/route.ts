import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/export - Export all user data
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all user data
    const [
      user,
      banks,
      categories,
      labels,
      transactions,
      budgets,
      bills,
      insights,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.bank.findMany({
        where: { userId: session.user.id },
        include: {
          creditCard: true,
        },
      }),
      prisma.category.findMany({
        where: { userId: session.user.id },
      }),
      prisma.label.findMany({
        where: { userId: session.user.id },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        include: {
          category: true,
          bank: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
      }),
      prisma.budget.findMany({
        where: { userId: session.user.id },
        include: {
          category: true,
        },
      }),
      prisma.bill.findMany({
        where: { userId: session.user.id },
        include: {
          category: true,
          bank: true,
          payments: true,
        },
      }),
      prisma.insight.findMany({
        where: { userId: session.user.id },
      }),
    ]);

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      user,
      data: {
        banks,
        categories,
        labels,
        transactions,
        budgets,
        bills,
        insights,
      },
      statistics: {
        totalBanks: banks.length,
        totalCategories: categories.length,
        totalLabels: labels.length,
        totalTransactions: transactions.length,
        totalBudgets: budgets.length,
        totalBills: bills.length,
        totalInsights: insights.length,
      },
    };

    // Return as JSON file download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="budget-data-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
