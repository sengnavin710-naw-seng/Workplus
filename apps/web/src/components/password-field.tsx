"use client";

import { Input } from "@repo/ui/input";
import { type ReactNode, useState } from "react";

interface PasswordFieldProps {
  autoComplete: "current-password" | "new-password";
  disabled?: boolean;
  hint?: string;
  id: string;
  label: string;
  labelAction?: ReactNode;
  name: string;
  placeholder?: string;
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <rect height="11" rx="3" stroke="currentColor" strokeWidth="1.7" width="14" x="5" y="10" />
      <circle cx="12" cy="14.5" fill="currentColor" r="1.1" />
      <path d="M12 15.5v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.7" />
      {isVisible ? null : (
        <path d="m4 4 16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      )}
    </svg>
  );
}

export function PasswordField({
  autoComplete,
  disabled = false,
  hint,
  id,
  label,
  labelAction,
  name,
  placeholder,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label className="block text-sm font-medium text-[var(--ink)]" htmlFor={id}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
        >
          <LockIcon />
        </span>
        <Input
          autoComplete={autoComplete}
          className="auth-input auth-input-with-leading-icon pr-14"
          disabled={disabled}
          id={id}
          minLength={8}
          name={name}
          placeholder={placeholder}
          required
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-controls={id}
          aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 grid min-w-12 place-items-center rounded-r-lg text-[color-mix(in_srgb,var(--ink)_62%,transparent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          <EyeIcon isVisible={isVisible} />
        </button>
      </div>
      {hint ? <p className="text-xs leading-5 text-[color-mix(in_srgb,var(--ink)_62%,transparent)]">{hint}</p> : null}
    </div>
  );
}
