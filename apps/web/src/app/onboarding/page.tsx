import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { WorkplusLogo } from "@/components/workplus-logo";
import { WorkspaceForm } from "./workspace-form";

export default async function OnboardingPage() {
  const identity = await getDashboardIdentity();

  if (!identity) redirect("/login");
  if (identity.activeOrganization) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)]">
      <section className="flex min-h-screen flex-col bg-[var(--canvas-raised)] px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
        <header>
          <Link
            className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            href="/"
          >
            <WorkplusLogo compact />
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-[42rem] flex-1 items-center py-10 lg:py-12">
          <WorkspaceForm
            accountEmail={identity.session.user.email}
            initialName={identity.session.user.name}
          />
        </div>
      </section>

      <aside
        aria-label="WorkPlus setup principles"
        className="hidden min-h-screen items-center justify-center border-l border-[color-mix(in_srgb,var(--surface-soft)_68%,transparent)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--canvas))] p-12 lg:flex"
      >
        <div className="w-full max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--primary)]">Private by default</p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.035em]">
            A clear workspace boundary for your team.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[color-mix(in_srgb,var(--ink)_68%,transparent)]">
            Your setup choices personalize the workspace. They do not enable activity collection or hidden monitoring.
          </p>

          <div className="mt-10 rounded-xl border border-[var(--surface-soft)] bg-[var(--canvas-raised)] p-6 shadow-[0_18px_50px_rgba(39,37,30,0.08)]">
            <p className="text-sm font-medium">Workspace setup</p>
            <ol className="mt-5 space-y-5 text-sm">
              <li className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ink-strong)] text-xs text-white">
                  1
                </span>
                <div>
                  <p className="font-medium">Define your workspace</p>
                  <p className="mt-1 text-[color-mix(in_srgb,var(--ink)_62%,transparent)]">Name, role, and team size</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--surface-soft)] text-xs">
                  2
                </span>
                <div>
                  <p className="font-medium">Choose your goals</p>
                  <p className="mt-1 text-[color-mix(in_srgb,var(--ink)_62%,transparent)]">Select what you want to set up first</p>
                </div>
              </li>
            </ol>
          </div>

          <p className="mt-6 text-xs leading-5 text-[color-mix(in_srgb,var(--ink)_58%,transparent)]">
            Tracking features remain off until they are implemented and explicitly configured.
          </p>
        </div>
      </aside>
    </main>
  );
}
