import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET || process.env.AUTH_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const result = await prisma.drop_request.updateMany({
      where: {
        status: "OPEN",
        expires_at: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    const expiredRequests = await prisma.drop_request.findMany({
      where: {
        status: "EXPIRED",
        expires_at: { lt: now },
      },
      include: {
        shift: {
          include: {
            location: true,
          },
        },
        requested_by: true,
      },
    });

    for (const drop of expiredRequests) {
      const shiftDetails = `${drop.shift.location.name} - ${drop.shift.date.toLocaleDateString()} ${drop.shift.start_time}-${drop.shift.end_time}`;
      
      await createNotification({
        userId: drop.requested_by_user_id,
        type: "DROP_EXPIRED",
        message: `Your dropped shift has expired: ${shiftDetails}`,
      });

      console.log(`[Cron] Drop request ${drop.id} expired for user ${drop.requested_by_user_id}`);
    }

    return NextResponse.json({
      success: true,
      expired: result.count,
      notified: expiredRequests.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Failed to expire drop requests:", error);
    return NextResponse.json(
      { error: "Failed to process expired drop requests" },
      { status: 500 }
    );
  }
}
