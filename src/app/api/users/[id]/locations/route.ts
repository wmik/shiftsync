import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { locationIds } = body;

    if (!Array.isArray(locationIds)) {
      return NextResponse.json({ error: "locationIds must be an array" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.manager_location.deleteMany({
        where: { user_id: id },
      });

      if (locationIds.length > 0) {
        await tx.manager_location.createMany({
          data: locationIds.map((locationId: string) => ({
            user_id: id,
            location_id: locationId,
          })),
        });
      }
    });

    const locations = await prisma.manager_location.findMany({
      where: { user_id: id },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      locations.map((ml) => ({
        id: ml.location.id,
        name: ml.location.name,
      }))
    );
  } catch (error) {
    console.error("Failed to update manager locations:", error);
    return NextResponse.json({ error: "Failed to update locations" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const locations = await prisma.manager_location.findMany({
      where: { user_id: id },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      locations.map((ml) => ({
        id: ml.location.id,
        name: ml.location.name,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch manager locations:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}
