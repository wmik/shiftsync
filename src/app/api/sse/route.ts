import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendEvent("connected", { userId, timestamp: new Date().toISOString() });

      const interval = setInterval(async () => {
        try {
          const { prisma } = await import("@/lib/db");

          const unreadCount = await prisma.notification.count({
            where: {
              user_id: userId,
              is_read: false,
            },
          });

          sendEvent("heartbeat", {
            timestamp: new Date().toISOString(),
            unreadCount,
          });
        } catch (error) {
          console.error("SSE heartbeat error:", error);
        }
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
