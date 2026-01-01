import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET transactions for a specific billing cycle
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cycleStart = searchParams.get("cycleStart");
    const cycleEnd = searchParams.get("cycleEnd");

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!cycleStart || !cycleEnd) {
      return NextResponse.json(
        { error: "Cycle dates are required" },
        { status: 400 }
      );
    }

    // Get credit card and verify ownership
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id,
        bank: {
          userId: session.user.id,
        },
      },
      include: {
        bank: true,
      },
    });

    if (!creditCard) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 }
      );
    }

    // Get all transactions for this card within the billing cycle
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        bankId: creditCard.bankId,
        type: "EXPENSE", // Only expenses count towards credit card bill
        transactionDate: {
          gte: new Date(cycleStart),
          lte: new Date(cycleEnd),
        },
      },
      include: {
        category: true,
        labels: {
          include: {
            label: true,
          },
        },
      },
      orderBy: {
        transactionDate: "desc",
      },
    });

    // Calculate total
    const total = transactions.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0
    );

    return NextResponse.json({
      transactions,
      total,
      cycleStart,
      cycleEnd,
      creditCard: {
        id: creditCard.id,
        cardName: creditCard.cardName,
        lastFourDigits: creditCard.lastFourDigits,
        bank: creditCard.bank,
      },
    });
  } catch (error) {
    console.error("Error fetching cycle transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle transactions" },
      { status: 500 }
    );
  }
}
