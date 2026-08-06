"use client";

import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/auth/client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      className="bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
      disabled={isPending}
      onClick={() => void handleLogout()}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
