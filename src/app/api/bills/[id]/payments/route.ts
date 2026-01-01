import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bills/[id]/payments - Get payment history for a bill
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Verify bill belongs to user
    const bill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    // Build query
    const where: any = {
      billId: id,
    };

    if (status) {
      where.status = status;
    }

    // Fetch payments
    const payments = await prisma.billPayment.findMany({
      where,
      include: {
        transaction: {
          include: {
            bank: true,
          },
        },
      },
      orderBy: {
        dueDate: "desc",
      },
      take: limit,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/bills/[id]/payments - Manually create payment instance
export async function POST(
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

    const schema = z.object({
      dueDate: z.string().datetime(),
      amount: z.number().positive(),
      notes: z.string().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verify bill belongs to user
    const bill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    const { dueDate, amount, notes } = validation.data;

    // Create payment instance
    const payment = await prisma.billPayment.create({
      data: {
        billId: id,
        dueDate: new Date(dueDate),
        amount,
        status: "UPCOMING",
        notes,
      },
      include: {
        bill: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
