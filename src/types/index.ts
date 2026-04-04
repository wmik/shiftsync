export type Role = "ADMIN" | "MANAGER" | "STAFF";

export type ShiftStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type SwapStatus = "PENDING" | "ACCEPTED" | "APPROVED" | "REJECTED" | "CANCELLED";

export type DropStatus = "OPEN" | "CLAIMED" | "EXPIRED" | "CANCELLED";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  timezone: string;
  image?: string;
}

export interface ConstraintViolation {
  type: "DOUBLE_BOOKING" | "REST_PERIOD" | "SKILL_MISMATCH" | "CERTIFICATION_MISSING" | "AVAILABILITY" | "OVERTIME_DAILY" | "OVERTIME_WEEKLY" | "CONSECUTIVE_DAYS";
  message: string;
  details?: Record<string, unknown>;
}

export interface AlternativeStaff {
  userId: string;
  name: string;
  reason: string;
}

export interface OvertimeStatus {
  weeklyHours: number;
  dailyHours: number;
  consecutiveDays: number;
  isOverWeekly: boolean;
  isOverDaily: boolean;
  isSixthDay: boolean;
  isSeventhDay: boolean;
  requiresOverride: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationTypeEnum;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export type NotificationTypeEnum =
  | "SHIFT_ASSIGNED"
  | "SHIFT_UNASSIGNED"
  | "SHIFT_PUBLISHED"
  | "SHIFT_CANCELLED"
  | "SWAP_REQUEST"
  | "SWAP_ACCEPTED"
  | "SWAP_REJECTED"
  | "DROP_REQUEST"
  | "DROP_CLAIMED"
  | "DROP_EXPIRED";
