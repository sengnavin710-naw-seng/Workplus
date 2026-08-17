import { db, schema } from "@repo/db";
import { employeeConsentResponseSchema } from "@repo/validation";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getEmployeeOrganizationContext } from "@/lib/employee-access";
import { consentStatusForAction } from "@/lib/privacy-domain";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

export async function GET() {
  const context = await getEmployeeOrganizationContext();
  if ("error" in context) return context.error;
  const policy = await db.query.trackingPolicies.findFirst({
    where: and(
      eq(schema.trackingPolicies.organizationId, context.organizationId),
      eq(schema.trackingPolicies.status, "published"),
    ),
    orderBy: [desc(schema.trackingPolicies.version)],
  });
  if (!policy) return NextResponse.json({ policy: null, consent: null });

  const consent = await db.query.employeeConsents.findFirst({
    where: and(
      eq(schema.employeeConsents.organizationId, context.organizationId),
      eq(schema.employeeConsents.employeeId, context.employee.id),
      eq(schema.employeeConsents.trackingPolicyId, policy.id),
    ),
  });
  return NextResponse.json({ policy, consent });
}

export async function POST(request: Request) {
  const context = await getEmployeeOrganizationContext();
  if ("error" in context) return context.error;
  const parsed = employeeConsentResponseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid consent response" },
      { status: 400 },
    );
  }

  const result = await db.transaction(async (tx) => {
    const policy = await tx.query.trackingPolicies.findFirst({
      where: and(
        eq(schema.trackingPolicies.organizationId, context.organizationId),
        eq(schema.trackingPolicies.status, "published"),
      ),
      orderBy: [desc(schema.trackingPolicies.version)],
    });
    if (!policy)
      return { error: "No published privacy policy is available" } as const;
    await tx
      .insert(schema.employeeConsents)
      .values({
        organizationId: context.organizationId,
        employeeId: context.employee.id,
        trackingPolicyId: policy.id,
        status: "pending",
        noticeVersion: policy.noticeVersion,
      })
      .onConflictDoNothing();
    const consent = await tx.query.employeeConsents.findFirst({
      where: and(
        eq(schema.employeeConsents.organizationId, context.organizationId),
        eq(schema.employeeConsents.employeeId, context.employee.id),
        eq(schema.employeeConsents.trackingPolicyId, policy.id),
      ),
    });
    if (!consent)
      return { error: "Consent record could not be created" } as const;
    const status = consentStatusForAction(consent.status, parsed.data.action);
    if (!status)
      return { error: "This consent action is not available" } as const;
    if (status === consent.status) return { consent, policy } as const;
    const now = new Date();
    const [updated] = await tx
      .update(schema.employeeConsents)
      .set({
        status,
        respondedAt: now,
        revokedAt: status === "revoked" ? now : null,
      })
      .where(eq(schema.employeeConsents.id, consent.id))
      .returning();
    if (!updated) return { error: "Consent could not be updated" } as const;
    await tx.insert(schema.auditLogs).values({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: `privacy.consent.${status}`,
      resourceType: "employee_consent",
      resourceId: updated.id,
      requestId: requestIdFor(request),
      metadata: auditMetadata({
        employeeId: context.employee.id,
        policyId: policy.id,
        policyVersion: policy.version,
      }),
    });
    return { consent: updated, policy } as const;
  });
  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 409 });
  }
  return NextResponse.json(result);
}
