import { Card } from "@repo/ui/card";
import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { isAdminRole } from "@/lib/access-policy";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardPage() {
  const identity = await getDashboardIdentity();
  if (!identity) redirect("/login");
  if (!identity.activeOrganization) redirect("/onboarding");
  if (!isAdminRole(identity.role)) redirect("/employee");

  return (
    <DashboardShell activeNav="Home" organizationName={identity.activeOrganization.name} role={identity.role ?? "Owner"} title="Home" userEmail={identity.session.user.email} userName={identity.session.user.name}>
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
                Privacy policy and employee consent are the current phase. Device enrollment, activity tracking, idle detection, and screenshots remain disabled.
              </p>
            </Card>
          </div>
    </DashboardShell>
  );
}
