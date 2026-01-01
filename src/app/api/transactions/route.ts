import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  categoryId: z.string().uuid("Invalid category"),
  bankId: z.string().uuid("Invalid bank"),
  description: z.string().min(1, "Description is required"),
  transactionDate: z.string().datetime(),
  notes: z.string().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

// GET transactions with filtering and search
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const bankId = searchParams.get("bankId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {
      userId: session.user.id,
    };

    if (type) {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (bankId) {
      where.bankId = bankId;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          bank: {
            include: {
              creditCard: true,
            },
          },
          labels: {
            include: {
              label: true,
            },
          },
        },
        orderBy: { transactionDate: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST create a new transaction
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { labelIds, ...validatedData } = transactionSchema.parse(body);

    // Verify bank and category ownership
    const [bank, category] = await Promise.all([
      prisma.bank.findFirst({
        where: { id: validatedData.bankId, userId: session.user.id },
      }),
      prisma.category.findFirst({
        where: { id: validatedData.categoryId, userId: session.user.id },
      }),
    ]);

    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Create transaction with labels
    const transaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        amount: validatedData.amount.toString(),
        transactionDate: new Date(validatedData.transactionDate),
        userId: session.user.id,
        labels: labelIds?.length
          ? {
              create: labelIds.map((labelId) => ({
                label: { connect: { id: labelId } },
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        bank: true,
        labels: {
          include: {
            label: true,
          },
        },
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
