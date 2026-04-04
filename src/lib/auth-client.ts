import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";
import { ac, shiftSyncAdmin, shiftSyncManager, shiftSyncStaff } from "@/lib/permissions";

export const { signIn, signUp, signOut, useSession } = createAuthClient();

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
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
