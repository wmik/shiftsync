import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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

    if (!["ACCEPT", "REJECT", "CANCEL"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be ACCEPT, REJECT, or CANCEL" },
        { status: 400 }
      );
    }

    const swapRequest = await prisma.swap_request.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
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

    if (action === "CANCEL") {
      if (swapRequest.requester_user_id !== session.user.id) {
        return NextResponse.json(
          { error: "Only the requester can cancel" },
          { status: 403 }
        );
      }

      const updated = await prisma.swap_request.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json(updated);
    }

    if (action === "ACCEPT" || action === "REJECT") {
      if (swapRequest.target_user_id !== session.user.id) {
        return NextResponse.json(
          { error: "Only the target user can accept or reject" },
          { status: 403 }
        );
      }

      if (swapRequest.status !== "PENDING") {
        return NextResponse.json(
          { error: "Request is no longer pending" },
          { status: 400 }
        );
      }

      if (action === "ACCEPT") {
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
      } else {
        await prisma.swap_request.update({
          where: { id },
          data: { status: "REJECTED" },
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
