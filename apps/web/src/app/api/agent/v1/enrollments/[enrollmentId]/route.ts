import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";
import {
  agentJson,
  agentOptions,
  authenticatedEnrollment,
  isExpired,
} from "@/lib/agent-api";

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export function OPTIONS(request: Request) {
  return agentOptions(request);
}

export async function GET(request: Request, route: RouteContext) {
  const { enrollmentId } = await route.params;
  const enrollment = await authenticatedEnrollment(request, enrollmentId);
  if (!enrollment) {
    return agentJson(request, { message: "Enrollment not found" }, { status: 404 });
  }
  if (isExpired(enrollment.expiresAt) && enrollment.status !== "completed") {
    await db
      .update(schema.deviceEnrollmentSessions)
      .set({ status: "expired" })
      .where(eq(schema.deviceEnrollmentSessions.id, enrollment.id));
    return agentJson(request, { status: "expired" });
  }

  const policy = enrollment.trackingPolicyId
    ? await db.query.trackingPolicies.findFirst({
        where: eq(schema.trackingPolicies.id, enrollment.trackingPolicyId),
      })
    : null;
  const employee = enrollment.employeeId
    ? await db.query.employees.findFirst({
        where: eq(schema.employees.id, enrollment.employeeId),
        with: { organization: true },
      })
    : null;

  return agentJson(request, {
    status: enrollment.status,
    employee: employee
      ? { name: employee.name, organizationName: employee.organization.name }
      : null,
    policy:
      enrollment.status === "consent_required" && policy
        ? {
            id: policy.id,
            name: policy.name,
            version: policy.version,
            noticeVersion: policy.noticeVersion,
            noticeText: policy.noticeText,
            applicationUsageEnabled: policy.applicationUsageEnabled,
            idleDetectionEnabled: policy.idleDetectionEnabled,
            screenshotsEnabled: policy.screenshotsEnabled,
          }
        : null,
  });
}
