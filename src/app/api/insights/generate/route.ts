import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAllInsights } from "@/lib/services/insight-generator";

// POST /api/insights/generate - Manually trigger insight generation
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate insights for the user
    const insightsCount = await generateAllInsights(session.user.id, prisma);

    return NextResponse.json({
      message: `Generated ${insightsCount} insights`,
      count: insightsCount,
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
