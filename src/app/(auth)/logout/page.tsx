"use client";

import { useEffect } from "react";
import { signOut } from "@/lib/auth-client";

export default function LogoutPage() {
  useEffect(() => {
    signOut().then(() => {
      window.location.href = "/login";
    });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Signing out...</div>
    </div>
  );
}
