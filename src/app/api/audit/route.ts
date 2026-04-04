import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can view audit logs" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { logs, total } = await getAuditLogs({
      entityType: entityType as "USER" | "LOCATION" | "SKILL" | "SHIFT" | "ASSIGNMENT" | "SWAP_REQUEST" | "DROP_REQUEST" | "CERTIFICATION" | "AVAILABILITY" | "NOTIFICATION" | undefined,
      entityId,
      userId,
      action: action as "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "UNASSIGN" | "PUBLISH" | "UNPUBLISH" | "SWAP_REQUEST" | "SWAP_ACCEPT" | "SWAP_REJECT" | "DROP_REQUEST" | "DROP_CLAIM" | "LOGIN" | "LOGOUT" | undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
