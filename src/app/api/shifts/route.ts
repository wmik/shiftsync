import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isPublished = searchParams.get("isPublished");

    const where: Record<string, unknown> = {};

    if (locationId) {
      where.location_id = locationId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (isPublished !== null) {
      where.is_published = isPublished === "true";
    }

    const shifts = await prisma.shift.findMany({
      where,
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
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: [{ date: "asc" }, { start_time: "asc" }],
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userRole = session?.user?.role;
    if (!session?.user || !userRole || !["admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { locationId, skillId, date, startTime, endTime, headcount, cutoffHours } = body;

    if (!locationId || !skillId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Location, skill, date, start time, and end time are required" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.create({
      data: {
        location_id: locationId,
        skill_id: skillId,
        date: new Date(date),
        start_time: startTime,
        end_time: endTime,
        headcount: headcount || 1,
        cutoff_hours: cutoffHours || 48,
        created_by: session.user.id,
      },
      include: {
        location: true,
        skill: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await createAuditLog({
      entityType: "SHIFT",
      entityId: shift.id,
      action: "CREATE",
      userId: session.user.id,
      after: {
        locationId,
        skillId,
        date,
        startTime,
        endTime,
        headcount: shift.headcount,
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Failed to create shift:", error);
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}
