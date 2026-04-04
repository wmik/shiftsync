import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
