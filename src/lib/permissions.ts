import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  user: ["create", "list", "set-role", "ban", "delete", "set-password"] as const,
  session: ["list", "revoke"] as const,
  shift: ["create", "read", "update", "delete", "publish"] as const,
  location: ["create", "read", "update", "delete"] as const,
  staff: ["create", "read", "update", "delete"] as const,
} as const;

export const ac = createAccessControl(statement);

export const shiftSyncAdmin = ac.newRole({
  user: ["create", "list", "set-role", "ban", "delete", "set-password"],
  session: ["list", "revoke"],
  shift: ["create", "read", "update", "delete", "publish"],
  location: ["create", "read", "update", "delete"],
  staff: ["create", "read", "update", "delete"],
});

export const shiftSyncManager = ac.newRole({
  shift: ["create", "read", "update", "publish"],
  location: ["read"],
  staff: ["read", "update"],
});

export const shiftSyncStaff = ac.newRole({
  shift: ["read"],
  location: ["read"],
  staff: ["read"],
});

export type ShiftSyncRole = "admin" | "manager" | "staff";
