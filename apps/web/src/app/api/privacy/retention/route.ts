import { db, schema } from "@repo/db";
import { retentionPolicyBatchSchema } from "@repo/validation";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "@/lib/organization-access";
import { canManagePrivacyPolicy } from "@/lib/privacy-domain";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

export async function GET() {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const policies = await db.query.retentionPolicies.findMany({
    where: eq(schema.retentionPolicies.organizationId, context.organizationId),
    orderBy: [schema.retentionPolicies.dataCategory],
  });
  return NextResponse.json({
    canManage: canManagePrivacyPolicy(context.role),
    policies,
  });
}

export async function PUT(request: Request) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  if (!canManagePrivacyPolicy(context.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const body: unknown = await request.json();
  const input =
    typeof body === "object" && body !== null && "policies" in body
      ? body.policies
      : body;
  const parsed = retentionPolicyBatchSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message ?? "Invalid retention policy",
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const policies = await db.transaction(async (tx) => {
    const saved = [];
    for (const item of parsed.data) {
      const [policy] = await tx
        .insert(schema.retentionPolicies)
        .values({
          organizationId: context.organizationId,
          dataCategory: item.dataCategory,
          retentionDays: item.retentionDays,
          effectiveAt: now,
          createdByUserId: context.session.user.id,
        })
        .onConflictDoUpdate({
          target: [
            schema.retentionPolicies.organizationId,
            schema.retentionPolicies.dataCategory,
          ],
          set: {
            retentionDays: item.retentionDays,
            effectiveAt: now,
            createdByUserId: context.session.user.id,
          },
        })
        .returning();
      if (policy) saved.push(policy);
    }
    await tx.insert(schema.auditLogs).values({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: "privacy.retention.updated",
      resourceType: "retention_policy",
      requestId: requestIdFor(request),
      metadata: auditMetadata({
        categories: parsed.data.map((item) => item.dataCategory),
      }),
    });
    return saved;
  });
  return NextResponse.json({ policies });
}
