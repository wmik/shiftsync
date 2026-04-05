import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { addNotificationListener } from "@/lib/notification-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SSEClient {
  userId: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
}

const clients = new Map<string, SSEClient>();

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  const clientId = `${userId}-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      const client: SSEClient = { userId, controller, encoder };
      clients.set(clientId, client);

      const sendEvent = (event: string, data: object) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const handleNotification = (notifUserId: string, notification: { id: string; type: string; message: string }) => {
        if (notifUserId === userId) {
          const message = `event: notification\ndata: ${JSON.stringify({ type: "new_notification", notification })}\n\n`;
          try {
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error("Failed to send notification:", error);
          }
        }
      };

      const unsubscribe = addNotificationListener(handleNotification);

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
        unsubscribe();
        clients.delete(clientId);
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
