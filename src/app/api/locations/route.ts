import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { certifications: true, manager_locations: true },
        },
      },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, timezone } = body;

    if (!name || !address || !timezone) {
      return NextResponse.json(
        { error: "Name, address, and timezone are required" },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        name,
        address,
        timezone,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Failed to create location:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Location with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
