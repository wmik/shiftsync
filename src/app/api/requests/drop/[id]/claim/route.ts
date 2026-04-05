import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateAssignment, suggestAlternatives } from "@/lib/constraints";
import type { ConstraintViolation } from "@/types";
import { createNotification, NOTIFICATION_MESSAGES } from "@/lib/notifications";

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
    const { action } = body;

    if (!["CLAIM", "CANCEL"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be CLAIM or CANCEL" },
        { status: 400 }
      );
    }

    const dropRequest = await prisma.drop_request.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            location: true,
            skill: true,
            assignments: {
              where: { status: "CONFIRMED" },
            },
          },
        },
      },
    });

    if (!dropRequest) {
      return NextResponse.json({ error: "Drop request not found" }, { status: 404 });
    }

    if (dropRequest.status !== "OPEN") {
      return NextResponse.json(
        { error: "Drop request is no longer open" },
        { status: 400 }
      );
    }

    if (new Date() > dropRequest.expires_at) {
      await prisma.drop_request.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Drop request has expired" },
        { status: 400 }
      );
    }

    if (action === "CANCEL") {
      await prisma.drop_request.update({
        where: { id },
        data: { status: "CANCELLED", claimed_by_user_id: null },
      });

      const updated = await prisma.drop_request.findUnique({
        where: { id },
        include: {
          shift: {
            include: {
              location: true,
              skill: true,
            },
          },
        },
      });

      return NextResponse.json(updated);
    }

    if (action === "CLAIM") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const result = await validateAssignment(
        session.user.id,
        dropRequest.shift.location_id,
        dropRequest.shift.skill_id,
        dropRequest.shift.date,
        dropRequest.shift.start_time,
        dropRequest.shift.end_time,
        dropRequest.shift_id
      );

      if (result.violations.length > 0) {
        return NextResponse.json(
          {
            error: "Assignment validation failed",
            violations: result.violations.map((v: ConstraintViolation) => v.message),
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.shift_assignment.update({
          where: {
            shift_id_user_id: {
              shift_id: dropRequest.shift_id,
              user_id: dropRequest.shift.assignments[0].user_id,
            },
          },
          data: { user_id: session.user.id },
        });

        await tx.drop_request.update({
          where: { id },
          data: {
            status: "CLAIMED",
            claimed_by_user_id: session.user.id,
          },
        });
      });

      const shiftDetails = `${dropRequest.shift.location.name} - ${dropRequest.shift.date.toLocaleDateString()} ${dropRequest.shift.start_time}-${dropRequest.shift.end_time}`;
      const originalUserId = dropRequest.shift.assignments[0]?.user_id;
      if (originalUserId) {
        await createNotification({
          userId: originalUserId,
          type: "DROP_CLAIMED",
          message: NOTIFICATION_MESSAGES.DROP_CLAIMED(shiftDetails),
        });
      }

      const updated = await prisma.drop_request.findUnique({
        where: { id },
        include: {
          shift: {
            include: {
              location: true,
              skill: true,
            },
          },
          claimed_by: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update drop request:", error);
    return NextResponse.json(
      { error: "Failed to update drop request" },
      { status: 500 }
    );
  }
}
