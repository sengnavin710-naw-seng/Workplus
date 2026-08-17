import { db, schema } from "@repo/db";
import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "@/lib/organization-access";
import { canManagePrivacyPolicy, canPublishPolicy } from "@/lib/privacy-domain";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

type RouteContext = { params: Promise<{ policyId: string }> };

export async function POST(request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  if (!canManagePrivacyPolicy(context.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { policyId } = await route.params;
  const now = new Date();
  const published = await db.transaction(async (tx) => {
    const policy = await tx.query.trackingPolicies.findFirst({
      where: and(
        eq(schema.trackingPolicies.id, policyId),
        eq(schema.trackingPolicies.organizationId, context.organizationId),
      ),
    });
    if (!policy || !canPublishPolicy(policy.status)) return null;

    const retired = await tx
      .update(schema.trackingPolicies)
      .set({ status: "retired", retiredAt: now })
      .where(
        and(
          eq(schema.trackingPolicies.organizationId, context.organizationId),
          eq(schema.trackingPolicies.status, "published"),
          ne(schema.trackingPolicies.id, policy.id),
        ),
      )
      .returning({
        id: schema.trackingPolicies.id,
        version: schema.trackingPolicies.version,
      });
    const [result] = await tx
      .update(schema.trackingPolicies)
      .set({
        status: "published",
        effectiveAt: now,
        retiredAt: null,
        publishedByUserId: context.session.user.id,
      })
      .where(
        and(
          eq(schema.trackingPolicies.id, policy.id),
          eq(schema.trackingPolicies.organizationId, context.organizationId),
          eq(schema.trackingPolicies.status, "draft"),
        ),
      )
      .returning();
    if (!result) return null;
    for (const previous of retired) {
      await tx.insert(schema.auditLogs).values({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        action: "privacy.policy.retired",
        resourceType: "tracking_policy",
        resourceId: previous.id,
        requestId: requestIdFor(request),
        metadata: auditMetadata({ version: previous.version }),
      });
    }
    await tx.insert(schema.auditLogs).values({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: "privacy.policy.published",
      resourceType: "tracking_policy",
      resourceId: result.id,
      requestId: requestIdFor(request),
      metadata: auditMetadata({ version: result.version }),
    });
    return result;
  });
  if (!published) {
    return NextResponse.json(
      { message: "Only an existing draft policy can be published" },
      { status: 409 },
    );
  }
  return NextResponse.json({ policy: published });
}
