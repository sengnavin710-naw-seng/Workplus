import { db, schema } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getEmployeeOrganizationContext } from "@/lib/employee-access";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export async function POST(request: Request, route: RouteContext) {
  const context = await getEmployeeOrganizationContext();
  if ("error" in context) return context.error;
  const { enrollmentId } = await route.params;
  const enrollment = await db.query.deviceEnrollmentSessions.findFirst({
    where: eq(schema.deviceEnrollmentSessions.id, enrollmentId),
  });
  if (!enrollment || enrollment.expiresAt <= new Date()) {
    return NextResponse.json({ message: "Enrollment has expired" }, { status: 410 });
  }
  if (enrollment.status !== "pending") {
    return NextResponse.json({ status: enrollment.status });
  }
  if (enrollment.deviceId) {
    const existingDevice = await db.query.devices.findFirst({
      where: eq(schema.devices.id, enrollment.deviceId),
    });
    if (
      !existingDevice ||
      existingDevice.employeeId !== context.employee.id ||
      existingDevice.organizationId !== context.organizationId ||
      existingDevice.status !== "active"
    ) {
      return NextResponse.json(
        { message: "This device belongs to a different employee account" },
        { status: 403 },
      );
    }
  }

  const policy = await db.query.trackingPolicies.findFirst({
    where: and(
      eq(schema.trackingPolicies.organizationId, context.organizationId),
      eq(schema.trackingPolicies.status, "published"),
    ),
    orderBy: [desc(schema.trackingPolicies.version)],
  });
  if (!policy) {
    return NextResponse.json(
      { message: "Your organization has not published a privacy policy" },
      { status: 409 },
    );
  }

  const consent = await db.query.employeeConsents.findFirst({
    where: and(
      eq(schema.employeeConsents.organizationId, context.organizationId),
      eq(schema.employeeConsents.employeeId, context.employee.id),
      eq(schema.employeeConsents.trackingPolicyId, policy.id),
    ),
  });
  const status =
    !policy.requiresConsent || consent?.status === "accepted"
      ? "authorized"
      : "consent_required";

  await db.transaction(async (tx) => {
    if (policy.requiresConsent && !consent) {
      await tx.insert(schema.employeeConsents).values({
        organizationId: context.organizationId,
        employeeId: context.employee.id,
        trackingPolicyId: policy.id,
        status: "pending",
        noticeVersion: policy.noticeVersion,
      });
    }
    await tx
      .update(schema.deviceEnrollmentSessions)
      .set({
        organizationId: context.organizationId,
        employeeId: context.employee.id,
        authorizedByUserId: context.session.user.id,
        trackingPolicyId: policy.id,
        status,
        authorizedAt: new Date(),
      })
      .where(
        and(
          eq(schema.deviceEnrollmentSessions.id, enrollment.id),
          eq(schema.deviceEnrollmentSessions.status, "pending"),
        ),
      );
    await tx.insert(schema.auditLogs).values({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: "device.enrollment.authorized",
      resourceType: "device_enrollment",
      resourceId: enrollment.id,
      requestId: requestIdFor(request),
      metadata: auditMetadata({
        employeeId: context.employee.id,
        policyId: policy.id,
        consentRequired: status === "consent_required",
      }),
    });
  });

  return NextResponse.json({ status });
}
