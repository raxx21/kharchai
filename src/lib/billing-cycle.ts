import { addMonths, setDate, isAfter, isBefore, startOfDay } from "date-fns";

export interface BillingCycleConfig {
  billingCycleStartDate: number; // 1-31
  billingCycleEndDate: number; // 1-31
  paymentDueDay: number; // 1-31
}

export interface BillingCycle {
  cycleStartDate: Date;
  cycleEndDate: Date;
  dueDate: Date;
}

/**
 * Generate a billing cycle for a specific month
 */
export function generateBillingCycle(
  config: BillingCycleConfig,
  referenceDate: Date = new Date()
): BillingCycle {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  // Start date
  let cycleStartDate = startOfDay(setDate(new Date(year, month, 1), config.billingCycleStartDate));

  // End date - might be in the next month
  let cycleEndDate: Date;
  if (config.billingCycleEndDate < config.billingCycleStartDate) {
    // Cycle spans two months (e.g., 25th to 24th)
    cycleEndDate = startOfDay(
      setDate(addMonths(new Date(year, month, 1), 1), config.billingCycleEndDate)
    );
  } else {
    // Cycle within same month
    cycleEndDate = startOfDay(setDate(new Date(year, month, 1), config.billingCycleEndDate));
  }

  // Due date - typically after the cycle end date
  let dueDate: Date;
  if (config.paymentDueDay < config.billingCycleEndDate) {
    // Due date is in the next month
    dueDate = startOfDay(
      setDate(addMonths(cycleEndDate, 1), config.paymentDueDay)
    );
  } else {
    // Due date is in the same month as cycle end
    const potentialDueDate = startOfDay(
      setDate(new Date(cycleEndDate.getFullYear(), cycleEndDate.getMonth(), 1), config.paymentDueDay)
    );

    if (isAfter(potentialDueDate, cycleEndDate) || potentialDueDate.getTime() === cycleEndDate.getTime()) {
      dueDate = potentialDueDate;
    } else {
      dueDate = startOfDay(setDate(addMonths(cycleEndDate, 1), config.paymentDueDay));
    }
  }

  return {
    cycleStartDate,
    cycleEndDate,
    dueDate,
  };
}

/**
 * Generate billing cycles for the next N months
 */
export function generateUpcomingCycles(
  config: BillingCycleConfig,
  numberOfMonths: number = 6
): BillingCycle[] {
  const cycles: BillingCycle[] = [];
  const today = new Date();

  for (let i = 0; i < numberOfMonths; i++) {
    const referenceDate = addMonths(today, i);
    cycles.push(generateBillingCycle(config, referenceDate));
  }

  return cycles;
}

/**
 * Get the current active billing cycle
 */
export function getCurrentBillingCycle(
  config: BillingCycleConfig
): BillingCycle {
  const today = startOfDay(new Date());

  // Try current month
  let cycle = generateBillingCycle(config, today);

  // If today is before the cycle start, get previous month's cycle
  if (isBefore(today, cycle.cycleStartDate)) {
    cycle = generateBillingCycle(config, addMonths(today, -1));
  }

  // If today is after the cycle end, get next month's cycle
  if (isAfter(today, cycle.cycleEndDate)) {
    cycle = generateBillingCycle(config, addMonths(today, 1));
  }

  return cycle;
}

/**
 * Check if a date falls within a billing cycle
 */
export function isDateInCycle(date: Date, cycle: BillingCycle): boolean {
  const checkDate = startOfDay(date);
  return (
    (isAfter(checkDate, cycle.cycleStartDate) ||
      checkDate.getTime() === cycle.cycleStartDate.getTime()) &&
    (isBefore(checkDate, cycle.cycleEndDate) ||
      checkDate.getTime() === cycle.cycleEndDate.getTime())
  );
}

/**
 * Format billing cycle as string (e.g., "Jan 25 - Feb 24")
 */
export function formatBillingCycle(cycle: BillingCycle): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = cycle.cycleStartDate.toLocaleDateString("en-US", options);
  const end = cycle.cycleEndDate.toLocaleDateString("en-US", options);
  return `${start} - ${end}`;
}
