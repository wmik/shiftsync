import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createNotification, createBulkNotifications, NOTIFICATION_MESSAGES } from "@/lib/notifications";

async function isManagerOfLocation(userId: string, locationId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === "admin") {
    return true;
  }

  const managerLocation = await prisma.manager_location.findUnique({
    where: {
      user_id_location_id: {
        user_id: userId,
        location_id: locationId,
      },
    },
  });

  return !!managerLocation;
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
    const { action } = body;

    if (!["ACCEPT", "REJECT", "CANCEL", "APPROVE", "DENY"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be ACCEPT, REJECT, CANCEL, APPROVE, or DENY" },
        { status: 400 }
      );
    }

    const swapRequest = await prisma.swap_request.findUnique({
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

    if (!swapRequest) {
      return NextResponse.json({ error: "Swap request not found" }, { status: 404 });
    }

    const shiftDetails = `${swapRequest.shift.location.name} - ${swapRequest.shift.date.toLocaleDateString()} ${swapRequest.shift.start_time}-${swapRequest.shift.end_time}`;
    const locationId = swapRequest.shift.location_id;

    if (action === "CANCEL") {
      if (swapRequest.requester_user_id !== session.user.id) {
        return NextResponse.json(
          { error: "Only the requester can cancel" },
          { status: 403 }
        );
      }

      if (!["PENDING", "PENDING_APPROVAL"].includes(swapRequest.status)) {
        return NextResponse.json(
          { error: "Cannot cancel a completed, rejected, or denied request" },
          { status: 400 }
        );
      }

      const updated = await prisma.swap_request.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json(updated);
    }

    if (action === "REJECT") {
      if (swapRequest.target_user_id !== session.user.id) {
        return NextResponse.json(
          { error: "Only the target user can reject" },
          { status: 403 }
        );
      }

      if (swapRequest.status !== "PENDING") {
        return NextResponse.json(
          { error: "Request is no longer pending" },
          { status: 400 }
        );
      }

      await prisma.swap_request.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      await createNotification({
        userId: swapRequest.requester_user_id,
        type: "SWAP_REJECTED",
        message: NOTIFICATION_MESSAGES.SWAP_REJECTED(shiftDetails),
      });

      const updated = await prisma.swap_request.findUnique({
        where: { id },
        include: {
          shift: {
            include: {
              location: true,
              skill: true,
            },
          },
          requester: {
            select: { id: true, name: true, email: true },
          },
          target: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return NextResponse.json(updated);
    }

    if (action === "ACCEPT") {
      if (swapRequest.target_user_id !== session.user.id) {
        return NextResponse.json(
          { error: "Only the target user can accept" },
          { status: 403 }
        );
      }

      if (swapRequest.status !== "PENDING") {
        return NextResponse.json(
          { error: "Request is no longer pending" },
          { status: 400 }
        );
      }

      await prisma.swap_request.update({
        where: { id },
        data: { status: "PENDING_APPROVAL" },
      });

      const managers = await prisma.manager_location.findMany({
        where: { location_id: locationId },
        select: { user_id: true },
      });

      const adminUsers = await prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      });

      const managerIds = new Set([
        ...managers.map((m) => m.user_id),
        ...adminUsers.map((u) => u.id),
      ]);

      const notifications = Array.from(managerIds).map((userId) => ({
        userId,
        type: "SWAP_PENDING_APPROVAL" as const,
        message: NOTIFICATION_MESSAGES.SWAP_PENDING_APPROVAL(shiftDetails),
      }));

      await createBulkNotifications(notifications);

      const updated = await prisma.swap_request.findUnique({
        where: { id },
        include: {
          shift: {
            include: {
              location: true,
              skill: true,
            },
          },
          requester: {
            select: { id: true, name: true, email: true },
          },
          target: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return NextResponse.json(updated);
    }

    if (action === "APPROVE" || action === "DENY") {
      const canApprove = await isManagerOfLocation(session.user.id, locationId);
      if (!canApprove) {
        return NextResponse.json(
          { error: "Only managers of this location can approve or deny swap requests" },
          { status: 403 }
        );
      }

      if (swapRequest.status !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Request is not pending approval" },
          { status: 400 }
        );
      }

      if (action === "APPROVE") {
        await prisma.$transaction(async (tx) => {
          await tx.shift_assignment.update({
            where: {
              shift_id_user_id: {
                shift_id: swapRequest.requester_shift_id,
                user_id: swapRequest.requester_user_id,
              },
            },
            data: { user_id: swapRequest.target_user_id },
          });

          await tx.swap_request.update({
            where: { id },
            data: { status: "COMPLETED" },
          });
        });

        await createNotification({
          userId: swapRequest.requester_user_id,
          type: "SWAP_APPROVED",
          message: NOTIFICATION_MESSAGES.SWAP_APPROVED(shiftDetails),
        });

        await createNotification({
          userId: swapRequest.target_user_id,
          type: "SWAP_APPROVED",
          message: NOTIFICATION_MESSAGES.SWAP_APPROVED(shiftDetails),
        });
      } else {
        await prisma.swap_request.update({
          where: { id },
          data: { status: "DENIED" },
        });

        await createNotification({
          userId: swapRequest.requester_user_id,
          type: "SWAP_DENIED",
          message: NOTIFICATION_MESSAGES.SWAP_DENIED(shiftDetails),
        });

        await createNotification({
          userId: swapRequest.target_user_id,
          type: "SWAP_DENIED",
          message: NOTIFICATION_MESSAGES.SWAP_DENIED(shiftDetails),
        });
      }

      const updated = await prisma.swap_request.findUnique({
        where: { id },
        include: {
          shift: {
            include: {
              location: true,
              skill: true,
            },
          },
          requester: {
            select: { id: true, name: true, email: true },
          },
          target: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update swap request:", error);
    return NextResponse.json(
      { error: "Failed to update swap request" },
      { status: 500 }
    );
  }
}
