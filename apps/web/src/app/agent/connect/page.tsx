import { db, schema } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { isAdminRole } from "@/lib/access-policy";
import { ConnectEnrollment } from "./connect-enrollment";

interface ConnectPageProps {
  searchParams: Promise<{ enrollment?: string }>;
}

export default async function ConnectAgentPage({ searchParams }: ConnectPageProps) {
  const { enrollment } = await searchParams;
  if (!enrollment) redirect("/employee");
  const returnTo = `/agent/connect?enrollment=${encodeURIComponent(enrollment)}`;
  const identity = await getDashboardIdentity();
  if (!identity) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);

  const employee = identity.activeOrganization
    ? await db.query.employees.findFirst({
        where: and(
          eq(schema.employees.organizationId, identity.activeOrganization.id),
          eq(schema.employees.linkedUserId, identity.session.user.id),
          eq(schema.employees.status, "active"),
        ),
      })
    : null;
  const canAuthorize = Boolean(employee) && !isAdminRole(identity.role);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950">
      <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">WorkPlus Employee</p>
        <h1 className="mt-2 text-2xl font-bold">Connect desktop Agent</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Signed in as {identity.session.user.email}
        </p>
        <div className="mt-6">
          {canAuthorize ? (
            <ConnectEnrollment enrollmentId={enrollment} />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold">Employee account required</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign out and use the employee account linked to this organization.
                Admin and owner accounts cannot be enrolled as employee devices.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
