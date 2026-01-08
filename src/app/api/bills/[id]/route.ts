import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUpcomingPayments } from "@/lib/services/bill-recurrence-calculator";
import { startOfDay } from "date-fns";

// GET /api/bills/[id] - Get single bill with payment history
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

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        category: true,
        bank: true,
        payments: {
          orderBy: {
            dueDate: "desc",
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ bill });
  } catch (error) {
    console.error("Error fetching bill:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 }
    );
  }
}

// PATCH /api/bills/[id] - Update bill
export async function PATCH(
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
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      billType: z.enum(["UTILITIES", "SUBSCRIPTION", "RENT_MORTGAGE", "INSURANCE", "OTHER"]).optional(),
      amount: z.number().positive().optional(),
      categoryId: z.string().uuid().optional(),
      recurrence: z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional().nullable(),
      dayOfMonth: z.number().min(1).max(31).optional().nullable(),
      dayOfWeek: z.number().min(0).max(6).optional().nullable(),
      reminderDaysBefore: z.number().min(0).max(30).optional(),
      autoPay: z.boolean().optional(),
      bankId: z.string().uuid().optional().nullable(),
      notes: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verify bill exists and belongs to user
    const existingBill = await prisma.bill.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingBill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    const data = validation.data;

    // Verify category if provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
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
    }

    // Verify bank if provided
    if (data.bankId) {
      const bank = await prisma.bank.findFirst({
        where: {
          id: data.bankId,
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

    // Update bill
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.billType !== undefined) updateData.billType = data.billType;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.reminderDaysBefore !== undefined) updateData.reminderDaysBefore = data.reminderDaysBefore;
    if (data.autoPay !== undefined) updateData.autoPay = data.autoPay;
    if (data.bankId !== undefined) updateData.bankId = data.bankId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const bill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        bank: true,
      },
    });

    // Check if schedule-related fields were updated
    const scheduleChanged =
      data.recurrence !== undefined ||
      data.dayOfMonth !== undefined ||
      data.dayOfWeek !== undefined ||
      data.startDate !== undefined ||
      data.amount !== undefined ||
      data.endDate !== undefined;

    // If schedule changed, regenerate future unpaid payment instances
    if (scheduleChanged) {
      // Delete future unpaid payment instances
      await prisma.billPayment.deleteMany({
        where: {
          billId: id,
          status: {
            in: ["UPCOMING", "DUE_SOON"],
          },
          dueDate: {
            gte: new Date(),
          },
        },
      });

      // Regenerate payment instances with new schedule
      const upcomingPayments = generateUpcomingPayments(
        {
          ...bill,
          amount: parseFloat(bill.amount.toString()),
          startDate: bill.startDate,
          endDate: bill.endDate,
        },
        6
      );

      // Create new payment instances
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
    }

    return NextResponse.json({ bill });
  } catch (error) {
    console.error("Error updating bill:", error);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id] - Delete bill
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

    // Verify bill exists and belongs to user
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

    // Delete bill (cascade will delete payments)
    await prisma.bill.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    return NextResponse.json(
      { error: "Failed to delete bill" },
      { status: 500 }
    );
  }
}
