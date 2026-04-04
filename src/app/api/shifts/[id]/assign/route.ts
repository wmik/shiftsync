import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateAssignment, suggestAlternatives } from "@/lib/constraints";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userRole = session?.user?.role;
    if (!session?.user || !userRole || !["admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const shift = await prisma.shift.findUnique({
      where: { id },
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const violations = await validateAssignment(
      userId,
      shift.location_id,
      shift.skill_id,
      shift.date,
      shift.start_time,
      shift.end_time,
      id
    );

    if (violations.length > 0) {
      const alternatives = await suggestAlternatives(
        shift.location_id,
        shift.skill_id,
        shift.date,
        shift.start_time,
        shift.end_time
      );
      return NextResponse.json(
        {
          error: "Assignment validation failed",
          violations: violations.map((v) => v.message),
          suggestions: alternatives,
        },
        { status: 400 }
      );
    }

    const assignment = await prisma.shift_assignment.create({
      data: {
        shift_id: id,
        user_id: userId,
        assigned_by: session.user.id,
        status: "CONFIRMED",
      },
      include: {
        assigned: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Failed to assign shift:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "User already assigned to this shift" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to assign shift" },
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
    const userRole = session?.user?.role;
    if (!session?.user || !userRole || !["admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    await prisma.shift_assignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove assignment:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to remove assignment" },
      { status: 500 }
    );
  }
}
