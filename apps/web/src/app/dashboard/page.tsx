import { Card } from "@repo/ui/card";
import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const identity = await getDashboardIdentity();
  if (!identity) redirect("/login");
  if (!identity.activeOrganization) redirect("/onboarding");

  return (
    <div className="grid min-h-screen bg-stone-100 text-slate-950 md:grid-cols-[16rem_1fr]">
      <aside className="border-r border-slate-200 bg-[#0b211b] p-6 text-white" aria-label="Primary navigation">
        <a className="inline-flex items-center gap-3 font-semibold" href="/dashboard">
          <span className="grid size-8 place-items-center bg-emerald-300 text-xs font-black text-[#0b211b]">W</span>
          <span>Workplus</span>
        </a>
        <nav className="mt-12" aria-label="Workspace">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/60">Workspace</p>
          <a className="mt-4 block border-l-2 border-emerald-300 py-2 pl-4 text-sm font-medium" href="/dashboard">
            Overview
          </a>
          <p className="mt-8 text-xs leading-5 text-emerald-50/50">Employee and device enrollment will be added in Phase 1.</p>
        </nav>
      </aside>
      <div className="grid grid-rows-[4.5rem_1fr]">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 lg:px-10">
          <div>
            <p className="text-sm font-semibold">{identity.activeOrganization.name}</p>
            <p className="text-xs text-slate-500">{identity.session.user.email}</p>
          </div>
          <LogoutButton />
        </header>
        <main className="space-y-8 p-6 lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Owner dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Welcome, {identity.session.user.name}</h1>
            </div>
            <p className="text-sm text-slate-500">Role: {identity.role ?? "Not assigned"}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-none border-slate-300 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Active workspace</p>
              <p className="mt-4 text-xl font-semibold">{identity.activeOrganization.name}</p>
              <p className="mt-2 text-sm text-slate-600">workplus.app/{identity.activeOrganization.slug}</p>
            </Card>
            <Card className="rounded-none border-slate-300 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Foundation status</p>
              <p className="mt-4 font-semibold text-emerald-800">Account and workspace access are ready</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Activity tracking, idle detection, screenshots, and employee enrollment are not implemented yet.
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
