import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBillStats } from "@/lib/utils/bill-helpers";

// GET /api/bills/stats - Get bill statistics
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate statistics
    const stats = await calculateBillStats(session.user.id, prisma);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching bill stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill statistics" },
      { status: 500 }
    );
  }
}
