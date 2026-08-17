import { db, schema } from "@repo/db";
import { deviceEnrollmentConsentSchema } from "@repo/validation";
import { and, eq } from "drizzle-orm";
import {
  agentJson,
  agentOptions,
  authenticatedEnrollment,
  isExpired,
} from "@/lib/agent-api";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export function OPTIONS(request: Request) {
  return agentOptions(request);
}

export async function POST(request: Request, route: RouteContext) {
  const { enrollmentId } = await route.params;
  const enrollment = await authenticatedEnrollment(request, enrollmentId);
  if (!enrollment) {
    return agentJson(request, { message: "Enrollment not found" }, { status: 404 });
  }
  if (isExpired(enrollment.expiresAt)) {
    return agentJson(request, { message: "Enrollment has expired" }, { status: 410 });
  }
  if (
    enrollment.status !== "consent_required" ||
    !enrollment.organizationId ||
    !enrollment.employeeId ||
    !enrollment.authorizedByUserId ||
    !enrollment.trackingPolicyId
  ) {
    return agentJson(request, { message: "Consent is not available" }, { status: 409 });
  }
  const parsed = deviceEnrollmentConsentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return agentJson(request, { message: "Invalid consent response" }, { status: 400 });
  }

  const policy = await db.query.trackingPolicies.findFirst({
    where: and(
      eq(schema.trackingPolicies.id, enrollment.trackingPolicyId),
      eq(schema.trackingPolicies.organizationId, enrollment.organizationId),
      eq(schema.trackingPolicies.status, "published"),
    ),
  });
  if (!policy) {
    return agentJson(request, { message: "Privacy policy has changed" }, { status: 409 });
  }

  const nextConsentStatus = parsed.data.action === "accept" ? "accepted" : "declined";
  const nextEnrollmentStatus = parsed.data.action === "accept" ? "authorized" : "declined";
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.employeeConsents)
      .values({
        organizationId: enrollment.organizationId!,
        employeeId: enrollment.employeeId!,
        trackingPolicyId: policy.id,
        status: nextConsentStatus,
        noticeVersion: policy.noticeVersion,
        respondedAt: now,
        revokedAt: null,
      })
      .onConflictDoUpdate({
        target: [
          schema.employeeConsents.organizationId,
          schema.employeeConsents.employeeId,
          schema.employeeConsents.trackingPolicyId,
        ],
        set: {
          status: nextConsentStatus,
          noticeVersion: policy.noticeVersion,
          respondedAt: now,
          revokedAt: null,
        },
      });
    await tx
      .update(schema.deviceEnrollmentSessions)
      .set({ status: nextEnrollmentStatus })
      .where(
        and(
          eq(schema.deviceEnrollmentSessions.id, enrollment.id),
          eq(schema.deviceEnrollmentSessions.status, "consent_required"),
        ),
      );
    await tx.insert(schema.auditLogs).values({
      organizationId: enrollment.organizationId!,
      actorUserId: enrollment.authorizedByUserId,
      action: `privacy.consent.${nextConsentStatus}`,
      resourceType: "employee_consent",
      requestId: requestIdFor(request),
      metadata: auditMetadata({
        employeeId: enrollment.employeeId,
        policyId: policy.id,
        source: "device_enrollment",
      }),
    });
  });

  return agentJson(request, { status: nextEnrollmentStatus });
}
