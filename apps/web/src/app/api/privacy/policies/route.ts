import { db, schema } from "@repo/db";
import { trackingPolicyInputSchema } from "@repo/validation";
import { desc, eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { canManagePrivacyPolicy } from "@/lib/privacy-domain";
import { getManageOrganizationContext } from "@/lib/organization-access";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function GET() {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;

  const policies = await db.query.trackingPolicies.findMany({
    where: eq(schema.trackingPolicies.organizationId, context.organizationId),
    orderBy: [desc(schema.trackingPolicies.version)],
  });
  return NextResponse.json({
    canManage: canManagePrivacyPolicy(context.role),
    policies,
  });
}

export async function POST(request: Request) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  if (!canManagePrivacyPolicy(context.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = trackingPolicyInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid policy" },
      { status: 400 },
    );
  }

  try {
    const policy = await db.transaction(async (tx) => {
      const [latest] = await tx
        .select({ version: max(schema.trackingPolicies.version) })
        .from(schema.trackingPolicies)
        .where(
          eq(schema.trackingPolicies.organizationId, context.organizationId),
        );
      const version = Number(latest?.version ?? 0) + 1;
      const [created] = await tx
        .insert(schema.trackingPolicies)
        .values({
          organizationId: context.organizationId,
          version,
          createdByUserId: context.session.user.id,
          ...parsed.data,
        })
        .returning();
      if (!created) throw new Error("Policy could not be created");
      await tx.insert(schema.auditLogs).values({
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        action: "privacy.policy.created",
        resourceType: "tracking_policy",
        resourceId: created.id,
        requestId: requestIdFor(request),
        metadata: auditMetadata({
          version: created.version,
          status: created.status,
        }),
      });
      return created;
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { message: "A policy version was created concurrently. Try again." },
        { status: 409 },
      );
    }
    throw error;
  }
}
