import { prisma } from "@/lib/db";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ASSIGN"
  | "UNASSIGN"
  | "PUBLISH"
  | "UNPUBLISH"
  | "SWAP_REQUEST"
  | "SWAP_ACCEPT"
  | "SWAP_REJECT"
  | "DROP_REQUEST"
  | "DROP_CLAIM"
  | "LOGIN"
  | "LOGOUT";

export type AuditEntityType =
  | "USER"
  | "LOCATION"
  | "SKILL"
  | "SHIFT"
  | "ASSIGNMENT"
  | "SWAP_REQUEST"
  | "DROP_REQUEST"
  | "CERTIFICATION"
  | "AVAILABILITY"
  | "NOTIFICATION";

interface AuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog({
  entityType,
  entityId,
  action,
  userId,
  before,
  after,
  metadata,
}: AuditLogParams) {
  try {
    const auditLog = await prisma.audit_log.create({
      data: {
        entity_type: entityType,
        entity_id: entityId,
        action,
        user_id: userId,
        before: before ? (before as object) : undefined,
        after: after ? (after as object) : undefined,
      },
    });

    console.log(
      `[Audit] ${action} ${entityType} ${entityId} by user ${userId}`,
      metadata || ""
    );

    return auditLog;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}

export async function getAuditLogs(options: {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    entityType,
    entityId,
    userId,
    action,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  const where: Record<string, unknown> = {};

  if (entityType) where.entity_type = entityType;
  if (entityId) where.entity_id = entityId;
  if (userId) where.user_id = userId;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) {
      (where.created_at as Record<string, unknown>).gte = startDate;
    }
    if (endDate) {
      (where.created_at as Record<string, unknown>).lte = endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.audit_log.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.audit_log.count({ where }),
  ]);

  return { logs, total };
}

export function getActionDescription(action: AuditAction, entityType: AuditEntityType): string {
  const descriptions: Record<string, string> = {
    CREATE_USER: "Created user",
    UPDATE_USER: "Updated user",
    DELETE_USER: "Deleted user",
    CREATE_LOCATION: "Created location",
    UPDATE_LOCATION: "Updated location",
    DELETE_LOCATION: "Deleted location",
    CREATE_SKILL: "Created skill",
    DELETE_SKILL: "Deleted skill",
    CREATE_SHIFT: "Created shift",
    UPDATE_SHIFT: "Updated shift",
    DELETE_SHIFT: "Deleted shift",
    PUBLISH_SHIFT: "Published shift",
    UNPUBLISH_SHIFT: "Unpublished shift",
    ASSIGN_SHIFT: "Assigned staff to shift",
    UNASSIGN_SHIFT: "Unassigned staff from shift",
    SWAP_REQUEST: "Requested shift swap",
    SWAP_ACCEPT: "Accepted swap request",
    SWAP_REJECT: "Rejected swap request",
    DROP_REQUEST: "Posted shift for drop",
    DROP_CLAIM: "Claimed dropped shift",
    CREATE_CERTIFICATION: "Added certification",
    DELETE_CERTIFICATION: "Removed certification",
    UPDATE_AVAILABILITY: "Updated availability",
    LOGIN: "Logged in",
    LOGOUT: "Logged out",
  };

  return descriptions[`${action}_${entityType}`] || `${action} ${entityType}`;
}
