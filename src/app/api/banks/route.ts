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

// GET all banks for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banks = await prisma.bank.findMany({
      where: { userId: session.user.id },
      include: {
        creditCard: true,
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ banks });
  } catch (error) {
    console.error("Error fetching banks:", error);
    return NextResponse.json(
      { error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}

// POST create a new bank
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bankSchema.parse(body);

    const bank = await prisma.bank.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
      include: {
        creditCard: true,
      },
    });

    return NextResponse.json({ bank }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating bank:", error);
    return NextResponse.json(
      { error: "Failed to create bank" },
      { status: 500 }
    );
  }
}
