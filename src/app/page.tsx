"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/schedule");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
