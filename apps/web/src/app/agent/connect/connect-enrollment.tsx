"use client";

import { Button } from "@repo/ui/button";
import { Laptop, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function ConnectEnrollment({ enrollmentId }: { enrollmentId: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");

  async function authorize() {
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch(
        `/api/agent/v1/enrollments/${enrollmentId}/authorize`,
        { method: "POST" },
      );
      const result = (await response.json().catch(() => null)) as
        | { message?: string; status?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.message ?? "This Agent could not be authorized.");
      }
      setStatus("complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authorization failed.");
      setStatus("error");
    }
  }

  if (status === "complete") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <ShieldCheck aria-hidden="true" className="mx-auto size-10 text-emerald-700" />
        <h2 className="mt-4 text-xl font-semibold">Identity confirmed</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Return to the visible WorkPlus Agent. If consent is required, the Agent
          will show the current privacy notice before this device is connected.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <Laptop aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
        <div>
          <h2 className="font-semibold">Connect this visible Agent</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            This confirms your employee account only. Tracking remains off, and
            browser sign-in credentials are never copied into the Agent.
          </p>
        </div>
      </div>
      {message ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {message}
        </p>
      ) : null}
      <Button
        className="mt-5 w-full bg-slate-950 text-white hover:bg-slate-800"
        disabled={status === "submitting"}
        onClick={() => void authorize()}
      >
        {status === "submitting" ? "Authorizing…" : "Authorize Agent"}
      </Button>
    </div>
  );
}
