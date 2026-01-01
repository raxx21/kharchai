import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bankSchema = z.object({
  name: z.string().min(1, "Bank name is required"),
  type: z.enum(["BANK", "CREDIT_CARD", "WALLET"]),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// GET a single bank by ID
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

    const bank = await prisma.bank.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        creditCard: {
          include: {
            billingCycles: {
              orderBy: { cycleStartDate: "desc" },
              take: 6,
            },
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    return NextResponse.json({ bank });
  } catch (error) {
    console.error("Error fetching bank:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank" },
      { status: 500 }
    );
  }
}

// PUT update a bank
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
    const validatedData = bankSchema.parse(body);

    // Verify ownership
    const existingBank = await prisma.bank.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingBank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    const bank = await prisma.bank.update({
      where: { id },
      data: validatedData,
      include: {
        creditCard: true,
      },
    });

    return NextResponse.json({ bank });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating bank:", error);
    return NextResponse.json(
      { error: "Failed to update bank" },
      { status: 500 }
    );
  }
}

// DELETE a bank
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
    const existingBank = await prisma.bank.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingBank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    await prisma.bank.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Bank deleted successfully" });
  } catch (error) {
    console.error("Error deleting bank:", error);
    return NextResponse.json(
      { error: "Failed to delete bank" },
      { status: 500 }
    );
  }
}
