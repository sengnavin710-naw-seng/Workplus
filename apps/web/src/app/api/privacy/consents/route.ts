import { db, schema } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "@/lib/organization-access";
import { canViewPrivacyAdministration } from "@/lib/privacy-domain";

export async function GET() {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  if (!canViewPrivacyAdministration(context.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const policy = await db.query.trackingPolicies.findFirst({
    where: and(
      eq(schema.trackingPolicies.organizationId, context.organizationId),
      eq(schema.trackingPolicies.status, "published"),
    ),
    orderBy: [desc(schema.trackingPolicies.version)],
  });
  const employees = await db.query.employees.findMany({
    where: eq(schema.employees.organizationId, context.organizationId),
    with: {
      consents: true,
      teamMemberships: { with: { team: true } },
    },
    orderBy: [schema.employees.name],
  });

  return NextResponse.json({
    policy: policy
      ? { id: policy.id, status: policy.status, version: policy.version }
      : null,
    employees: employees.map((employee) => {
      const consent = policy
        ? employee.consents.find((item) => item.trackingPolicyId === policy.id)
        : null;
      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        team: employee.teamMemberships[0]?.team.name ?? "Unassigned",
        employeeStatus: employee.status,
        consentStatus: consent?.status ?? "pending",
        respondedAt: consent?.respondedAt ?? null,
      };
    }),
  });
}
