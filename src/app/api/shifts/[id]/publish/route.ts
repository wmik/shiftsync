import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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

    const shift = await prisma.shift.update({
      where: { id },
      data: { is_published: true },
      include: {
        location: true,
        skill: true,
        assignments: {
          include: {
            assigned: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Failed to publish shift:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to publish shift" },
      { status: 500 }
    );
  }
}
