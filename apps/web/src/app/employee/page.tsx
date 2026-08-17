import { db, schema } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { Clock3, Laptop, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getDashboardIdentity } from "@/auth/server";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { isAdminRole } from "@/lib/access-policy";
import { EmployeePrivacyCard } from "./employee-privacy-card";

export default async function EmployeePortalPage() {
  const identity = await getDashboardIdentity();
  if (!identity) redirect("/login");
  if (!identity.activeOrganization) redirect("/onboarding");
  if (isAdminRole(identity.role)) redirect("/dashboard");

  const employee = await db.query.employees.findFirst({
    where: and(
      eq(schema.employees.organizationId, identity.activeOrganization.id),
      eq(schema.employees.linkedUserId, identity.session.user.id),
      eq(schema.employees.status, "active"),
    ),
    with: {
      devices: true,
      teamMemberships: { with: { team: true } },
    },
  });
  if (!employee) redirect("/login?error=employee-access");

  const connectedDevices = employee.devices.filter(
    (device) => device.status === "active",
  );
  const team = employee.teamMemberships[0]?.team;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">WorkPlus Employee</p>
            <p className="text-xs text-slate-500">
              {identity.activeOrganization.name}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-sm font-medium text-slate-500">Welcome</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {employee.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {employee.jobTitle}
          {team ? ` · ${team.name}` : ""}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatusCard
            description="Tracking starts only after you clock in. Activity collection is not enabled yet."
            icon={<Clock3 aria-hidden="true" className="size-5" />}
            label="Attendance"
            value="Not clocked in"
          />
          <StatusCard
            description="The visible WorkPlus Agent reports connection health only. Tracking remains off until a future clock-in phase."
            icon={<Laptop aria-hidden="true" className="size-5" />}
            label="Devices"
            value={
              connectedDevices.length
                ? `${connectedDevices.length} connected`
                : "Agent not connected"
            }
          />
          <StatusCard
            description="No screenshots, app usage, or website activity is collected before policy and consent are configured."
            icon={<ShieldCheck aria-hidden="true" className="size-5" />}
            label="Privacy"
            value="Tracking disabled"
          />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">Your devices</h2>
          <p className="mt-1 text-sm text-slate-500">
            Connection status is reported without collecting activity.
          </p>
          {employee.devices.length ? (
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {employee.devices.map((device) => {
                const connectionStatus =
                  device.status === "revoked"
                    ? "Revoked"
                    : device.lastSeenAt &&
                        Date.now() - device.lastSeenAt.getTime() < 90_000
                      ? "Online"
                      : "Offline";
                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={device.id}>
                    <div>
                      <strong className="text-sm">{device.name}</strong>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">
                        {device.platform} · Agent {device.agentVersion}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                        {connectionStatus}
                      </span>
                      <p className="mt-1.5 text-xs text-slate-500">
                        {device.lastSeenAt
                          ? `Last seen ${device.lastSeenAt.toLocaleString()}`
                          : "Not seen yet"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
              No devices connected yet. Open the visible WorkPlus Agent and sign
              in with your browser.
            </p>
          )}
        </section>

        <EmployeePrivacyCard />

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">What happens next</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Your account can authorize the visible WorkPlus Agent and review the
            current privacy notice. Device connection does not start tracking.
            Visible clock-in arrives in Phase 2, and policy-controlled activity is
            deferred to Phase 3. WorkPlus does not currently report activity or
            productivity metrics for this account.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  description,
  icon,
  label,
  value,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-4 font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </section>
  );
}
