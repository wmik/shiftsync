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
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        certifications: {
          include: {
            skill: true,
            location: true,
          },
        },
        availability: {
          orderBy: { day_of_week: "asc" },
        },
        availability_exceptions: {
          orderBy: { date: "desc" },
          take: 20,
        },
        manager_locations: {
          include: {
            location: true,
          },
        },
        shift_assignments: {
          where: { status: "CONFIRMED" },
          include: {
            shift: {
              include: {
                location: true,
                skill: true,
              },
            },
          },
          orderBy: {
            shift: { date: "asc" },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to fetch staff member:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff member" },
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
    const { name, timezone, role } = body;

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (timezone) updates.timezone = timezone;

    if (session.user.role === "admin" && role) {
      updates.role = role;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update staff member:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}
