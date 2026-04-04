import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        location: true,
        skill: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignments: {
          include: {
            assigned: {
              select: { id: true, name: true, email: true },
            },
            assigner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Failed to fetch shift:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userRole = session?.user?.role;
    if (!session?.user || !userRole || !["admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { locationId, skillId, date, startTime, endTime, headcount, cutoffHours } = body;

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        ...(locationId && { location_id: locationId }),
        ...(skillId && { skill_id: skillId }),
        ...(date && { date: new Date(date) }),
        ...(startTime && { start_time: startTime }),
        ...(endTime && { end_time: endTime }),
        ...(headcount !== undefined && { headcount }),
        ...(cutoffHours !== undefined && { cutoff_hours: cutoffHours }),
      },
      include: {
        location: true,
        skill: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignments: {
          include: {
            assigned: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Failed to update shift:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userRole = session?.user?.role;
    if (!session?.user || !userRole || !["admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.shift.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete shift:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
