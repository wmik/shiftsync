import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hash, compare } from "bcryptjs";

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
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "admin";
    if (id !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only change your own password" },
        { status: 403 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const account = await prisma.account.findFirst({
      where: {
        user_id: id,
        provider_id: "credential",
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    if (!isAdmin && account.password) {
      const isValidPassword = await compare(currentPassword, account.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hash(newPassword, 10);

    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
