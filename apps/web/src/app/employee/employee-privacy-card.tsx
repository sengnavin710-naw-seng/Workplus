"use client";

import { Button } from "@repo/ui/button";
import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PrivacyResponse = {
  policy: null | {
    id: string;
    name: string;
    version: number;
    noticeVersion: string;
    noticeText: string;
    requiresConsent: boolean;
    applicationUsageEnabled: boolean;
    idleDetectionEnabled: boolean;
    screenshotsEnabled: boolean;
    effectiveAt: string | null;
  };
  consent: null | {
    status: "pending" | "accepted" | "declined" | "revoked";
    respondedAt: string | null;
  };
};

export function EmployeePrivacyCard() {
  const [data, setData] = useState<PrivacyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/employee/privacy", {
      cache: "no-store",
    });
    const payload = (await response.json()) as PrivacyResponse & {
      message?: string;
    };
    if (!response.ok)
      throw new Error(payload.message ?? "Privacy policy could not be loaded");
    setData(payload);
  }, []);

  useEffect(() => {
    load().catch((loadError: unknown) =>
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Privacy policy could not be loaded",
      ),
    );
  }, [load]);

  async function respond(action: "accept" | "decline" | "revoke") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/employee/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          payload.message ?? "Consent response could not be saved",
        );
      await load();
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : "Consent response could not be saved",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading privacy policy…
      </section>
    );
  }
  if (!data?.policy) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-5 text-slate-500" />
          <h2 className="font-semibold">Privacy & consent</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Your organization has not published a tracking policy. Device
          enrollment and all tracking remain disabled.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  const { policy } = data;
  const status = data.consent?.status ?? "pending";
  const permitted = [
    ["Application usage", policy.applicationUsageEnabled],
    ["Idle detection", policy.idleDetectionEnabled],
    ["Screenshots", policy.screenshotsEnabled],
  ] as const;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{policy.name}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Policy version {policy.version} · Notice {policy.noticeVersion}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
          {status}
        </span>
      </div>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {policy.noticeText}
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {permitted.map(([label, enabled]) => (
          <div
            className="rounded-lg border border-slate-200 p-3 text-sm"
            key={label}
          >
            <span className="block text-slate-500">{label}</span>
            <strong className={enabled ? "text-amber-700" : "text-emerald-700"}>
              {enabled ? "Permitted in a future phase" : "Not permitted"}
            </strong>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        Accepting this notice does not start tracking. Device enrollment is not
        available until Phase 1B, and time tracking starts in Phase 2.
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {status !== "accepted" ? (
          <Button disabled={busy} onClick={() => void respond("accept")}>
            Accept policy
          </Button>
        ) : null}
        {status === "pending" ? (
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            disabled={busy}
            onClick={() => void respond("decline")}
            type="button"
          >
            Decline
          </button>
        ) : null}
        {status === "accepted" ? (
          <button
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
            disabled={busy}
            onClick={() => void respond("revoke")}
            type="button"
          >
            Revoke consent
          </button>
        ) : null}
      </div>
    </section>
  );
}
