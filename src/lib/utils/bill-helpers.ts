import { PrismaClient } from "@/generated/prisma";
import { startOfDay } from "date-fns";

type BillStatus = "UPCOMING" | "DUE_SOON" | "OVERDUE" | "PAID" | "CANCELLED";
type BillType = "UTILITIES" | "SUBSCRIPTION" | "RENT_MORTGAGE" | "INSURANCE" | "OTHER";
type BillRecurrence = "ONE_TIME" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";

/**
 * Get hex color for bill status
 */
export function getBillStatusColor(status: BillStatus): string {
  switch (status) {
    case "PAID":
      return "#10b981"; // green-500
    case "UPCOMING":
      return "#3b82f6"; // blue-500
    case "DUE_SOON":
      return "#eab308"; // yellow-500
    case "OVERDUE":
      return "#ef4444"; // red-500
    case "CANCELLED":
      return "#6b7280"; // gray-500
    default:
      return "#3b82f6"; // blue-500
  }
}

/**
 * Get badge variant for bill status
 */
export function getBillStatusBadge(status: BillStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "default";
    case "UPCOMING":
      return "secondary";
    case "DUE_SOON":
      return "outline";
    case "OVERDUE":
      return "destructive";
    case "CANCELLED":
      return "secondary";
    default:
      return "secondary";
  }
}

/**
 * Calculate total upcoming bills for a date range
 */
export async function calculateUpcomingBillsTotal(
  userId: string,
  startDate: Date,
  endDate: Date,
  prisma: PrismaClient
): Promise<number> {
  const result = await prisma.billPayment.aggregate({
    where: {
      bill: {
        userId,
        isActive: true,
      },
      status: {
        in: ["UPCOMING", "DUE_SOON"],
      },
      dueDate: {
        gte: startOfDay(startDate),
        lte: startOfDay(endDate),
      },
    },
    _sum: {
      amount: true,
    },
  });

  return parseFloat(result._sum.amount?.toString() || "0");
}

/**
 * Format recurrence as human-readable string
 */
export function formatRecurrence(recurrence: BillRecurrence): string {
  const map: Record<BillRecurrence, string> = {
    ONE_TIME: "One-time",
    WEEKLY: "Weekly",
    BIWEEKLY: "Every 2 weeks",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    SEMI_ANNUAL: "Every 6 months",
    ANNUAL: "Annually",
  };

  return map[recurrence] || recurrence;
}

/**
 * Get icon for bill type
 */
export function getBillTypeIcon(billType: BillType): string {
  const map: Record<BillType, string> = {
    UTILITIES: "⚡",
    SUBSCRIPTION: "📺",
    RENT_MORTGAGE: "🏠",
    INSURANCE: "🛡️",
    OTHER: "📋",
  };

  return map[billType] || "📋";
}

/**
 * Get color for bill type
 */
export function getBillTypeColor(billType: BillType): string {
  const map: Record<BillType, string> = {
    UTILITIES: "#eab308", // yellow
    SUBSCRIPTION: "#a855f7", // purple
    RENT_MORTGAGE: "#3b82f6", // blue
    INSURANCE: "#10b981", // green
    OTHER: "#6b7280", // gray
  };

  return map[billType] || "#6b7280";
}

/**
 * Format bill type as human-readable string
 */
export function formatBillType(billType: BillType): string {
  const map: Record<BillType, string> = {
    UTILITIES: "Utilities",
    SUBSCRIPTION: "Subscription",
    RENT_MORTGAGE: "Rent/Mortgage",
    INSURANCE: "Insurance",
    OTHER: "Other",
  };

  return map[billType] || billType;
}

/**
 * Get status text for display
 */
export function getStatusText(status: BillStatus): string {
  const map: Record<BillStatus, string> = {
    UPCOMING: "Upcoming",
    DUE_SOON: "Due Soon",
    OVERDUE: "Overdue",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  };

  return map[status] || status;
}

/**
 * Calculate bill statistics for a user
 */
export async function calculateBillStats(
  userId: string,
  prisma: PrismaClient
): Promise<{
  totalBills: number;
  activeBills: number;
  upcomingPayments: number;
  overduePayments: number;
  upcomingTotal: number;
  overdueTotal: number;
  byType: Record<BillType, number>;
}> {
  // Get all bills count
  const totalBills = await prisma.bill.count({
    where: { userId },
  });

  const activeBills = await prisma.bill.count({
    where: { userId, isActive: true },
  });

  // Date range for upcoming payments (next 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  // Get upcoming payments (next 30 days)
  const upcomingPayments = await prisma.billPayment.count({
    where: {
      bill: { userId, isActive: true },
      status: {
        in: ["UPCOMING", "DUE_SOON"],
      },
      dueDate: {
        gte: startOfDay(today),
        lte: startOfDay(thirtyDaysFromNow),
      },
    },
  });

  // Get overdue payments
  const overduePayments = await prisma.billPayment.count({
    where: {
      bill: { userId, isActive: true },
      status: "OVERDUE",
    },
  });

  // Calculate upcoming total (next 30 days only)
  const upcomingResult = await prisma.billPayment.aggregate({
    where: {
      bill: { userId, isActive: true },
      status: {
        in: ["UPCOMING", "DUE_SOON"],
      },
      dueDate: {
        gte: startOfDay(today),
        lte: startOfDay(thirtyDaysFromNow),
      },
    },
    _sum: {
      amount: true,
    },
  });

  const upcomingTotal = parseFloat(upcomingResult._sum.amount?.toString() || "0");

  // Calculate overdue total
  const overdueResult = await prisma.billPayment.aggregate({
    where: {
      bill: { userId, isActive: true },
      status: "OVERDUE",
    },
    _sum: {
      amount: true,
    },
  });

  const overdueTotal = parseFloat(overdueResult._sum.amount?.toString() || "0");

  // Count by type
  const billsByType = await prisma.bill.groupBy({
    by: ["billType"],
    where: { userId, isActive: true },
    _count: true,
  });

  const byType: Record<BillType, number> = {
    UTILITIES: 0,
    SUBSCRIPTION: 0,
    RENT_MORTGAGE: 0,
    INSURANCE: 0,
    OTHER: 0,
  };

  billsByType.forEach((item) => {
    byType[item.billType as BillType] = item._count;
  });

  return {
    totalBills,
    activeBills,
    upcomingPayments,
    overduePayments,
    upcomingTotal,
    overdueTotal,
    byType,
  };
}

/**
 * Format currency amount
 */
export function formatAmount(amount: number | string, currency: string = "INR"): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}
