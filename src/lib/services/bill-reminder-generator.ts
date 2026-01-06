import { PrismaClient } from "@prisma/client";
import {
  calculateNextDueDate,
  generateUpcomingPayments,
  shouldSendReminder,
  isOverdue,
  getDaysUntilDue,
} from "./bill-recurrence-calculator";
import { startOfDay, addMonths } from "date-fns";

type InsightType = "BILL_REMINDER" | "BILL_OVERDUE";

interface GeneratedInsight {
  type: InsightType;
  title: string;
  description: string;
  data: any;
}

/**
 * Generate bill reminders for upcoming bills
 */
export async function generateBillReminders(
  userId: string,
  prisma: PrismaClient
): Promise<GeneratedInsight[]> {
  const reminders: GeneratedInsight[] = [];

  // Get all unpaid bill payments that need reminders
  const payments = await prisma.billPayment.findMany({
    where: {
      bill: {
        userId,
        isActive: true,
      },
      status: {
        in: ["UPCOMING", "DUE_SOON"],
      },
      reminderSent: false,
    },
    include: {
      bill: true,
    },
  });

  for (const payment of payments) {
    const { bill } = payment;

    // Check if reminder should be sent
    if (shouldSendReminder(payment as any, bill.reminderDaysBefore)) {
      const daysUntilDue = getDaysUntilDue(payment as any);

      // Check for duplicate reminders in last 24 hours
      const recentReminder = await prisma.insight.findFirst({
        where: {
          userId,
          type: "BILL_REMINDER",
          data: {
            path: ["paymentId"],
            equals: payment.id,
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (recentReminder) continue; // Skip if reminder already sent today

      reminders.push({
        type: "BILL_REMINDER",
        title: `🔔 ${bill.name} bill due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`,
        description: `Your ${bill.name} bill (₹${parseFloat(payment.amount.toString()).toFixed(2)}) is due on ${payment.dueDate.toLocaleDateString()}. Don't forget to pay!`,
        data: {
          billId: bill.id,
          paymentId: payment.id,
          billName: bill.name,
          amount: parseFloat(payment.amount.toString()),
          dueDate: payment.dueDate.toISOString(),
          daysUntilDue,
          billType: bill.billType,
        },
      });

      // Mark reminder as sent
      await prisma.billPayment.update({
        where: { id: payment.id },
        data: {
          reminderSent: true,
          reminderSentAt: new Date(),
        },
      });
    }
  }

  return reminders;
}

/**
 * Generate overdue bill alerts
 */
export async function generateOverdueBillAlerts(
  userId: string,
  prisma: PrismaClient
): Promise<GeneratedInsight[]> {
  const alerts: GeneratedInsight[] = [];

  // Get all overdue payments
  const overduePayments = await prisma.billPayment.findMany({
    where: {
      bill: {
        userId,
        isActive: true,
      },
      status: "OVERDUE",
    },
    include: {
      bill: true,
    },
  });

  for (const payment of overduePayments) {
    const { bill } = payment;
    const daysOverdue = Math.abs(getDaysUntilDue(payment as any));

    // Check for duplicate alerts in last 24 hours
    const recentAlert = await prisma.insight.findFirst({
      where: {
        userId,
        type: "BILL_OVERDUE",
        data: {
          path: ["paymentId"],
          equals: payment.id,
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentAlert) continue; // Skip if alert already sent today

    alerts.push({
      type: "BILL_OVERDUE",
      title: `🚨 Overdue: ${bill.name} bill`,
      description: `Your ${bill.name} bill (₹${parseFloat(payment.amount.toString()).toFixed(2)}) was due on ${payment.dueDate.toLocaleDateString()} and is now ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue. Pay now to avoid late fees!`,
      data: {
        billId: bill.id,
        paymentId: payment.id,
        billName: bill.name,
        amount: parseFloat(payment.amount.toString()),
        dueDate: payment.dueDate.toISOString(),
        daysOverdue,
        billType: bill.billType,
        severity: "critical",
      },
    });
  }

  return alerts;
}

/**
 * Ensure upcoming payment instances exist for all active recurring bills
 */
export async function ensureUpcomingPayments(
  userId: string,
  prisma: PrismaClient
): Promise<number> {
  let createdCount = 0;

  // Get all active bills
  const bills = await prisma.bill.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      payments: {
        orderBy: {
          dueDate: "desc",
        },
        take: 1,
      },
    },
  });

  for (const bill of bills) {
    // Skip one-time bills that already have a payment
    if (bill.recurrence === "ONE_TIME" && bill.payments.length > 0) {
      continue;
    }

    // Generate upcoming payments (next 6 months)
    const upcomingPayments = generateUpcomingPayments(
      {
        ...bill,
        amount: parseFloat(bill.amount.toString()),
        startDate: bill.startDate,
        endDate: bill.endDate,
      },
      6
    );

    // Check which payments already exist
    const existingDueDates = await prisma.billPayment.findMany({
      where: {
        billId: bill.id,
      },
      select: {
        dueDate: true,
      },
    });

    const existingDueDateStrings = new Set(
      existingDueDates.map((p) => startOfDay(p.dueDate).toISOString())
    );

    // Create missing payment instances
    for (const upcomingPayment of upcomingPayments) {
      const dueDateString = startOfDay(upcomingPayment.dueDate).toISOString();

      if (!existingDueDateStrings.has(dueDateString)) {
        await prisma.billPayment.create({
          data: {
            billId: bill.id,
            dueDate: upcomingPayment.dueDate,
            amount: upcomingPayment.amount,
            status: "UPCOMING",
          },
        });
        createdCount++;
      }
    }
  }

  return createdCount;
}

/**
 * Clean up old paid bill payments (optional maintenance)
 */
export async function cleanupOldPayments(
  userId: string,
  monthsToKeep: number = 12,
  prisma: PrismaClient
): Promise<number> {
  const cutoffDate = addMonths(new Date(), -monthsToKeep);

  const result = await prisma.billPayment.deleteMany({
    where: {
      bill: {
        userId,
      },
      status: "PAID",
      paidDate: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
