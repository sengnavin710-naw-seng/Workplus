"use client";

import { useEffect } from "react";
import { authClient } from "@/auth/client";

const SESSION_RETRY_DELAYS_MS = [0, 250, 750, 1_500] as const;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

/**
 * Better Auth writes the browser session during the OAuth callback redirect.
 * Retry briefly in the browser so the first Google sign-in does not race the
 * session cookie becoming available to the next request.
 */
export function AuthCompleteRedirect() {
  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      for (const retryDelay of SESSION_RETRY_DELAYS_MS) {
        if (retryDelay) await delay(retryDelay);
        if (cancelled) return;

        try {
          const sessionResult = await authClient.getSession();
          if (sessionResult.error || !sessionResult.data?.session) continue;

          const organizationsResult = await authClient.organization.list();
          if (organizationsResult.error) continue;

          const organization = organizationsResult.data?.[0];
          if (!organization) {
            window.location.replace("/onboarding");
            return;
          }

          const activeOrganizationResult =
            await authClient.organization.setActive({
              organizationId: organization.id,
            });
          if (activeOrganizationResult.error) continue;

          // The destination routes re-check membership and role server-side.
          window.location.replace("/dashboard");
          return;
        } catch {
          // A freshly created OAuth session can be briefly unavailable.
        }
      }

      if (!cancelled) window.location.replace("/login?error=google");
    }

    void finishSignIn();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-900">
      <p aria-live="polite" className="text-sm text-slate-600" role="status">
        Completing sign-in…
      </p>
    </main>
  );
}
