import {
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  startOfDay,
  endOfMonth,
  differenceInDays,
  isBefore,
  isAfter,
  format,
} from "date-fns";

type BillRecurrence = "ONE_TIME" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";
type BillStatus = "UPCOMING" | "DUE_SOON" | "OVERDUE" | "PAID" | "CANCELLED";

interface Bill {
  id: string;
  recurrence: BillRecurrence;
  startDate: Date;
  endDate?: Date | null;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  amount: number;
  reminderDaysBefore: number;
}

interface BillPayment {
  id: string;
  billId: string;
  dueDate: Date;
  amount: number;
  status: BillStatus;
  paidDate?: Date | null;
  reminderSent: boolean;
  reminderSentAt?: Date | null;
}

interface UpcomingPayment {
  dueDate: Date;
  amount: number;
}

/**
 * Calculate the next due date for a bill based on its recurrence pattern
 */
export function calculateNextDueDate(
  bill: Bill,
  fromDate: Date = new Date()
): Date | null {
  const from = startOfDay(fromDate);
  const start = startOfDay(bill.startDate);

  // If bill hasn't started yet, return start date
  if (isBefore(from, start)) {
    return start;
  }

  // If bill has ended, return null
  if (bill.endDate && isAfter(from, startOfDay(bill.endDate))) {
    return null;
  }

  // For one-time bills, return start date if not passed
  if (bill.recurrence === "ONE_TIME") {
    return isBefore(from, start) || from.getTime() === start.getTime() ? start : null;
  }

  // Calculate next occurrence based on recurrence pattern
  let nextDate = new Date(start);

  switch (bill.recurrence) {
    case "WEEKLY":
      // Add weeks until we're past fromDate
      while (isBefore(nextDate, from)) {
        nextDate = addWeeks(nextDate, 1);
      }
      break;

    case "BIWEEKLY":
      // Add 2 weeks until we're past fromDate
      while (isBefore(nextDate, from)) {
        nextDate = addWeeks(nextDate, 2);
      }
      break;

    case "MONTHLY":
      // For monthly bills, use dayOfMonth if provided
      if (bill.dayOfMonth) {
        nextDate = calculateMonthlyDueDate(from, bill.dayOfMonth);
      } else {
        while (isBefore(nextDate, from)) {
          nextDate = addMonths(nextDate, 1);
        }
      }
      break;

    case "QUARTERLY":
      while (isBefore(nextDate, from)) {
        nextDate = addQuarters(nextDate, 1);
      }
      break;

    case "SEMI_ANNUAL":
      while (isBefore(nextDate, from)) {
        nextDate = addMonths(nextDate, 6);
      }
      break;

    case "ANNUAL":
      while (isBefore(nextDate, from)) {
        nextDate = addYears(nextDate, 1);
      }
      break;

    default:
      return null;
  }

  // Check if next date is past end date
  if (bill.endDate && isAfter(nextDate, startOfDay(bill.endDate))) {
    return null;
  }

  return nextDate;
}

/**
 * Calculate monthly due date handling month-end edge cases
 */
function calculateMonthlyDueDate(fromDate: Date, dayOfMonth: number): Date {
  const from = startOfDay(fromDate);
  let year = from.getFullYear();
  let month = from.getMonth();

  // Start with current month
  let dueDate = createDateWithDay(year, month, dayOfMonth);

  // If due date is in the past, move to next month
  if (isBefore(dueDate, from) || dueDate.getTime() === from.getTime()) {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    dueDate = createDateWithDay(year, month, dayOfMonth);
  }

  return dueDate;
}

/**
 * Create a date with specific day of month, handling month-end cases
 */
function createDateWithDay(year: number, month: number, dayOfMonth: number): Date {
  // Get last day of the month
  const lastDay = endOfMonth(new Date(year, month, 1)).getDate();

  // Use the minimum of requested day and last day of month
  const day = Math.min(dayOfMonth, lastDay);

  return startOfDay(new Date(year, month, day));
}

/**
 * Generate upcoming payment instances for a bill
 */
export function generateUpcomingPayments(
  bill: Bill,
  numberOfPayments: number = 6
): UpcomingPayment[] {
  const payments: UpcomingPayment[] = [];
  let currentDate = new Date();

  for (let i = 0; i < numberOfPayments; i++) {
    const nextDueDate = calculateNextDueDate(bill, currentDate);

    if (!nextDueDate) {
      break; // No more payments (bill ended or one-time bill)
    }

    payments.push({
      dueDate: nextDueDate,
      amount: bill.amount,
    });

    // Move to day after this due date for next calculation
    currentDate = addDays(nextDueDate, 1);
  }

  return payments;
}

/**
 * Check if a bill payment is due today
 */
export function isDueToday(payment: BillPayment): boolean {
  const today = startOfDay(new Date());
  const dueDate = startOfDay(payment.dueDate);
  return today.getTime() === dueDate.getTime();
}

/**
 * Check if a bill payment is overdue
 */
export function isOverdue(payment: BillPayment): boolean {
  if (payment.status === "PAID") {
    return false;
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(payment.dueDate);
  return isBefore(dueDate, today);
}

/**
 * Check if a reminder should be sent for a payment
 */
export function shouldSendReminder(
  payment: BillPayment,
  reminderDaysBefore: number
): boolean {
  if (payment.status === "PAID" || payment.reminderSent) {
    return false;
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(payment.dueDate);
  const daysUntilDue = differenceInDays(dueDate, today);

  // Send reminder if within the reminder window
  return daysUntilDue >= 0 && daysUntilDue <= reminderDaysBefore;
}

/**
 * Get days until due (negative if overdue)
 */
export function getDaysUntilDue(payment: BillPayment): number {
  const today = startOfDay(new Date());
  const dueDate = startOfDay(payment.dueDate);
  return differenceInDays(dueDate, today);
}

/**
 * Calculate all due dates for a year
 */
export function calculateAnnualDueDates(bill: Bill): Date[] {
  const dueDates: Date[] = [];
  const startDate = new Date();
  const endDate = addYears(startDate, 1);

  let currentDate = startDate;

  while (isBefore(currentDate, endDate)) {
    const nextDueDate = calculateNextDueDate(bill, currentDate);

    if (!nextDueDate || isAfter(nextDueDate, endDate)) {
      break;
    }

    dueDates.push(nextDueDate);
    currentDate = addDays(nextDueDate, 1);
  }

  return dueDates;
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
 * Calculate bill status based on due date and payment status
 */
export function calculateBillStatus(payment: BillPayment): BillStatus {
  if (payment.status === "PAID" || payment.status === "CANCELLED") {
    return payment.status;
  }

  const daysUntilDue = getDaysUntilDue(payment);

  if (daysUntilDue < 0) {
    return "OVERDUE";
  } else if (daysUntilDue <= 7) {
    return "DUE_SOON";
  } else {
    return "UPCOMING";
  }
}
