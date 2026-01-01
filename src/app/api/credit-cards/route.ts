import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const creditCardSchema = z.object({
  bankId: z.string().uuid(),
  cardName: z.string().min(1, "Card name is required"),
  lastFourDigits: z.string().length(4).optional(),
  billingCycleStartDate: z.number().min(1).max(31),
  billingCycleEndDate: z.number().min(1).max(31),
  paymentDueDay: z.number().min(1).max(31),
  creditLimit: z.number().optional(),
});

// POST create a new credit card
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = creditCardSchema.parse(body);

    // Verify bank ownership
    const bank = await prisma.bank.findFirst({
      where: {
        id: validatedData.bankId,
        userId: session.user.id,
      },
    });

    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    // Check if bank already has a credit card
    const existingCard = await prisma.creditCard.findUnique({
      where: { bankId: validatedData.bankId },
    });

    if (existingCard) {
      return NextResponse.json(
        { error: "This bank already has a credit card" },
        { status: 400 }
      );
    }

    const creditCard = await prisma.creditCard.create({
      data: {
        ...validatedData,
        creditLimit: validatedData.creditLimit
          ? validatedData.creditLimit.toString()
          : null,
      },
      include: {
        bank: true,
      },
    });

    return NextResponse.json({ creditCard }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating credit card:", error);
    return NextResponse.json(
      { error: "Failed to create credit card" },
      { status: 500 }
    );
  }
}
