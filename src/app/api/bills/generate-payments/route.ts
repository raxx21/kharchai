import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUpcomingPayments } from "@/lib/services/bill-reminder-generator";

// POST /api/bills/generate-payments - Generate upcoming payment instances
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate payment instances for all active bills
    const createdCount = await ensureUpcomingPayments(session.user.id, prisma);

    return NextResponse.json({
      message: `Generated ${createdCount} payment instances`,
      count: createdCount,
    });
  } catch (error) {
    console.error("Error generating payments:", error);
    return NextResponse.json(
      { error: "Failed to generate payment instances" },
      { status: 500 }
    );
  }
}
