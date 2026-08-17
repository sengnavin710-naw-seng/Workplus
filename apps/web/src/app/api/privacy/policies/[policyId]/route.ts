import { db, schema } from "@repo/db";
import { updateTrackingPolicySchema } from "@repo/validation";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "@/lib/organization-access";
import { canEditPolicy, canManagePrivacyPolicy } from "@/lib/privacy-domain";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

type RouteContext = { params: Promise<{ policyId: string }> };

export async function PATCH(request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  if (!canManagePrivacyPolicy(context.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const parsed = updateTrackingPolicySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid policy" },
      { status: 400 },
    );
  }
  const { policyId } = await route.params;
  const policy = await db.query.trackingPolicies.findFirst({
    where: and(
      eq(schema.trackingPolicies.id, policyId),
      eq(schema.trackingPolicies.organizationId, context.organizationId),
    ),
  });
  if (!policy)
    return NextResponse.json({ message: "Policy not found" }, { status: 404 });
  if (!canEditPolicy(policy.status)) {
    return NextResponse.json(
      { message: "Published or retired policies are immutable" },
      { status: 409 },
    );
  }

  const updated = await db.transaction(async (tx) => {
    const [result] = await tx
      .update(schema.trackingPolicies)
      .set(parsed.data)
      .where(
        and(
          eq(schema.trackingPolicies.id, policy.id),
          eq(schema.trackingPolicies.organizationId, context.organizationId),
          eq(schema.trackingPolicies.status, "draft"),
        ),
      )
      .returning();
    if (!result) return null;
    await tx.insert(schema.auditLogs).values({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: "privacy.policy.updated",
      resourceType: "tracking_policy",
      resourceId: result.id,
      requestId: requestIdFor(request),
      metadata: auditMetadata({ version: result.version }),
    });
    return result;
  });
  if (!updated) {
    return NextResponse.json(
      { message: "Policy is no longer editable" },
      { status: 409 },
    );
  }
  return NextResponse.json({ policy: updated });
}
