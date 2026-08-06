"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { accountNameSchema, organizationNameSchema, workspaceSlugSchema } from "@repo/validation";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/auth/client";

interface WorkspaceFormProps {
  accountEmail: string;
  initialName: string;
}

const roleOptions = [
  { label: "Executive", value: "executive" },
  { label: "HR / People Ops", value: "people-ops" },
  { label: "Operations", value: "operations" },
  { label: "Engineering / Product", value: "engineering-product" },
  { label: "IT / Security", value: "it-security" },
  { label: "Other", value: "other" },
] as const;

const teamSizeOptions = [
  { label: "1–10", value: "1-10" },
  { label: "11–50", value: "11-50" },
  { label: "51–250", value: "51-250" },
  { label: "251–1,000", value: "251-1000" },
  { label: "1,001–5,000", value: "1001-5000" },
  { label: "5,001+", value: "5001-plus" },
] as const;

const focusOptions = [
  { description: "Create a clear, user-visible record of working time.", label: "Transparent time tracking", value: "time-tracking" },
  { description: "Prepare a reliable review and approval workflow.", label: "Simpler timesheets", value: "timesheets" },
  { description: "Organize employees without mixing data across workspaces.", label: "Team organization", value: "team-organization" },
  { description: "Plan how company devices will join the workspace.", label: "Device enrollment", value: "device-enrollment" },
  { description: "Define privacy expectations before collecting activity data.", label: "Privacy and consent", value: "privacy-consent" },
  { description: "Prepare a future view of application usage under policy.", label: "Application usage", value: "application-usage" },
] as const;

type WorkspaceRole = (typeof roleOptions)[number]["value"];
type TeamSize = (typeof teamSizeOptions)[number]["value"];
type FocusValue = (typeof focusOptions)[number]["value"];

function createWorkspaceSlug(name: string) {
  const normalized = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace";
  const suffix = crypto.randomUUID().slice(0, 8);
  const base = normalized.slice(0, 54).replace(/-+$/g, "") || "workspace";
  return `${base}-${suffix}`;
}

function ProgressHeader({ step }: { step: 1 | 2 }) {
  return (
    <div>
      <div
        aria-label={`Step ${step} of 2`}
        aria-valuemax={2}
        aria-valuemin={1}
        aria-valuenow={step}
        className="h-1 overflow-hidden rounded-full bg-[var(--surface-soft)]"
        role="progressbar"
      >
        <span
          className={`block h-full rounded-full bg-[var(--primary)] transition-[width] duration-200 motion-reduce:transition-none ${step === 1 ? "w-1/2" : "w-full"}`}
        />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-[color-mix(in_srgb,var(--ink)_58%,transparent)]">
        Step {step}/2 — Workspace setup
      </p>
    </div>
  );
}

function ChoiceButton({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
        isSelected
          ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_9%,var(--canvas))] text-[var(--ink)]"
          : "border-[var(--surface-soft)] bg-[var(--canvas)] hover:border-[color-mix(in_srgb,var(--border-medium)_48%,transparent)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function WorkspaceForm({ accountEmail, initialName }: WorkspaceFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState(initialName);
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const [focuses, setFocuses] = useState<FocusValue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleBasicsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const nameResult = accountNameSchema.safeParse(fullName);
    const workspaceResult = organizationNameSchema.safeParse(workspaceName);

    if (!nameResult.success) {
      setErrorMessage(nameResult.error.issues[0]?.message ?? "Enter your full name.");
      return;
    }

    if (!workspaceResult.success) {
      setErrorMessage("Enter a company name.");
      return;
    }

    if (!role) {
      setErrorMessage("Select the role that best matches your work.");
      return;
    }

    if (!teamSize) {
      setErrorMessage("Select your team size.");
      return;
    }

    setFullName(nameResult.data);
    setWorkspaceName(workspaceResult.data);
    setStep(2);
  }

  function toggleFocus(value: FocusValue) {
    setErrorMessage(null);
    setFocuses((current) =>
      current.includes(value) ? current.filter((focus) => focus !== value) : [...current, value],
    );
  }

  async function handleFinish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (focuses.length === 0) {
      setErrorMessage("Select at least one workspace goal.");
      return;
    }

    const slugResult = workspaceSlugSchema.safeParse(createWorkspaceSlug(workspaceName));
    if (!slugResult.success || !role || !teamSize) {
      setErrorMessage("Review your workspace details and try again.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (fullName !== initialName) {
        const updateResult = await authClient.updateUser({ name: fullName });
        if (updateResult.error) {
          setErrorMessage("Your account name could not be updated. Please try again.");
          return;
        }
      }

      const result = await authClient.organization.create({
        metadata: {
          onboarding: {
            goals: focuses,
            role,
            teamSize,
          },
        },
        name: workspaceName,
        slug: slugResult.data,
      });

      if (result.error || !result.data) {
        setErrorMessage("Your workspace could not be created. Please try again.");
        return;
      }

      const activeResult = await authClient.organization.setActive({ organizationId: result.data.id });
      if (activeResult.error) {
        setErrorMessage("The workspace was created, but it could not be opened. Sign in again to continue.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("WorkPlus couldn't reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 2) {
    return (
      <form aria-busy={isSubmitting} className="w-full" onSubmit={(event) => void handleFinish(event)}>
        <ProgressHeader step={2} />
        <div className="mt-9">
          <h1 className="max-w-xl text-3xl font-medium leading-tight tracking-[-0.035em] sm:text-4xl">
            What do you want to do with your workspace?
          </h1>
          <p className="mt-3 text-sm leading-6 text-[color-mix(in_srgb,var(--ink)_66%,transparent)]">
            Select all that apply. You can change these choices later.
          </p>
        </div>

        <fieldset className="mt-8">
          <legend className="sr-only">Workspace goals</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {focusOptions.map((option) => {
              const isSelected = focuses.includes(option.value);
              return (
                <button
                  aria-pressed={isSelected}
                  className={`group flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                    isSelected
                      ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--canvas))]"
                      : "border-[var(--surface-soft)] bg-[var(--canvas)] hover:border-[color-mix(in_srgb,var(--border-medium)_48%,transparent)]"
                  }`}
                  key={option.value}
                  onClick={() => toggleFocus(option.value)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-xs ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[color-mix(in_srgb,var(--border-medium)_35%,transparent)]"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[color-mix(in_srgb,var(--ink)_62%,transparent)]">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            className="auth-primary-button auth-black-button min-w-48"
            disabled={isSubmitting}
            type="submit"
          >
            <span aria-live="polite">{isSubmitting ? "Creating workspace…" : "Done"}</span>
          </Button>
          <button
            className="auth-link px-4 py-2 text-sm"
            disabled={isSubmitting}
            onClick={() => {
              setErrorMessage(null);
              setStep(1);
            }}
            type="button"
          >
            Go back
          </button>
        </div>
        <p className="mt-6 text-xs text-[color-mix(in_srgb,var(--ink)_58%,transparent)]">Signed in as {accountEmail}</p>
      </form>
    );
  }

  return (
    <form className="w-full" onSubmit={handleBasicsSubmit}>
      <ProgressHeader step={1} />
      <div className="mt-9">
        <h1 className="text-3xl font-medium leading-tight tracking-[-0.035em] sm:text-4xl">Set up your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[color-mix(in_srgb,var(--ink)_66%,transparent)]">
          Tell us the basics so we can prepare the right starting point.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="fullName">
            Full Name
          </label>
          <Input
            autoComplete="name"
            className="auth-input"
            id="fullName"
            maxLength={120}
            onChange={(event) => setFullName(event.target.value)}
            required
            value={fullName}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="workspaceName">
            Company Name
          </label>
          <Input
            className="auth-input"
            id="workspaceName"
            maxLength={120}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Acme Operations"
            required
            value={workspaceName}
          />
        </div>
      </div>

      <fieldset className="mt-7">
        <legend className="text-sm font-medium">Your role</legend>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {roleOptions.map((option) => (
            <ChoiceButton
              isSelected={role === option.value}
              key={option.value}
              label={option.label}
              onClick={() => {
                setErrorMessage(null);
                setRole(option.value);
              }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="text-sm font-medium">Team size</legend>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {teamSizeOptions.map((option) => (
            <ChoiceButton
              isSelected={teamSize === option.value}
              key={option.value}
              label={option.label}
              onClick={() => {
                setErrorMessage(null);
                setTeamSize(option.value);
              }}
            />
          ))}
        </div>
      </fieldset>

      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      <Button className="auth-primary-button auth-black-button mt-8 min-w-48" type="submit">
        Next
      </Button>
      <p className="mt-6 text-xs text-[color-mix(in_srgb,var(--ink)_58%,transparent)]">Signed in as {accountEmail}</p>
    </form>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="mt-6 rounded-lg border border-[color-mix(in_srgb,var(--negative)_35%,transparent)] px-4 py-3 text-sm leading-5 text-[var(--negative)]"
      role="alert"
    >
      {message}
    </div>
  );
}
