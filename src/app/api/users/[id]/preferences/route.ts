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

    if (session.user.id !== id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { emailNotifications } = body;

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { preferences: true },
    });

    const currentPrefs = (currentUser?.preferences as Record<string, boolean> | null) || {
      emailNotifications: true,
    };

    const updated = await prisma.user.update({
      where: { id },
      data: {
        preferences: {
          ...currentPrefs,
          emailNotifications: emailNotifications !== undefined ? Boolean(emailNotifications) : currentPrefs.emailNotifications,
        },
      },
      select: {
        id: true,
        preferences: true,
      },
    });

    return NextResponse.json({
      preferences: updated.preferences as Record<string, boolean>,
    });
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
