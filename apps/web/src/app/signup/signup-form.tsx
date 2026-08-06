"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { signUpSchema } from "@repo/validation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/auth/client";
import { AuthButtonContent } from "@/components/auth-button-content";
import { PasswordField } from "@/components/password-field";

function getSignupError(code: string | undefined) {
  if (code?.includes("USER_ALREADY_EXISTS")) {
    return "An account already exists for this email. Sign in instead or use a different email.";
  }

  return "Your account could not be created. Review your details and try again.";
}

export function SignupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const nameValue = formData.get("name");
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    const confirmationValue = formData.get("passwordConfirmation");
    const input = {
      name: typeof nameValue === "string" ? nameValue : "",
      email: typeof emailValue === "string" ? emailValue : "",
      password: typeof passwordValue === "string" ? passwordValue : "",
    };
    const passwordConfirmation = typeof confirmationValue === "string" ? confirmationValue : "";
    const validation = signUpSchema.safeParse(input);

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message ?? "Review your account details and try again.");
      setIsSubmitting(false);
      return;
    }

    if (validation.data.password !== passwordConfirmation) {
      setErrorMessage("The passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await authClient.signUp.email(validation.data);

      if (result.error) {
        setErrorMessage(getSignupError(result.error.code));
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    } catch {
      setErrorMessage("Workplus couldn't reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form aria-busy={isSubmitting} className="mt-4 space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--ink)]" htmlFor="name">
          Full Name
        </label>
        <Input
          autoComplete="name"
          className="auth-input"
          id="name"
          maxLength={120}
          name="name"
          placeholder="John Doe"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--ink)]" htmlFor="email">
          Email
        </label>
        <Input
          autoComplete="email"
          className="auth-input"
          id="email"
          name="email"
          placeholder="johndoe@gmail.com"
          required
          type="email"
        />
      </div>
      <PasswordField
        autoComplete="new-password"
        id="password"
        label="Password"
        name="password"
        placeholder="Password"
      />
      <PasswordField
        autoComplete="new-password"
        id="passwordConfirmation"
        label="Confirm Password"
        name="passwordConfirmation"
        placeholder="Confirm Password"
      />
      <div className="space-y-3 pt-2">
        {errorMessage ? (
          <div
            className="rounded-lg border border-[color-mix(in_srgb,var(--negative)_35%,transparent)] px-4 py-3 text-sm leading-5 text-[var(--negative)]"
            role="alert"
          >
            <p className="font-medium">Account not created</p>
            <p>{errorMessage}</p>
          </div>
        ) : null}
        <Button
          aria-busy={isSubmitting}
          className="auth-primary-button auth-black-button w-full"
          disabled={isSubmitting}
          type="submit"
        >
          <AuthButtonContent isLoading={isSubmitting} loadingLabel="Creating account…">
            Continue to Create Account
          </AuthButtonContent>
        </Button>
      </div>

      <div className="flex items-center gap-3" role="separator">
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--surface-soft)]" />
        <span className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">or</span>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--surface-soft)]" />
      </div>

      <p className="text-center text-sm leading-5 text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
        Already have an account?{" "}
        <Link className="auth-link" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
