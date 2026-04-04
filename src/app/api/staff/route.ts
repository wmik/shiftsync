import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const skillId = searchParams.get("skillId");

    const where: Record<string, unknown> = {
      role: { in: ["staff", "manager"] },
    };

    if (locationId) {
      where.certifications = {
        some: { location_id: locationId },
      };
    }

    if (skillId) {
      where.certifications = {
        ...(where.certifications as object),
        some: {
          ...((where.certifications as { some?: object })?.some || {}),
          skill_id: skillId,
        },
      };
    }

    const staff = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
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
        manager_locations: {
          include: {
            location: true,
          },
        },
        _count: {
          select: {
            shift_assignments: {
              where: {
                status: "CONFIRMED",
              },
            },
          },
        },
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}
