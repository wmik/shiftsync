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
    const certifications = await prisma.certification.findMany({
      where: { user_id: id },
      include: {
        skill: true,
        location: true,
      },
    });

    return NextResponse.json(certifications);
  } catch (error) {
    console.error("Failed to fetch certifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch certifications" },
      { status: 500 }
    );
  }
}

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
    const { locationId, skillId } = body;

    if (!locationId || !skillId) {
      return NextResponse.json(
        { error: "Location and skill are required" },
        { status: 400 }
      );
    }

    const certification = await prisma.certification.create({
      data: {
        user_id: id,
        location_id: locationId,
        skill_id: skillId,
        certified_at: new Date(),
      },
      include: {
        skill: true,
        location: true,
      },
    });

    return NextResponse.json(certification, { status: 201 });
  } catch (error) {
    console.error("Failed to create certification:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Certification already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create certification" },
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
    const certificationId = searchParams.get("certificationId");

    if (!certificationId) {
      return NextResponse.json(
        { error: "Certification ID is required" },
        { status: 400 }
      );
    }

    await prisma.certification.delete({
      where: { id: certificationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete certification:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete certification" },
      { status: 500 }
    );
  }
}
