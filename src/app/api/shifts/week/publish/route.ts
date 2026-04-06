import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createBulkNotifications } from "@/lib/notifications";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userRole = session?.user?.role;
    if (!session?.user || !userRole || !["admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { weekStartDate, locationId } = body;

    if (!weekStartDate) {
      return NextResponse.json({ error: "Week start date is required" }, { status: 400 });
    }

    const startDate = new Date(weekStartDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    let managerLocationIds: string[] = [];
    
    if (userRole === "manager" && !locationId) {
      const managerLocations = await prisma.manager_location.findMany({
        where: { user_id: session.user.id },
        select: { location_id: true },
      });
      managerLocationIds = managerLocations.map((ml) => ml.location_id);
      
      if (managerLocationIds.length === 0) {
        return NextResponse.json({ error: "No locations assigned to this manager" }, { status: 400 });
      }
    }

    const whereClause: Record<string, unknown> = {
      date: { gte: startDate, lt: endDate },
      is_published: false,
    };

    if (locationId) {
      whereClause.location_id = locationId;
    } else if (userRole === "manager") {
      whereClause.location_id = { in: managerLocationIds };
    }

    const unpublishedShifts = await prisma.shift.findMany({
      where: whereClause,
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
    });

    if (unpublishedShifts.length === 0) {
      return NextResponse.json({
        message: "No unpublished shifts found for this week",
        published: 0,
        notified: 0,
      });
    }

    await prisma.shift.updateMany({
      where: { id: { in: unpublishedShifts.map((s) => s.id) } },
      data: { is_published: true },
    });

    const notifications = unpublishedShifts
      .filter((shift) => shift.assignments.length > 0)
      .flatMap((shift) =>
        shift.assignments.map((assignment) => ({
          userId: assignment.assigned.id,
          type: "SHIFT_PUBLISHED" as const,
          message: `Schedule published for ${shift.location.name}: ${shift.date.toLocaleDateString()} ${shift.start_time}-${shift.end_time}`,
        }))
      );

    if (notifications.length > 0) {
      await createBulkNotifications(notifications);
    }

    return NextResponse.json({
      success: true,
      published: unpublishedShifts.length,
      notified: notifications.length,
      shifts: unpublishedShifts.map((s) => ({
        id: s.id,
        date: s.date,
        location: s.location.name,
        skill: s.skill.name,
        assignments: s.assignments.length,
      })),
    });
  } catch (error) {
    console.error("Failed to publish week:", error);
    return NextResponse.json(
      { error: "Failed to publish week schedule" },
      { status: 500 }
    );
  }
}
