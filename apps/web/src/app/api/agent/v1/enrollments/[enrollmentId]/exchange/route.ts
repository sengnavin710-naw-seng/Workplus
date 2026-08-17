import { db, schema } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";
import {
  agentJson,
  agentOptions,
  authenticatedEnrollment,
  createOpaqueToken,
  hashOpaqueToken,
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
    enrollment.status !== "authorized" ||
    !enrollment.organizationId ||
    !enrollment.employeeId ||
    !enrollment.trackingPolicyId
  ) {
    return agentJson(request, { message: "Enrollment is not ready" }, { status: 409 });
  }

  const [employee, currentPolicy, consent] = await Promise.all([
    db.query.employees.findFirst({
      where: and(
        eq(schema.employees.id, enrollment.employeeId),
        eq(schema.employees.organizationId, enrollment.organizationId),
        eq(schema.employees.status, "active"),
      ),
    }),
    db.query.trackingPolicies.findFirst({
      where: and(
        eq(schema.trackingPolicies.organizationId, enrollment.organizationId),
        eq(schema.trackingPolicies.status, "published"),
      ),
      orderBy: [desc(schema.trackingPolicies.version)],
    }),
    db.query.employeeConsents.findFirst({
      where: and(
        eq(schema.employeeConsents.organizationId, enrollment.organizationId),
        eq(schema.employeeConsents.employeeId, enrollment.employeeId),
        eq(schema.employeeConsents.trackingPolicyId, enrollment.trackingPolicyId),
        eq(schema.employeeConsents.status, "accepted"),
      ),
    }),
  ]);
  if (!employee) {
    return agentJson(request, { message: "Employee is not active" }, { status: 403 });
  }
  if (
    !currentPolicy ||
    currentPolicy.id !== enrollment.trackingPolicyId ||
    (currentPolicy.requiresConsent && !consent)
  ) {
    return agentJson(request, { message: "Current privacy consent is required" }, { status: 428 });
  }

  const credential = createOpaqueToken("wpd");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  const result = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(schema.deviceEnrollmentSessions)
      .set({ status: "completed", completedAt: now })
      .where(
        and(
          eq(schema.deviceEnrollmentSessions.id, enrollment.id),
          eq(schema.deviceEnrollmentSessions.status, "authorized"),
        ),
      )
      .returning({ id: schema.deviceEnrollmentSessions.id });
    if (!claimed) return null;

    const [device] = enrollment.deviceId
      ? await tx
          .update(schema.devices)
          .set({
            name: enrollment.deviceName,
            platform: enrollment.platform,
            osVersion: enrollment.osVersion,
            agentVersion: enrollment.agentVersion,
            status: "active",
            lastSeenAt: now,
            revokedAt: null,
          })
          .where(
            and(
              eq(schema.devices.id, enrollment.deviceId),
              eq(schema.devices.organizationId, enrollment.organizationId!),
              eq(schema.devices.employeeId, enrollment.employeeId!),
            ),
          )
          .returning()
      : await tx
          .insert(schema.devices)
          .values({
            organizationId: enrollment.organizationId!,
            employeeId: enrollment.employeeId!,
            name: enrollment.deviceName,
            platform: enrollment.platform,
            osVersion: enrollment.osVersion,
            agentVersion: enrollment.agentVersion,
            status: "active",
            connectedAt: now,
            lastSeenAt: now,
          })
          .returning();
    if (!device) throw new Error("Device could not be registered");
    if (enrollment.deviceId) {
      await tx
        .update(schema.deviceCredentials)
        .set({ revokedAt: now })
        .where(eq(schema.deviceCredentials.deviceId, device.id));
    }
    await tx.insert(schema.deviceCredentials).values({
      organizationId: enrollment.organizationId!,
      deviceId: device.id,
      credentialPrefix: credential.slice(0, 12),
      credentialHash: hashOpaqueToken(credential),
      expiresAt,
    });
    await tx.insert(schema.auditLogs).values({
      organizationId: enrollment.organizationId!,
      actorUserId: enrollment.authorizedByUserId,
      action: enrollment.deviceId ? "device.reauthorized" : "device.connected",
      resourceType: "device",
      resourceId: device.id,
      requestId: requestIdFor(request),
      metadata: auditMetadata({
        employeeId: enrollment.employeeId,
        platform: enrollment.platform,
        agentVersion: enrollment.agentVersion,
      }),
    });
    return device;
  });

  if (!result) {
    return agentJson(request, { message: "Enrollment was already completed" }, { status: 409 });
  }
  return agentJson(request, {
    credential,
    expiresAt,
    device: {
      id: result.id,
      name: result.name,
      status: result.status,
      tracking: "off",
    },
  });
}
