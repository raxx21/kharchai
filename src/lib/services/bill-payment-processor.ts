import { PrismaClient } from "@/generated/prisma";

interface MarkBillAsPaidParams {
  paymentId: string;
  userId: string;
  paidAmount: number;
  paidDate: Date;
  bankId: string;
  notes?: string;
}

interface MarkBillAsPaidResult {
  payment: any;
  transaction: any;
}

/**
 * Mark a bill payment as paid and automatically create a transaction
 */
export async function markBillAsPaid(
  params: MarkBillAsPaidParams,
  prisma: PrismaClient
): Promise<MarkBillAsPaidResult> {
  const { paymentId, userId, paidAmount, paidDate, bankId, notes } = params;

  // Fetch the payment with bill details
  const payment = await prisma.billPayment.findFirst({
    where: {
      id: paymentId,
      bill: {
        userId,
      },
    },
    include: {
      bill: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("Bill payment not found or unauthorized");
  }

  if (payment.status === "PAID") {
    throw new Error("Bill payment is already marked as paid");
  }

  // Create transaction for this bill payment
  const transaction = await createTransactionFromBill(
    payment,
    payment.bill,
    paidAmount,
    paidDate,
    bankId,
    notes,
    prisma
  );

  // Update payment status
  const updatedPayment = await prisma.billPayment.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      paidDate,
      paidAmount,
      transactionId: transaction.id,
      notes: notes || payment.notes,
    },
    include: {
      bill: {
        include: {
          category: true,
        },
      },
      transaction: true,
    },
  });

  return {
    payment: updatedPayment,
    transaction,
  };
}

/**
 * Create an expense transaction from a bill payment
 */
async function createTransactionFromBill(
  payment: any,
  bill: any,
  paidAmount: number,
  paidDate: Date,
  bankId: string,
  notes: string | undefined,
  prisma: PrismaClient
): Promise<any> {
  // Get user ID from bill
  const userId = bill.userId;

  // Create the transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      bankId,
      amount: paidAmount,
      currency: "INR",
      type: "EXPENSE",
      categoryId: bill.categoryId,
      description: `Bill Payment: ${bill.name}`,
      transactionDate: paidDate,
      notes: notes || `Payment for ${bill.name} bill`,
    },
    include: {
      category: true,
      bank: true,
    },
  });

  return transaction;
}

/**
 * Unmark a bill payment (reverse the payment)
 */
export async function unmarkBillPayment(
  paymentId: string,
  userId: string,
  deleteTransaction: boolean,
  prisma: PrismaClient
): Promise<any> {
  // Fetch the payment with bill details
  const payment = await prisma.billPayment.findFirst({
    where: {
      id: paymentId,
      bill: {
        userId,
      },
    },
    include: {
      transaction: true,
    },
  });

  if (!payment) {
    throw new Error("Bill payment not found or unauthorized");
  }

  if (payment.status !== "PAID") {
    throw new Error("Bill payment is not marked as paid");
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Delete the linked transaction if requested
    if (deleteTransaction && payment.transactionId) {
      await tx.transaction.delete({
        where: { id: payment.transactionId },
      });
    }

    // Update payment status back to upcoming/overdue
    const now = new Date();
    const status = payment.dueDate < now ? "OVERDUE" : "UPCOMING";

    const updatedPayment = await tx.billPayment.update({
      where: { id: paymentId },
      data: {
        status,
        paidDate: null,
        paidAmount: null,
        transactionId: null,
      },
      include: {
        bill: {
          include: {
            category: true,
          },
        },
      },
    });

    return updatedPayment;
  });

  return result;
}

/**
 * Update payment status based on due date (for scheduled jobs)
 */
export async function updatePaymentStatuses(
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  const now = new Date();

  // Update all unpaid payments that are past due to OVERDUE
  const result = await prisma.billPayment.updateMany({
    where: {
      bill: {
        userId,
      },
      status: {
        in: ["UPCOMING", "DUE_SOON"],
      },
      dueDate: {
        lt: now,
      },
    },
    data: {
      status: "OVERDUE",
    },
  });

  return result.count;
}
