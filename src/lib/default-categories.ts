export const DEFAULT_CATEGORIES = [
  // Income
  { name: "Salary", icon: "💰", color: "#10B981", type: "income" },
  { name: "Freelance", icon: "💼", color: "#059669", type: "income" },
  { name: "Investments", icon: "📈", color: "#34D399", type: "income" },
  { name: "Other Income", icon: "💵", color: "#6EE7B7", type: "income" },

  // Essential Expenses
  { name: "Housing", icon: "🏠", color: "#EF4444", type: "expense" },
  { name: "Groceries", icon: "🛒", color: "#F97316", type: "expense" },
  { name: "Utilities", icon: "💡", color: "#F59E0B", type: "expense" },
  { name: "Transportation", icon: "🚗", color: "#FBBF24", type: "expense" },
  { name: "Healthcare", icon: "🏥", color: "#DC2626", type: "expense" },
  { name: "Insurance", icon: "🛡️", color: "#B91C1C", type: "expense" },

  // Lifestyle
  { name: "Dining Out", icon: "🍽️", color: "#8B5CF6", type: "expense" },
  { name: "Entertainment", icon: "🎬", color: "#A78BFA", type: "expense" },
  { name: "Shopping", icon: "🛍️", color: "#C084FC", type: "expense" },
  { name: "Subscriptions", icon: "📱", color: "#E9D5FF", type: "expense" },
  { name: "Travel", icon: "✈️", color: "#06B6D4", type: "expense" },
  { name: "Fitness", icon: "💪", color: "#0EA5E9", type: "expense" },

  // Financial
  { name: "Savings", icon: "🏦", color: "#3B82F6", type: "expense" },
  { name: "Investments", icon: "📊", color: "#2563EB", type: "expense" },
  { name: "Debt Payment", icon: "💳", color: "#1D4ED8", type: "expense" },

  // Other
  { name: "Education", icon: "📚", color: "#EC4899", type: "expense" },
  { name: "Gifts & Donations", icon: "🎁", color: "#F472B6", type: "expense" },
  { name: "Pets", icon: "🐾", color: "#FB923C", type: "expense" },
  { name: "Personal Care", icon: "💅", color: "#FB7185", type: "expense" },
  { name: "Other", icon: "📦", color: "#94A3B8", type: "expense" },
];

export async function seedDefaultCategories(userId: string, prisma: any) {
  const existingCategories = await prisma.category.count({
    where: { userId },
  });

  // Only seed if user has no categories
  if (existingCategories === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        userId,
        isSystem: false,
      })),
    });
  }
}
