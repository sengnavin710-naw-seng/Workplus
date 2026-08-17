"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/auth/client";

interface InvitationPreview {
  accountExists: boolean;
  authenticated: boolean;
  authenticatedAsInvitee: boolean;
  employeeName: string;
  organizationName: string;
}

export default function EmployeeInvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      `/api/employee-invitations/accept?token=${encodeURIComponent(params.token)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const result = (await response.json()) as InvitationPreview & {
          message?: string;
        };
        if (!response.ok) throw new Error(result.message ?? "Invalid invitation");
        setPreview(result);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(
          reason instanceof Error ? reason.message : "Unable to load invitation.",
        );
      });
    return () => controller.abort();
  }, [params.token]);

  async function acceptInvitation() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/employee-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          password: preview?.accountExists ? undefined : password,
        }),
      });
      const result = (await response.json()) as {
        accountCreated?: boolean;
        message?: string;
      };
      if (!response.ok) {
        setError(result.message ?? "Unable to accept this invitation.");
        return;
      }
      if (result.accountCreated) await authClient.signOut();
      router.replace(
        result.accountCreated
          ? "/login?invitation=accepted&returnTo=%2Femployee"
          : "/employee",
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function continueToSignIn() {
    setPending(true);
    if (preview?.authenticated) await authClient.signOut();
    const returnTo = `/employee-invite/${encodeURIComponent(params.token)}`;
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    router.refresh();
  }

  const needsSignIn = preview?.accountExists && !preview.authenticatedAsInvitee;
  const canAccept = Boolean(
    preview &&
      (!preview.accountExists ? password.length >= 8 : preview.authenticatedAsInvitee),
  );

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Join WorkPlus</h1>
        {preview ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {preview.employeeName}, you&apos;ve been invited to join{" "}
            <strong>{preview.organizationName}</strong>.
          </p>
        ) : error ? null : (
          <p className="mt-2 text-sm text-slate-600">Checking invitation…</p>
        )}

        {preview && !preview.accountExists ? (
          <label className="mt-6 block text-sm font-semibold text-slate-700">
            Create password
            <input
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 focus:border-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-950"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
        ) : null}

        {needsSignIn ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            This email already has a WorkPlus account. Sign in with the invited
            email to continue.
          </div>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {needsSignIn ? (
          <button
            className="mt-6 h-12 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
            onClick={() => void continueToSignIn()}
            type="button"
          >
            Continue to sign in
          </button>
        ) : (
          <button
            className="mt-6 h-12 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending || !canAccept}
            onClick={() => void acceptInvitation()}
            type="button"
          >
            {pending ? "Accepting invitation…" : "Accept invitation"}
          </button>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">
          <Link className="underline" href="/login">
            Return to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
