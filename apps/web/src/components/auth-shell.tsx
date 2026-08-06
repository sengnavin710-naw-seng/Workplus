import Link from "next/link";
import type { ReactNode } from "react";
import { WorkplusLogo } from "@/components/workplus-logo";

type AuthStage = 1 | 2;

interface AuthShellProps {
  children: ReactNode;
  compact?: boolean;
  description: string;
  footer?: ReactNode;
  hideHeader?: boolean;
  hideLogo?: boolean;
  stage?: AuthStage;
  title: string;
}

const stages = ["Account", "Workspace", "Dashboard"] as const;

export function AuthShell({
  children,
  compact = false,
  description,
  footer,
  hideHeader = false,
  hideLogo = false,
  stage,
  title,
}: AuthShellProps) {
  return (
    <main
      className={`min-h-screen bg-[var(--canvas)] px-4 py-8 text-[var(--ink)] sm:px-6 ${compact ? "sm:py-6" : "sm:py-12"}`}
    >
      <div
        className={`mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[30rem] flex-col items-center justify-center ${compact ? "sm:min-h-[calc(100vh-3rem)]" : "sm:min-h-[calc(100vh-6rem)]"}`}
      >
        <section
          aria-label={hideHeader ? title : undefined}
          aria-labelledby={hideHeader ? undefined : "auth-title"}
          className={`w-full rounded-xl border border-[var(--surface-soft)] bg-[var(--canvas-raised)] px-6 py-8 shadow-[0_18px_50px_rgba(39,37,30,0.10)] sm:px-8 ${compact ? "sm:min-h-[41.375rem] sm:py-6" : "sm:py-10"}`}
        >
          {hideLogo ? null : (
            <Link
              className={`${stage ? "mb-6" : "mb-2"} flex justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]`}
              href="/"
            >
              <WorkplusLogo markSize={compact ? "medium" : "default"} showWordmark={false} />
            </Link>
          )}

          {stage ? (
            <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Account setup progress">
              {stages.map((label, index) => {
                const position = index + 1;
                const isCurrent = position === stage;
                const isComplete = position < stage;

                return (
                  <li className="space-y-2" key={label}>
                    <span
                      aria-hidden="true"
                      className={`block h-1 rounded-full ${isCurrent || isComplete ? "bg-[var(--primary)]" : "bg-[var(--surface-soft)]"}`}
                    />
                    <span
                      className={`text-xs font-medium ${isCurrent ? "text-[var(--ink)]" : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"}`}
                    >
                      {position}. {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}

          <header className={hideHeader ? "sr-only" : "text-center"}>
            {stage ? <p className="mb-3 text-xs font-medium text-[var(--primary)]">Setup · Step {stage} of 2</p> : null}
            <h1 className="text-[22px] font-medium leading-[1.3] tracking-normal" id="auth-title">
              {title}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-[color-mix(in_srgb,var(--ink)_68%,transparent)]">
              {description}
            </p>
          </header>

          {children}
          {footer ? (
            <div className="mt-6 border-t border-[var(--surface-soft)] pt-6 text-center text-sm leading-5 text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
              {footer}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
