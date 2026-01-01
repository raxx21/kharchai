import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting to seed sample data...");

  // Get the authenticated user (you'll need to replace this with actual user ID)
  const user = await prisma.user.findFirst();

  if (!user) {
    console.error("❌ No user found. Please sign up first.");
    return;
  }

  console.log(`✅ Found user: ${user.email}`);

  // Get or create default bank
  let bank = await prisma.bank.findFirst({
    where: { userId: user.id },
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

  // Get current date and start of month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  console.log(`📅 Generating data for ${startOfMonth.toLocaleDateString()} to ${now.toLocaleDateString()}`);

  // Sample transactions data
  const sampleTransactions = [
    // Income
    { category: "salary", amount: 75000, description: "Monthly Salary", type: "INCOME", day: 1 },
    { category: "freelance", amount: 15000, description: "Freelance Project", type: "INCOME", day: 15 },

    // Groceries - Multiple small transactions (will exceed budget)
    { category: "groceries", amount: 2500, description: "BigBasket Order", type: "EXPENSE", day: 3 },
    { category: "groceries", amount: 1800, description: "Local Grocery Store", type: "EXPENSE", day: 7 },
    { category: "groceries", amount: 2200, description: "Fresh Vegetables & Fruits", type: "EXPENSE", day: 11 },
    { category: "groceries", amount: 1500, description: "Milk & Bread", type: "EXPENSE", day: 14 },
    { category: "groceries", amount: 2000, description: "Monthly Provisions", type: "EXPENSE", day: 18 },
    { category: "groceries", amount: 1200, description: "Weekend Shopping", type: "EXPENSE", day: 22 },
    { category: "groceries", amount: 1800, description: "Party Supplies", type: "EXPENSE", day: 25 },

    // Dining - Will be in warning zone
    { category: "dining", amount: 1200, description: "Dinner at Restaurant", type: "EXPENSE", day: 2 },
    { category: "dining", amount: 800, description: "Lunch with Colleagues", type: "EXPENSE", day: 5 },
    { category: "dining", amount: 1500, description: "Weekend Brunch", type: "EXPENSE", day: 9 },
    { category: "dining", amount: 950, description: "Pizza Night", type: "EXPENSE", day: 13 },
    { category: "dining", amount: 1100, description: "Anniversary Dinner", type: "EXPENSE", day: 19 },
    { category: "dining", amount: 650, description: "Coffee & Snacks", type: "EXPENSE", day: 23 },

    // Shopping - On track
    { category: "shopping", amount: 3500, description: "New Shirt & Jeans", type: "EXPENSE", day: 6 },
    { category: "shopping", amount: 1200, description: "Online Shopping - Amazon", type: "EXPENSE", day: 12 },
    { category: "shopping", amount: 800, description: "Shoes", type: "EXPENSE", day: 20 },

    // Transportation
    { category: "transport", amount: 500, description: "Metro Card Recharge", type: "EXPENSE", day: 1 },
    { category: "transport", amount: 350, description: "Uber to Office", type: "EXPENSE", day: 4 },
    { category: "transport", amount: 450, description: "Cab Rides", type: "EXPENSE", day: 10 },
    { category: "transport", amount: 600, description: "Fuel for Car", type: "EXPENSE", day: 16 },
    { category: "transport", amount: 400, description: "Auto Rickshaw", type: "EXPENSE", day: 21 },

    // Entertainment
    { category: "entertainment", amount: 800, description: "Movie Tickets", type: "EXPENSE", day: 8 },
    { category: "entertainment", amount: 1500, description: "Concert Tickets", type: "EXPENSE", day: 15 },
    { category: "entertainment", amount: 500, description: "Netflix Subscription", type: "EXPENSE", day: 1 },
    { category: "entertainment", amount: 600, description: "Gaming Purchase", type: "EXPENSE", day: 24 },

    // Utilities
    { category: "utilities", amount: 2500, description: "Electricity Bill", type: "EXPENSE", day: 5 },
    { category: "utilities", amount: 1200, description: "Internet & Phone Bill", type: "EXPENSE", day: 10 },
    { category: "utilities", amount: 800, description: "Water Bill", type: "EXPENSE", day: 8 },

    // Healthcare
    { category: "health", amount: 1500, description: "Doctor Consultation", type: "EXPENSE", day: 11 },
    { category: "health", amount: 850, description: "Medicines", type: "EXPENSE", day: 12 },
    { category: "health", amount: 2500, description: "Dental Checkup", type: "EXPENSE", day: 17 },

    // Education - Unusual large transaction
    { category: "education", amount: 15000, description: "Online Course Enrollment", type: "EXPENSE", day: 14 },

    // Fitness
    { category: "fitness", amount: 3000, description: "Gym Membership", type: "EXPENSE", day: 1 },
    { category: "fitness", amount: 500, description: "Protein Supplements", type: "EXPENSE", day: 18 },

    // Travel - Large unusual expense
    { category: "travel", amount: 18000, description: "Weekend Trip to Goa", type: "EXPENSE", day: 22 },

    // Insurance
    { category: "insurance", amount: 5000, description: "Health Insurance Premium", type: "EXPENSE", day: 5 },
  ];

  // Create transactions
  console.log("📝 Creating transactions...");
  let transactionCount = 0;

  for (const tx of sampleTransactions) {
    const category = findCategory(tx.category);
    if (!category) continue;

    const transactionDate = new Date(now.getFullYear(), now.getMonth(), tx.day);

    // Only create if date is not in future
    if (transactionDate <= now) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          bankId: bank.id,
          categoryId: category.id,
          amount: tx.amount,
          currency: "INR",
          description: tx.description,
          type: tx.type as "INCOME" | "EXPENSE",
          transactionDate,
        },
      });
      transactionCount++;
    }
  }

  console.log(`✅ Created ${transactionCount} transactions`);

  // Delete existing budgets for this user to avoid duplicates
  await prisma.budget.deleteMany({
    where: { userId: user.id },
  });

  // Create monthly budgets
  console.log("💰 Creating budgets...");
  const budgets = [
    { category: "groceries", amount: 10000 }, // Will be exceeded
    { category: "dining", amount: 7000 },     // Will be in warning zone
    { category: "shopping", amount: 10000 },  // On track
    { category: "transport", amount: 3000 },  // On track
    { category: "entertainment", amount: 5000 }, // On track
    { category: "utilities", amount: 5000 },  // On track
    { category: "health", amount: 8000 },     // On track
    { category: "fitness", amount: 5000 },    // On track
    { category: "travel", amount: 15000 },    // Warning zone
    { category: "education", amount: 20000 }, // On track
  ];

  let budgetCount = 0;
  for (const budget of budgets) {
    const category = findCategory(budget.category);
    if (!category) continue;

    await prisma.budget.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        amount: budget.amount,
        period: "MONTHLY",
        startDate: startOfMonth,
        endDate: null, // Ongoing
      },
    });
    budgetCount++;
  }

  console.log(`✅ Created ${budgetCount} budgets`);

  // Generate insights
  console.log("🤖 Generating insights...");
  try {
    const { generateAllInsights } = await import("../src/lib/services/insight-generator.js");
    const insightCount = await generateAllInsights(user.id, prisma);
    console.log(`✅ Generated ${insightCount} insights`);
  } catch (error) {
    console.error("⚠️  Could not generate insights:", error);
  }

  console.log("\n🎉 Sample data seeded successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - ${transactionCount} transactions created`);
  console.log(`   - ${budgetCount} budgets created`);
  console.log(`   - Period: ${startOfMonth.toLocaleDateString()} to ${now.toLocaleDateString()}`);
  console.log("\n✨ You can now test the Budget & Analytics features!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
