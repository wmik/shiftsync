import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        certifications: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            skill: true,
          },
        },
        manager_locations: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        shifts: {
          where: {
            date: { gte: new Date() },
          },
          orderBy: { date: "asc" },
          take: 10,
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Failed to fetch location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
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
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, address, timezone } = body;

    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(timezone && { timezone }),
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Failed to update location:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Location with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update location" },
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
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete location:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    if ((error as { code?: string }).code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete location with associated shifts or certifications" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
