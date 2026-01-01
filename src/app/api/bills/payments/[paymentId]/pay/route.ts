import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markBillAsPaid } from "@/lib/services/bill-payment-processor";

// POST /api/bills/payments/[paymentId]/pay - Mark bill payment as paid
export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await auth();
    const { paymentId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const schema = z.object({
      paidAmount: z.number().positive("Paid amount must be positive"),
      paidDate: z.string().datetime(),
      bankId: z.string().uuid("Bank ID is required"),
      notes: z.string().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { paidAmount, paidDate, bankId, notes } = validation.data;

    // Verify bank belongs to user
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

    // Mark bill as paid and create transaction
    const result = await markBillAsPaid(
      {
        paymentId,
        userId: session.user.id,
        paidAmount,
        paidDate: new Date(paidDate),
        bankId,
        notes,
      },
      prisma
    );

    return NextResponse.json({
      payment: result.payment,
      transaction: result.transaction,
      message: "Bill marked as paid and transaction created successfully",
    });
  } catch (error: any) {
    console.error("Error marking bill as paid:", error);

    if (error.message === "Bill payment not found or unauthorized") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message === "Bill payment is already marked as paid") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to mark bill as paid" },
      { status: 500 }
    );
  }
}
