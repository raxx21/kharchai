import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/insights/[id] - Mark as read
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const schema = z.object({
      isRead: z.boolean(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingInsight = await prisma.insight.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingInsight) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      );
    }

    // Update insight
    const insight = await prisma.insight.update({
      where: { id },
      data: {
        isRead: validation.data.isRead,
      },
    });

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Error updating insight:", error);
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: 500 }
    );
  }
}

// DELETE /api/insights/[id] - Delete insight
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const insight = await prisma.insight.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!insight) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      );
    }

    // Delete insight
    await prisma.insight.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Insight deleted successfully" });
  } catch (error) {
    console.error("Error deleting insight:", error);
    return NextResponse.json(
      { error: "Failed to delete insight" },
      { status: 500 }
    );
  }
}
