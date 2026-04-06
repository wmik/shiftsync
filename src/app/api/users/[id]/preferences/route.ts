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
    const { emailNotifications, desiredHoursMin, desiredHoursMax } = body;

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { preferences: true, desired_hours_min: true, desired_hours_max: true },
    });

    const currentPrefs = (currentUser?.preferences as Record<string, boolean> | null) || {
      emailNotifications: true,
    };

    const updateData: Record<string, unknown> = {
      preferences: {
        ...currentPrefs,
        emailNotifications: emailNotifications !== undefined ? Boolean(emailNotifications) : currentPrefs.emailNotifications,
      },
    };

    if (desiredHoursMin !== undefined) {
      updateData.desired_hours_min = Math.max(0, Math.min(60, parseInt(desiredHoursMin) || 0));
    }

    if (desiredHoursMax !== undefined) {
      updateData.desired_hours_max = Math.max(0, Math.min(60, parseInt(desiredHoursMax) || 40));
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        timezone: true,
        desired_hours_min: true,
        desired_hours_max: true,
        preferences: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

export async function GET(
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        timezone: true,
        desired_hours_min: true,
        desired_hours_max: true,
        preferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to fetch preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}
