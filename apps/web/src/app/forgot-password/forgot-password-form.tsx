"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { authClient } from "@/auth/client";
import {
  AuthButtonContent,
  LoadingSpinner,
} from "@/components/auth-button-content";

interface ForgotPasswordFormProps {
  emailDeliveryEnabled: boolean;
}

type RecoveryStep = "email" | "code";
type PendingAction = "send" | "verify" | "resend" | null;
type ResendNoticeState = "hidden" | "visible" | "leaving";

const OTP_LENGTH = 6;
const RESEND_NOTICE_DURATION_MS = 3000;
const RESEND_NOTICE_EXIT_DURATION_MS = 125;

function StepHeader({
  description,
  lock = false,
  title,
}: {
  description: string;
  lock?: boolean;
  title: string;
}) {
  return (
    <header className="text-center">
      {lock ? (
        <span className="mx-auto mb-4 grid size-14 place-items-center text-[var(--ink)]">
          <LockKeyhole aria-hidden="true" className="size-12" strokeWidth={1.6} />
        </span>
      ) : null}
      <h1 className="text-[22px] font-medium leading-[1.3] tracking-normal">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-[color-mix(in_srgb,var(--ink)_68%,transparent)]">
        {description}
      </p>
    </header>
  );
}

export function ForgotPasswordForm({
  emailDeliveryEnabled,
}: ForgotPasswordFormProps) {
  const router = useRouter();
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verificationInFlight = useRef(false);
  const verificationCompleted = useRef(false);
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(() =>
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendNoticeState, setResendNoticeState] =
    useState<ResendNoticeState>("hidden");

  const otp = otpDigits.join("");
  const isSubmitting = pendingAction !== null;

  async function requestCode(emailAddress: string) {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: emailAddress,
      type: "email-verification",
    });
    if (result.error) throw new Error("Sign-in code request failed");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("send");
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const emailValue = formData.get("email");
    const emailAddress =
      typeof emailValue === "string" ? emailValue.trim() : "";

    try {
      await requestCode(emailAddress);
      setEmail(emailAddress);
      setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setStep("code");
    } catch {
      setErrorMessage("We couldn't send a code. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  const verifyCode = useCallback(
    async (candidateOtp: string) => {
      if (
        !/^\d{6}$/.test(candidateOtp) ||
        verificationInFlight.current ||
        verificationCompleted.current
      )
        return;

      verificationInFlight.current = true;
      setPendingAction("verify");
      setErrorMessage(null);

      try {
        const result = await authClient.emailOtp.verifyEmail({
          email,
          otp: candidateOtp,
        });

        if (result.error || !result.data?.token) {
          setErrorMessage(
            "The code is incorrect or expired. Please enter a new code.",
          );
          setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
          otpInputRefs.current[0]?.focus();
          return;
        }

        verificationCompleted.current = true;
        router.replace("/dashboard");
        router.refresh();
      } catch {
        setErrorMessage("We couldn't verify the code. Please try again.");
        setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
        otpInputRefs.current[0]?.focus();
      } finally {
        verificationInFlight.current = false;
        setPendingAction(null);
      }
    },
    [email, router],
  );

  useEffect(() => {
    if (step === "code" && otp.length === OTP_LENGTH) void verifyCode(otp);
  }, [otp, step, verifyCode]);

  useEffect(() => {
    if (resendNoticeState !== "visible") return;

    const exitTimeoutId = window.setTimeout(
      () => setResendNoticeState("leaving"),
      RESEND_NOTICE_DURATION_MS,
    );

    return () => window.clearTimeout(exitTimeoutId);
  }, [resendNoticeState]);

  useEffect(() => {
    if (resendNoticeState !== "leaving") return;

    const removeTimeoutId = window.setTimeout(
      () => setResendNoticeState("hidden"),
      RESEND_NOTICE_EXIT_DURATION_MS,
    );

    return () => window.clearTimeout(removeTimeoutId);
  }, [resendNoticeState]);

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      setErrorMessage("Enter the 6-digit code from your email.");
      return;
    }

    void verifyCode(otp);
  }

  async function handleResendCode() {
    setPendingAction("resend");
    setErrorMessage(null);
    if (resendNoticeState === "visible") setResendNoticeState("leaving");

    try {
      await requestCode(email);
      setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setResendNoticeState("visible");
      otpInputRefs.current[0]?.focus();
    } catch {
      setErrorMessage("We couldn't send a new code. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  function handleOtpChange(
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    setOtpDigits((current) =>
      current.map((value, position) => (position === index ? digit : value)),
    );
    if (digit && index < OTP_LENGTH - 1)
      otpInputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0)
      otpInputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0)
      otpInputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1)
      otpInputRefs.current[index + 1]?.focus();
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH)
      .split("");
    if (pastedDigits.length === 0) return;

    event.preventDefault();
    setOtpDigits(
      Array.from(
        { length: OTP_LENGTH },
        (_, index) => pastedDigits[index] ?? "",
      ),
    );
    otpInputRefs.current[
      Math.min(pastedDigits.length, OTP_LENGTH) - 1
    ]?.focus();
  }

  if (step === "code") {
    return (
      <div className="relative">
        <form
          aria-busy={isSubmitting}
          className="auth-step-enter space-y-6"
          onSubmit={handleCodeSubmit}
        >
          <StepHeader
            description={`Enter the 6-digit code we sent to ${email}.`}
            lock
            title="Verify your code"
          />

          <fieldset>
            <legend className="sr-only">6-digit sign-in code</legend>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {otpDigits.map((digit, index) => (
                <input
                  aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  className="h-14 min-w-0 rounded-lg border border-[color-mix(in_srgb,var(--border-medium)_38%,transparent)] bg-[var(--canvas-raised)] text-center text-xl font-medium text-[var(--ink)] outline-none focus-visible:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color-mix(in_srgb,var(--primary)_22%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  inputMode="numeric"
                  key={index}
                  maxLength={1}
                  onChange={(event) => handleOtpChange(index, event)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  ref={(element) => {
                    otpInputRefs.current[index] = element;
                  }}
                  type="text"
                  value={digit}
                />
              ))}
            </div>
          </fieldset>

          {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

          <Button
            aria-busy={pendingAction === "verify"}
            className="auth-primary-button auth-black-button w-full"
            disabled={isSubmitting || otp.length !== OTP_LENGTH}
            type="submit"
          >
            <AuthButtonContent
              isLoading={pendingAction === "verify"}
              loadingLabel="Verifying…"
            >
              Continue
            </AuthButtonContent>
          </Button>

          <div className="space-y-3 text-center text-sm">
            <p className="flex flex-wrap items-center justify-center gap-x-1 text-[color-mix(in_srgb,var(--ink)_68%,transparent)]">
              <span>Didn&apos;t receive a code?</span>
              <button
                aria-busy={pendingAction === "resend"}
                className="auth-link auth-inline-loading-button"
                disabled={isSubmitting}
                onClick={() => void handleResendCode()}
                type="button"
              >
                <span aria-live="polite">
                  {pendingAction === "resend" ? "Sending again…" : "Send again"}
                </span>
                {pendingAction === "resend" ? (
                  <span aria-hidden="true" className="auth-inline-spinner-slot">
                    <LoadingSpinner />
                  </span>
                ) : null}
              </button>
            </p>
            <button
              className="auth-link inline-flex items-center justify-center gap-1.5"
              disabled={isSubmitting}
              onClick={() => {
                setErrorMessage(null);
                setStep("email");
              }}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
              <span>Back</span>
            </button>
          </div>
        </form>

        {resendNoticeState !== "hidden" ? (
          <div
            aria-live="polite"
            className="auth-resend-notice absolute inset-x-0 bottom-[calc(100%+2.75rem)] flex items-center gap-3 rounded-lg border border-[var(--surface-soft)] bg-[var(--canvas-raised)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_12px_32px_rgba(39,37,30,0.16)] sm:bottom-[calc(100%+3.25rem)]"
            data-leaving={resendNoticeState === "leaving"}
            role="status"
          >
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white"
            >
              ✓
            </span>
            <span>A new code has been sent.</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
      aria-busy={isSubmitting}
      className="space-y-5"
      onSubmit={(event) => void handleEmailSubmit(event)}
    >
      <StepHeader
        description="Enter your email to receive a sign-in code. Your password will not be changed."
        title="Forgot your password?"
      />
      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-[var(--ink)]"
          htmlFor="email"
        >
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
            disabled={isSubmitting || !emailDeliveryEnabled}
            id="email"
            name="email"
            placeholder="Enter your email"
            required
            type="email"
          />
        </div>
      </div>

      {!emailDeliveryEnabled ? (
        <ErrorMessage message="Sign-in email delivery is not configured yet." />
      ) : null}
      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      <Button
        aria-busy={pendingAction === "send"}
        className="auth-primary-button auth-black-button w-full"
        disabled={isSubmitting || !emailDeliveryEnabled}
        type="submit"
      >
        <AuthButtonContent
          isLoading={pendingAction === "send"}
          loadingLabel="Sending…"
        >
          Send 6-digit code
        </AuthButtonContent>
      </Button>

      <p className="text-center text-sm">
        <Link className="auth-link" href="/login">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border border-[color-mix(in_srgb,var(--negative)_35%,transparent)] px-4 py-3 text-sm leading-5 text-[var(--negative)]"
      role="alert"
    >
      {message}
    </div>
  );
}
