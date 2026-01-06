import { PrismaClient } from "@prisma/client";
import { generateUpcomingPayments } from "../src/lib/services/bill-recurrence-calculator.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting to seed sample bills...");

  // Get the authenticated user
  const user = await prisma.user.findFirst();

  if (!user) {
    console.error("❌ No user found. Please sign up first.");
    return;
  }

  console.log(`✅ Found user: ${user.email}`);

  // Get or create default bank
  let bank = await prisma.bank.findFirst({
    where: {
      userId: user.id,
      type: "BANK",
    },
  });

  if (!bank) {
    bank = await prisma.bank.create({
      data: {
        userId: user.id,
        name: "Sample Bank",
        type: "BANK",
        color: "#3B82F6",
        icon: "🏦",
      },
    });
    console.log("✅ Created sample bank");
  }

  // Get existing categories
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
  });

  if (categories.length === 0) {
    console.error("❌ No categories found. Please create categories first.");
    return;
  }

  console.log(`✅ Found ${categories.length} categories`);

  // Helper to find category by name
  const findCategory = (name: string) =>
    categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()));

  // Delete existing bills for this user to avoid duplicates
  await prisma.bill.deleteMany({
    where: { userId: user.id },
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Sample bills data
  const sampleBills = [
    {
      name: "Internet Bill",
      description: "Monthly broadband internet service",
      billType: "UTILITIES",
      amount: 999,
      categoryName: "utilities",
      recurrence: "MONTHLY",
      startDate: new Date(currentYear, currentMonth, 5),
      dayOfMonth: 5,
      reminderDaysBefore: 3,
    },
    {
      name: "Electricity Bill",
      description: "Monthly electricity charges",
      billType: "UTILITIES",
      amount: 2500,
      categoryName: "utilities",
      recurrence: "MONTHLY",
      startDate: new Date(currentYear, currentMonth, 10),
      dayOfMonth: 10,
      reminderDaysBefore: 5,
    },
    {
      name: "Netflix Subscription",
      description: "Premium plan subscription",
      billType: "SUBSCRIPTION",
      amount: 649,
      categoryName: "entertainment",
      recurrence: "MONTHLY",
      startDate: new Date(currentYear, currentMonth, 1),
      dayOfMonth: 1,
      reminderDaysBefore: 2,
    },
    {
      name: "Spotify Premium",
      description: "Music streaming service",
      billType: "SUBSCRIPTION",
      amount: 119,
      categoryName: "entertainment",
      recurrence: "MONTHLY",
      startDate: new Date(currentYear, currentMonth, 15),
      dayOfMonth: 15,
      reminderDaysBefore: 1,
    },
    {
      name: "House Rent",
      description: "Monthly apartment rent",
      billType: "RENT_MORTGAGE",
      amount: 25000,
      categoryName: "rent",
      recurrence: "MONTHLY",
      startDate: new Date(currentYear, currentMonth, 1),
      dayOfMonth: 1,
      reminderDaysBefore: 7,
    },
    {
      name: "Health Insurance Premium",
      description: "Quarterly health insurance payment",
      billType: "INSURANCE",
      amount: 15000,
      categoryName: "insurance",
      recurrence: "QUARTERLY",
      startDate: new Date(currentYear, currentMonth, 15),
      dayOfMonth: 15,
      reminderDaysBefore: 10,
    },
    {
      name: "Car Insurance",
      description: "Annual car insurance premium",
      billType: "INSURANCE",
      amount: 18000,
      categoryName: "insurance",
      recurrence: "ANNUAL",
      startDate: new Date(currentYear + 1, 0, 1), // January 1st next year
      dayOfMonth: 1,
      reminderDaysBefore: 15,
    },
    {
      name: "Gym Membership",
      description: "Weekly gym membership fee",
      billType: "SUBSCRIPTION",
      amount: 500,
      categoryName: "fitness",
      recurrence: "WEEKLY",
      startDate: new Date(currentYear, currentMonth, now.getDate()),
      dayOfWeek: 1, // Monday
      reminderDaysBefore: 1,
    },
    {
      name: "Medical Checkup",
      description: "Annual health checkup appointment",
      billType: "OTHER",
      amount: 5000,
      categoryName: "health",
      recurrence: "ONE_TIME",
      startDate: new Date(currentYear, currentMonth + 1, 10), // Next month
      reminderDaysBefore: 7,
    },
    {
      name: "Gas Cylinder",
      description: "LPG cylinder refill",
      billType: "UTILITIES",
      amount: 900,
      categoryName: "utilities",
      recurrence: "MONTHLY",
      startDate: new Date(currentYear, currentMonth, 20),
      dayOfMonth: 20,
      reminderDaysBefore: 3,
    },
  ];

  console.log("📝 Creating bills and payment instances...");
  let billCount = 0;
  let paymentCount = 0;

  for (const billData of sampleBills) {
    const category = findCategory(billData.categoryName);
    if (!category) {
      console.warn(`⚠️  Category not found for: ${billData.categoryName}, skipping ${billData.name}`);
      continue;
    }

    // Create the bill
    const bill = await prisma.bill.create({
      data: {
        userId: user.id,
        name: billData.name,
        description: billData.description,
        billType: billData.billType as any,
        amount: billData.amount,
        categoryId: category.id,
        recurrence: billData.recurrence as any,
        startDate: billData.startDate,
        dayOfMonth: billData.dayOfMonth,
        dayOfWeek: billData.dayOfWeek,
        reminderDaysBefore: billData.reminderDaysBefore,
        autoPay: false,
        bankId: bank.id,
        isActive: true,
      },
    });

    billCount++;

    // Generate payment instances (6 upcoming payments for recurring bills)
    const numberOfPayments = billData.recurrence === "ONE_TIME" ? 1 : 6;
    const upcomingPayments = generateUpcomingPayments(bill as any, numberOfPayments);

    for (const payment of upcomingPayments) {
      // Calculate status based on due date
      const daysUntilDue = Math.floor((payment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let status: string;
      if (daysUntilDue < 0) {
        status = "OVERDUE";
      } else if (daysUntilDue <= billData.reminderDaysBefore) {
        status = "DUE_SOON";
      } else {
        status = "UPCOMING";
      }

      await prisma.billPayment.create({
        data: {
          billId: bill.id,
          dueDate: payment.dueDate,
          amount: payment.amount,
          status: status as any,
          reminderSent: false,
        },
      });
      paymentCount++;
    }

    console.log(`   ✅ Created bill: ${billData.name} with ${upcomingPayments.length} payment(s)`);
  }

  console.log(`\n✅ Created ${billCount} bills and ${paymentCount} payment instances`);

  // Generate bill reminders and insights
  console.log("\n🤖 Generating bill reminders and insights...");
  try {
    const { generateAllInsights } = await import("../src/lib/services/insight-generator.js");
    const insightCount = await generateAllInsights(user.id, prisma);
    console.log(`✅ Generated ${insightCount} insights (including bill reminders)`);
  } catch (error) {
    console.error("⚠️  Could not generate insights:", error);
  }

  console.log("\n🎉 Bill data seeded successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - ${billCount} bills created`);
  console.log(`   - ${paymentCount} payment instances generated`);
  console.log(`   - All bills are active and ready for testing`);
  console.log("\n✨ You can now test the Bill Management features!");
  console.log("\n💡 Try:");
  console.log("   - View bills on /bills page");
  console.log("   - See upcoming bills widget on dashboard");
  console.log("   - Mark bills as paid");
  console.log("   - Check bill reminders in Insights");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding bill data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
