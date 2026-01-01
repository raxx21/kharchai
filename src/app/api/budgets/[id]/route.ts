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

// Validation schema for updating budgets
const updateBudgetSchema = z.object({
  amount: z.number().positive().optional(),
  period: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
});

// GET /api/budgets/[id] - Get single budget with calculations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const budget = await prisma.budget.findFirst({
      where: {
        id,
        userId: session.user.id,
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

    if (!budget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    // Calculate actual spending
    const periodDates = getCurrentPeriodDates(
      budget.period as "WEEKLY" | "MONTHLY" | "YEARLY",
      budget.startDate
    );

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

    return NextResponse.json({
      budget: {
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
      },
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

// PATCH /api/budgets/[id] - Update budget
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validation = updateBudgetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    // Update budget
    const updateData: any = {};

    if (validation.data.amount !== undefined) {
      updateData.amount = validation.data.amount;
    }

    if (validation.data.period !== undefined) {
      updateData.period = validation.data.period;
    }

    if (validation.data.startDate !== undefined) {
      updateData.startDate = new Date(validation.data.startDate);
    }

    if (validation.data.endDate !== undefined) {
      updateData.endDate = validation.data.endDate
        ? new Date(validation.data.endDate)
        : null;
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
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

    // Calculate updated spending
    const periodDates = getCurrentPeriodDates(
      budget.period as "WEEKLY" | "MONTHLY" | "YEARLY",
      budget.startDate
    );

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

    return NextResponse.json({
      budget: {
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
      },
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets/[id] - Delete budget
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    // Delete budget
    await prisma.budget.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
