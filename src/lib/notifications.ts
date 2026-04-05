import { prisma } from "@/lib/db";
import { emitNotification } from "./notification-events";

export type NotificationType =
  | "SHIFT_ASSIGNED"
  | "SHIFT_UNASSIGNED"
  | "SHIFT_PUBLISHED"
  | "SHIFT_CANCELLED"
  | "SWAP_REQUEST"
  | "SWAP_ACCEPTED"
  | "SWAP_REJECTED"
  | "SWAP_PENDING_APPROVAL"
  | "SWAP_APPROVED"
  | "SWAP_DENIED"
  | "DROP_REQUEST"
  | "DROP_CLAIMED"
  | "DROP_EXPIRED";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  message: string;
}

export async function createNotification({
  userId,
  type,
  message,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        message,
        is_read: false,
      },
    });

    console.log(`[Notification] ${type} for user ${userId}: ${message}`);

    emitNotification(userId, {
      id: notification.id,
      type: notification.type,
      message: notification.message,
    });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
) {
  try {
    const data = notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      message: n.message,
      is_read: false,
    }));

    await prisma.notification.createMany({ data });
    return true;
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
    return false;
  }
}

export async function markAllAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return false;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
}

export const NOTIFICATION_MESSAGES = {
  SHIFT_ASSIGNED: (shiftDetails: string) =>
    `You have been assigned to a shift: ${shiftDetails}`,
  SHIFT_UNASSIGNED: (shiftDetails: string) =>
    `You have been unassigned from: ${shiftDetails}`,
  SHIFT_PUBLISHED: (shiftDetails: string) =>
    `New shift available: ${shiftDetails}`,
  SHIFT_CANCELLED: (shiftDetails: string) =>
    `Shift cancelled: ${shiftDetails}`,
  SWAP_REQUEST: (fromName: string, shiftDetails: string) =>
    `${fromName} wants to swap shifts: ${shiftDetails}`,
  SWAP_ACCEPTED: (shiftDetails: string) =>
    `Your swap request was accepted: ${shiftDetails}`,
  SWAP_REJECTED: (shiftDetails: string) =>
    `Your swap request was rejected: ${shiftDetails}`,
  SWAP_PENDING_APPROVAL: (shiftDetails: string) =>
    `Swap request needs manager approval: ${shiftDetails}`,
  SWAP_APPROVED: (shiftDetails: string) =>
    `Your swap request was approved: ${shiftDetails}`,
  SWAP_DENIED: (shiftDetails: string) =>
    `Your swap request was denied: ${shiftDetails}`,
  DROP_REQUEST: (fromName: string, shiftDetails: string) =>
    `${fromName} dropped a shift: ${shiftDetails}`,
  DROP_CLAIMED: (shiftDetails: string) =>
    `Your dropped shift was claimed: ${shiftDetails}`,
  DROP_EXPIRED: (shiftDetails: string) =>
    `Your dropped shift expired: ${shiftDetails}`,
} as const;
