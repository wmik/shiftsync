import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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
      is_published: true,
    };

    if (locationId) {
      whereClause.location_id = locationId;
    } else if (userRole === "manager") {
      whereClause.location_id = { in: managerLocationIds };
    }

    const publishedShifts = await prisma.shift.findMany({
      where: whereClause,
    });

    if (publishedShifts.length === 0) {
      return NextResponse.json({
        message: "No published shifts found for this week",
        unpublished: 0,
      });
    }

    await prisma.shift.updateMany({
      where: { id: { in: publishedShifts.map((s) => s.id) } },
      data: { is_published: false },
    });

    return NextResponse.json({
      success: true,
      unpublished: publishedShifts.length,
    });
  } catch (error) {
    console.error("Failed to unpublish week:", error);
    return NextResponse.json(
      { error: "Failed to unpublish week schedule" },
      { status: 500 }
    );
  }
}
