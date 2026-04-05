import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createNotification, NOTIFICATION_MESSAGES } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");

    const userRole = session.user.role;
    const userId = session.user.id;

    let where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (locationId) {
      where = {
        ...where,
        shift: { location_id: locationId },
      };
    }

    if (userRole !== "admin") {
      where = {
        ...where,
        OR: [
          { requester_user_id: userId },
          { target_user_id: userId },
        ],
      };
    }

    const requests = await prisma.swap_request.findMany({
      where,
      include: {
        shift: {
          include: {
            location: true,
            skill: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
        target: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch swap requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch swap requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { shiftId, targetUserId } = body;

    if (!shiftId || !targetUserId) {
      return NextResponse.json(
        { error: "Shift ID and target user ID are required" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        location: true,
        skill: true,
        assignments: {
          where: { status: "CONFIRMED" },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const userAssignment = shift.assignments.find(
      (a) => a.user_id === session.user.id
    );

    if (!userAssignment) {
      return NextResponse.json(
        { error: "You are not assigned to this shift" },
        { status: 403 }
      );
    }

    const pendingCount = await prisma.swap_request.count({
      where: {
        requester_user_id: session.user.id,
        status: "PENDING",
      },
    });

    if (pendingCount >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 pending swap requests allowed" },
        { status: 400 }
      );
    }

    const swapRequest = await prisma.swap_request.create({
      data: {
        requester_shift_id: shiftId,
        requester_user_id: session.user.id,
        target_user_id: targetUserId,
        status: "PENDING",
      },
      include: {
        shift: {
          include: {
            location: true,
            skill: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
        target: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const shiftDetails = `${shift.location.name} - ${shift.date.toLocaleDateString()} ${shift.start_time}-${shift.end_time}`;
    await createNotification({
      userId: targetUserId,
      type: "SWAP_REQUEST",
      message: NOTIFICATION_MESSAGES.SWAP_REQUEST(session.user.name || "Someone", shiftDetails),
    });

    return NextResponse.json(swapRequest, { status: 201 });
  } catch (error) {
    console.error("Failed to create swap request:", error);
    return NextResponse.json(
      { error: "Failed to create swap request" },
      { status: 500 }
    );
  }
}
