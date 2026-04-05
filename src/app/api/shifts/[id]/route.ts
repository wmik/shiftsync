import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createNotification, NOTIFICATION_MESSAGES } from "@/lib/notifications";

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

    const pendingSwaps = await prisma.swap_request.findMany({
      where: {
        requester_shift_id: id,
        status: "PENDING_APPROVAL",
      },
      include: {
        requester: { select: { id: true, name: true } },
        target: { select: { id: true, name: true } },
      },
    });

    if (pendingSwaps.length > 0) {
      const shiftDetails = `${shift.location.name} - ${shift.date.toLocaleDateString()} ${shift.start_time}-${shift.end_time}`;
      
      await prisma.swap_request.updateMany({
        where: {
          requester_shift_id: id,
          status: "PENDING_APPROVAL",
        },
        data: { status: "CANCELLED" },
      });

      for (const swap of pendingSwaps) {
        await createNotification({
          userId: swap.requester.id,
          type: "SWAP_CANCELLED",
          message: NOTIFICATION_MESSAGES.SWAP_CANCELLED(swap.requester.name, shiftDetails),
        });
        await createNotification({
          userId: swap.target.id,
          type: "SWAP_CANCELLED",
          message: NOTIFICATION_MESSAGES.SWAP_CANCELLED(swap.target.name, shiftDetails),
        });
      }
    }

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
