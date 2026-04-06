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
          { shift: { assignments: { some: { user_id: userId } } } },
          { claimed_by_user_id: userId },
        ],
      };
    }

    const requests = await prisma.drop_request.findMany({
      where,
      include: {
        shift: {
          include: {
            location: true,
            skill: true,
            assignments: {
              where: { status: "CONFIRMED" },
              include: {
                assigned: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        requested_by: {
          select: { id: true, name: true, email: true },
        },
        claimed_by: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch drop requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch drop requests" },
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
    const { shiftId } = body;

    if (!shiftId) {
      return NextResponse.json(
        { error: "Shift ID is required" },
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

    const pendingCount = await prisma.drop_request.count({
      where: {
        requested_by_user_id: session.user.id,
        status: { in: ["OPEN", "CLAIMED"] },
      },
    });

    if (pendingCount >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 pending drop requests allowed" },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const dropRequest = await prisma.drop_request.create({
      data: {
        shift_id: shiftId,
        requested_by_user_id: session.user.id,
        status: "OPEN",
        expires_at: expiresAt,
      },
      include: {
        shift: {
          include: {
            location: true,
            skill: true,
          },
        },
      },
    });

    const shiftDetails = `${shift.location.name} - ${shift.date.toLocaleDateString()} ${shift.start_time}-${shift.end_time}`;
    await createNotification({
      userId: session.user.id,
      type: "DROP_REQUEST",
      message: NOTIFICATION_MESSAGES.DROP_REQUEST(session.user.name || "You", shiftDetails),
    });

    return NextResponse.json(dropRequest, { status: 201 });
  } catch (error) {
    console.error("Failed to create drop request:", error);
    return NextResponse.json(
      { error: "Failed to create drop request" },
      { status: 500 }
    );
  }
}
