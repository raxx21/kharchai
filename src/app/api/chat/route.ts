import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// POST /api/chat - Send a message and get AI response
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = messageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { message } = validation.data;
    const userId = session.user.id;

    // Fetch user's financial context
    const context = await getFinancialContext(userId);

    // Get recent chat history for context
    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Build conversation history
    const conversationHistory = recentMessages
      .reverse()
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    // Add current user message
    conversationHistory.push({
      role: "user",
      content: message,
    });

    // Create system prompt with financial context
    const systemPrompt = `You are a helpful financial assistant for a budget tracking app. You have access to the user's financial data and can provide personalized advice.

**User's Financial Overview:**
${context.summary}

**Recent Transactions (last 10):**
${context.recentTransactions}

**Active Budgets:**
${context.budgets}

**Upcoming Bills:**
${context.upcomingBills}

**Guidelines:**
- Provide helpful, actionable financial advice
- Use the user's actual data when answering questions
- Be concise but informative
- Format monetary amounts with ₹ symbol
- Suggest specific actions when appropriate (e.g., "You can create a budget by going to the Budgets page")
- If asked about data you don't have, politely explain what data is available`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationHistory,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Store user message
    await prisma.chatMessage.create({
      data: {
        userId,
        role: "user",
        content: message,
        contextData: {
          timestamp: new Date().toISOString(),
          messageCount: conversationHistory.length,
        },
      },
    });

    // Store assistant response
    await prisma.chatMessage.create({
      data: {
        userId,
        role: "assistant",
        content: assistantMessage,
        contextData: {
          model: "claude-3-5-sonnet-20241022",
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      message: assistantMessage,
      success: true,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// Helper function to get financial context
async function getFinancialContext(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get recent transactions
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { transactionDate: "desc" },
    take: 10,
    include: {
      category: true,
      bank: true,
    },
  });

  // Get budgets
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
    },
    include: {
      category: true,
    },
  });

  // Get upcoming bills
  const bills = await prisma.bill.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      category: true,
      payments: {
        where: {
          status: {
            in: ["UPCOMING", "DUE_SOON"],
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: 5,
      },
    },
  });

  // Calculate summary statistics
  const monthlyTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: startOfMonth,
      },
    },
  });

  const totalIncome = monthlyTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const totalExpenses = monthlyTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const totalBudgeted = budgets.reduce(
    (sum, b) => sum + parseFloat(b.amount.toString()),
    0
  );

  // Format context
  const summary = `
- Total Income (this month): ₹${totalIncome.toLocaleString()}
- Total Expenses (this month): ₹${totalExpenses.toLocaleString()}
- Net Savings: ₹${(totalIncome - totalExpenses).toLocaleString()}
- Total Budgeted: ₹${totalBudgeted.toLocaleString()}
- Active Budgets: ${budgets.length}
- Active Bills: ${bills.length}
  `.trim();

  const recentTransactions =
    transactions.length > 0
      ? transactions
          .map(
            (t) =>
              `- ${t.type}: ₹${parseFloat(t.amount.toString()).toLocaleString()} - ${t.description} (${t.category?.name || "Uncategorized"})`
          )
          .join("\n")
      : "No recent transactions";

  const budgetsList =
    budgets.length > 0
      ? budgets
          .map(
            (b) =>
              `- ${b.category.name}: ₹${parseFloat(b.amount.toString()).toLocaleString()} (${b.period})`
          )
          .join("\n")
      : "No active budgets";

  const upcomingBillsList =
    bills.length > 0 && bills.some((b) => b.payments.length > 0)
      ? bills
          .filter((b) => b.payments.length > 0)
          .map(
            (b) =>
              `- ${b.name}: ₹${parseFloat(b.amount.toString()).toLocaleString()} - Due: ${new Date(b.payments[0].dueDate).toLocaleDateString()}`
          )
          .join("\n")
      : "No upcoming bills";

  return {
    summary,
    recentTransactions,
    budgets: budgetsList,
    upcomingBills: upcomingBillsList,
  };
}
