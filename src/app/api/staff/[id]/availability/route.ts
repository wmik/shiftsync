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
    const availability = await prisma.availability.findMany({
      where: { user_id: id },
      orderBy: { day_of_week: "asc" },
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { availability } = body;

    if (!Array.isArray(availability)) {
      return NextResponse.json(
        { error: "Availability must be an array" },
        { status: 400 }
      );
    }

    await prisma.availability.deleteMany({
      where: { user_id: id },
    });

    if (availability.length > 0) {
      await prisma.availability.createMany({
        data: availability.map((a: { dayOfWeek: number; startTime: string; endTime: string; effectiveFrom?: string; effectiveUntil?: string }) => ({
          user_id: id,
          day_of_week: a.dayOfWeek,
          start_time: a.startTime,
          end_time: a.endTime,
          effective_from: a.effectiveFrom ? new Date(a.effectiveFrom) : null,
          effective_until: a.effectiveUntil ? new Date(a.effectiveUntil) : null,
        })),
      });
    }

    const updated = await prisma.availability.findMany({
      where: { user_id: id },
      orderBy: { day_of_week: "asc" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update availability:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}
