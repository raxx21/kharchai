import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateActualSpending,
  getBudgetStatus,
  calculatePercentUsed,
  getCurrentPeriodDates,
} from "@/lib/utils/budget-helpers";

// Validation schema for creating budgets
const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  period: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

// GET /api/budgets - List all budgets with calculated spending
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const categoryId = searchParams.get("categoryId");
    const active = searchParams.get("active");

    // Build query
    const where: any = {
      userId: session.user.id,
    };

    if (period) {
      where.period = period;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filter for active budgets (no endDate or endDate in future)
    if (active === "true") {
      where.OR = [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ];
    }

    // Fetch budgets
    const budgets = await prisma.budget.findMany({
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
        createdAt: "desc",
      },
    });

    // Calculate actual spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        // Determine the period dates to calculate spending
        const periodDates = getCurrentPeriodDates(
          budget.period as "WEEKLY" | "MONTHLY" | "YEARLY",
          budget.startDate
        );

        // Use endDate if specified, otherwise use period end
        const effectiveEndDate = budget.endDate
          ? (budget.endDate < periodDates.end ? budget.endDate : periodDates.end)
          : periodDates.end;

        const actualSpent = await calculateActualSpending(
          session.user.id,
          budget.categoryId,
          periodDates.start,
          effectiveEndDate,
          prisma
        );

        const budgetAmount = parseFloat(budget.amount.toString());
        const percentUsed = calculatePercentUsed(actualSpent, budgetAmount);
        const status = getBudgetStatus(actualSpent, budgetAmount);
        const remaining = budgetAmount - actualSpent;

        return {
          id: budget.id,
          categoryId: budget.categoryId,
          category: budget.category,
          amount: budget.amount.toString(),
          period: budget.period,
          startDate: budget.startDate.toISOString(),
          endDate: budget.endDate?.toISOString() || null,
          actualSpent,
          percentUsed,
          remaining,
          status,
          createdAt: budget.createdAt.toISOString(),
          updatedAt: budget.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ budgets: budgetsWithSpending });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST /api/budgets - Create a new budget
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validation = createBudgetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { categoryId, amount, period, startDate, endDate } = validation.data;

    // Verify category ownership
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [
          { userId: session.user.id },
          { isSystem: true },
        ],
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check for overlapping budgets in the same category
    const overlappingBudget = await prisma.budget.findFirst({
      where: {
        userId: session.user.id,
        categoryId,
        period,
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              {
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date(startDate) } },
                ],
              },
            ],
          },
          ...(endDate
            ? [
                {
                  AND: [
                    { startDate: { lte: new Date(endDate) } },
                    {
                      OR: [
                        { endDate: null },
                        { endDate: { gte: new Date(endDate) } },
                      ],
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    });

    if (overlappingBudget) {
      return NextResponse.json(
        { error: "A budget already exists for this category and period" },
        { status: 409 }
      );
    }

    // Create budget
    const budget = await prisma.budget.create({
      data: {
        userId: session.user.id,
        categoryId,
        amount,
        period,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
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

    // Return with initial calculations
    return NextResponse.json({
      budget: {
        id: budget.id,
        categoryId: budget.categoryId,
        category: budget.category,
        amount: budget.amount.toString(),
        period: budget.period,
        startDate: budget.startDate.toISOString(),
        endDate: budget.endDate?.toISOString() || null,
        actualSpent: 0,
        percentUsed: 0,
        remaining: parseFloat(budget.amount.toString()),
        status: "ON_TRACK",
        createdAt: budget.createdAt.toISOString(),
        updatedAt: budget.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
