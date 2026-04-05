import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, shiftSyncAdmin, shiftSyncManager, shiftSyncStaff } from "@/lib/permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL,
  plugins: [
    adminClient({
      ac,
      roles: {
        admin: shiftSyncAdmin,
        manager: shiftSyncManager,
        staff: shiftSyncStaff,
      },
    }),
  ],
});

export const { signIn, signUp, signOut } = authClient;
export const { useSession } = authClient;
export { adminClient as admin };
