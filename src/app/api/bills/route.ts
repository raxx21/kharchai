import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUpcomingPayments } from "@/lib/services/bill-recurrence-calculator";

// GET /api/bills - List bills with filtering
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const recurrence = searchParams.get("recurrence");
    const active = searchParams.get("active");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build query
    const where: any = {
      userId: session.user.id,
    };

    if (type) {
      where.billType = type;
    }

    if (recurrence) {
      where.recurrence = recurrence;
    }

    if (active !== null && active !== undefined) {
      where.isActive = active === "true";
    }

    // Fetch bills
    const bills = await prisma.bill.findMany({
      where,
      include: {
        category: true,
        bank: true,
        payments: {
          where: {
            status: {
              in: ["UPCOMING", "DUE_SOON", "OVERDUE"],
            },
          },
          orderBy: {
            dueDate: "asc",
          },
          take: 1, // Get next upcoming payment
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({ bills });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create new bill
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const schema = z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      billType: z.enum(["UTILITIES", "SUBSCRIPTION", "RENT_MORTGAGE", "INSURANCE", "OTHER"]),
      amount: z.number().positive("Amount must be positive"),
      categoryId: z.string().uuid(),
      recurrence: z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]),
      startDate: z.string().datetime(),
      endDate: z.string().datetime().optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      reminderDaysBefore: z.number().min(0).max(30).default(3),
      autoPay: z.boolean().default(false),
      bankId: z.string().uuid().optional(),
      notes: z.string().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      billType,
      amount,
      categoryId,
      recurrence,
      startDate,
      endDate,
      dayOfMonth,
      dayOfWeek,
      reminderDaysBefore,
      autoPay,
      bankId,
      notes,
    } = validation.data;

    // Verify category belongs to user
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

    // Verify bank belongs to user if provided
    if (bankId) {
      const bank = await prisma.bank.findFirst({
        where: {
          id: bankId,
          userId: session.user.id,
        },
      });

      if (!bank) {
        return NextResponse.json(
          { error: "Bank not found" },
          { status: 404 }
        );
      }
    }

    // Create bill
    const bill = await prisma.bill.create({
      data: {
        userId: session.user.id,
        name,
        description,
        billType,
        amount,
        categoryId,
        recurrence,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        dayOfMonth,
        dayOfWeek,
        reminderDaysBefore,
        autoPay,
        bankId,
        notes,
      },
      include: {
        category: true,
        bank: true,
      },
    });

    // Generate initial payment instances (next 6 payments)
    const upcomingPayments = generateUpcomingPayments(
      {
        ...bill,
        amount: parseFloat(bill.amount.toString()),
        startDate: bill.startDate,
        endDate: bill.endDate,
      },
      6
    );

    // Create payment instances
    for (const payment of upcomingPayments) {
      await prisma.billPayment.create({
        data: {
          billId: bill.id,
          dueDate: payment.dueDate,
          amount: payment.amount,
          status: "UPCOMING",
        },
      });
    }

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
