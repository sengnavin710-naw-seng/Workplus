"use client";

import { Button } from "@repo/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/auth/client";

export function LogoutButton({ className = "", compact = false, dark = false }: { className?: string; compact?: boolean; dark?: boolean }) {
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
      className={`${dark ? "bg-slate-950 text-white ring-1 ring-slate-950 hover:bg-slate-800" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"} ${className}`}
      disabled={isPending}
      onClick={() => void handleLogout()}
    >
      <LogOut aria-hidden="true" className={compact ? "size-3" : "size-4"} />
      <span className="whitespace-nowrap">{isPending ? "Signing out" : "Sign out"}</span>
    </Button>
  );
}
