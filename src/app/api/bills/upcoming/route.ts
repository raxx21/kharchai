import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";

// GET /api/bills/upcoming - Get upcoming bills for next N days
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const statusFilter = searchParams.get("status");

    const today = startOfDay(new Date());
    const endDate = addDays(today, days);

    // Build status filter
    const statusValues = statusFilter
      ? statusFilter.split(",")
      : ["UPCOMING", "DUE_SOON", "OVERDUE"];

    // Fetch upcoming payments
    const payments = await prisma.billPayment.findMany({
      where: {
        bill: {
          userId: session.user.id,
          isActive: true,
        },
        status: {
          in: statusValues as any,
        },
        dueDate: {
          gte: today,
          lte: endDate,
        },
      },
      include: {
        bill: {
          include: {
            category: true,
            bank: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    // Calculate total
    const total = payments.reduce(
      (sum: number, p: { amount: any }) => sum + parseFloat(p.amount.toString()),
      0
    );

    return NextResponse.json({
      payments,
      total,
      count: payments.length,
      days,
    });
  } catch (error) {
    console.error("Error fetching upcoming bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming bills" },
      { status: 500 }
    );
  }
}
