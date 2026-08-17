"use client";

import { Input } from "@repo/ui/input";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
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
          <LockKeyhole aria-hidden="true" className="size-5" strokeWidth={1.7} />
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
          {isVisible ? (
            <Eye aria-hidden="true" className="size-5" strokeWidth={1.7} />
          ) : (
            <EyeOff aria-hidden="true" className="size-5" strokeWidth={1.7} />
          )}
        </button>
      </div>
      {hint ? <p className="text-xs leading-5 text-[color-mix(in_srgb,var(--ink)_62%,transparent)]">{hint}</p> : null}
    </div>
  );
}
