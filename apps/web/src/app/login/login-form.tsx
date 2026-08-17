"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/auth/client";
import { AuthButtonContent } from "@/components/auth-button-content";
import { PasswordField } from "@/components/password-field";
import { safeInternalReturnTo } from "@/lib/access-policy";

interface LoginFormProps {
  googleAuthEnabled: boolean;
  initialError?: string;
  initialMessage?: string;
  returnTo?: string;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 18 18">
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.703-1.568 2.684-3.879 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm({ googleAuthEnabled, initialError, initialMessage, returnTo }: LoginFormProps) {
  const router = useRouter();
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError ?? null);
  const isSubmitting = isEmailSubmitting || isGoogleSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEmailSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    const email = typeof emailValue === "string" ? emailValue.trim() : "";
    const password = typeof passwordValue === "string" ? passwordValue : "";

    try {
      const signInResult = await authClient.signIn.email({ email, password });

      if (signInResult.error) {
        setErrorMessage("Email or password is incorrect.");
        return;
      }

      const organizationsResult = await authClient.organization.list();

      if (organizationsResult.error) {
        setErrorMessage("You are signed in, but your workspace could not be loaded. Please try again.");
        return;
      }

      const firstOrganization = organizationsResult.data?.[0];
      if (firstOrganization) await authClient.organization.setActive({ organizationId: firstOrganization.id });

      router.replace(safeInternalReturnTo(returnTo) ?? "/auth/complete");
      router.refresh();
    } catch {
      setErrorMessage("Workplus couldn't reach the server. Please try again.");
    } finally {
      setIsEmailSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: safeInternalReturnTo(returnTo) ?? "/auth/complete",
        newUserCallbackURL: safeInternalReturnTo(returnTo) ?? "/auth/complete",
        errorCallbackURL: "/login?error=google",
      });

      if (result.error) {
        setErrorMessage("Google sign-in could not be started. Please try again.");
      }
    } catch {
      setErrorMessage("Google sign-in could not be started. Please try again.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <form aria-busy={isSubmitting} className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
      {initialMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {initialMessage}
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--ink)]" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
          >
            <Mail aria-hidden="true" className="size-5" strokeWidth={1.7} />
          </span>
          <Input
            autoComplete="email"
            className="auth-input auth-input-with-leading-icon"
            disabled={isSubmitting}
            id="email"
            name="email"
            placeholder="Enter your email"
            required
            type="email"
          />
        </div>
      </div>
      <PasswordField
        autoComplete="current-password"
        disabled={isSubmitting}
        id="password"
        label="Password"
        labelAction={
          <Link className="auth-link text-sm" href="/forgot-password">
            Forgot password?
          </Link>
        }
        name="password"
        placeholder="Enter your password"
      />
      {errorMessage ? (
        <div
          className="rounded-lg border border-[color-mix(in_srgb,var(--negative)_35%,transparent)] px-4 py-3 text-sm leading-5 text-[var(--negative)]"
          role="alert"
        >
          <p className="font-medium">Sign-in failed</p>
          <p>{errorMessage}</p>
        </div>
      ) : null}
      <Button
        aria-busy={isEmailSubmitting}
        className="auth-primary-button auth-black-button w-full"
        disabled={isSubmitting}
        type="submit"
      >
        <AuthButtonContent isLoading={isEmailSubmitting} loadingLabel="Signing in…">
          Sign in
        </AuthButtonContent>
      </Button>

      {googleAuthEnabled ? (
        <>
          <div className="flex items-center gap-3" role="separator">
            <span aria-hidden="true" className="h-px flex-1 bg-[var(--surface-soft)]" />
            <span className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">or</span>
            <span aria-hidden="true" className="h-px flex-1 bg-[var(--surface-soft)]" />
          </div>
          <Button
            aria-busy={isGoogleSubmitting}
            className="auth-google-button w-full"
            disabled={isSubmitting}
            onClick={() => void handleGoogleSignIn()}
            type="button"
          >
            <AuthButtonContent
              isLoading={isGoogleSubmitting}
              leadingIcon={<GoogleIcon />}
              loadingLabel="Connecting to Google…"
            >
              Continue with Google
            </AuthButtonContent>
          </Button>
        </>
      ) : null}

      <p className="text-center text-sm leading-5 text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
        Don&apos;t have an account?{" "}
        <Link className="auth-link" href="/signup">
          Sign up
        </Link>
      </p>
    </form>
  );
}
