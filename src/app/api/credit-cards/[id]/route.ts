import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const creditCardUpdateSchema = z.object({
  cardName: z.string().min(1, "Card name is required"),
  lastFourDigits: z.string().length(4).optional(),
  billingCycleStartDate: z.number().min(1).max(31),
  billingCycleEndDate: z.number().min(1).max(31),
  paymentDueDay: z.number().min(1).max(31),
  creditLimit: z.number().optional(),
});

// GET a credit card with billing cycles
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

    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id,
        bank: {
          userId: session.user.id,
        },
      },
      include: {
        bank: true,
        billingCycles: {
          orderBy: { cycleStartDate: "desc" },
          take: 12,
        },
      },
    });

    if (!creditCard) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ creditCard });
  } catch (error) {
    console.error("Error fetching credit card:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit card" },
      { status: 500 }
    );
  }
}

// PUT update a credit card
export async function PUT(
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
    const validatedData = creditCardUpdateSchema.parse(body);

    // Verify ownership
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        id,
        bank: {
          userId: session.user.id,
        },
      },
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 }
      );
    }

    const creditCard = await prisma.creditCard.update({
      where: { id },
      data: {
        ...validatedData,
        creditLimit: validatedData.creditLimit
          ? validatedData.creditLimit.toString()
          : null,
      },
      include: {
        bank: true,
        billingCycles: {
          orderBy: { cycleStartDate: "desc" },
          take: 6,
        },
      },
    });

    return NextResponse.json({ creditCard });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating credit card:", error);
    return NextResponse.json(
      { error: "Failed to update credit card" },
      { status: 500 }
    );
  }
}

// DELETE a credit card
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
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        id,
        bank: {
          userId: session.user.id,
        },
      },
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: "Credit card not found" },
        { status: 404 }
      );
    }

    await prisma.creditCard.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Credit card deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting credit card:", error);
    return NextResponse.json(
      { error: "Failed to delete credit card" },
      { status: 500 }
    );
  }
}
