import { db, schema } from "@repo/db";
import { deviceHeartbeatSchema } from "@repo/validation";
import { and, desc, eq } from "drizzle-orm";
import { agentJson, agentOptions, authenticatedDevice } from "@/lib/agent-api";

export function OPTIONS(request: Request) {
  return agentOptions(request);
}

export async function POST(request: Request) {
  const credential = await authenticatedDevice(request);
  if (!credential) {
    return agentJson(request, { message: "Device credential is invalid or revoked" }, { status: 401 });
  }
  const parsed = deviceHeartbeatSchema.safeParse(await request.json());
  if (!parsed.success) {
    return agentJson(request, { message: "Invalid heartbeat" }, { status: 400 });
  }

  const policy = await db.query.trackingPolicies.findFirst({
    where: and(
      eq(schema.trackingPolicies.organizationId, credential.organizationId),
      eq(schema.trackingPolicies.status, "published"),
    ),
    orderBy: [desc(schema.trackingPolicies.version)],
  });
  if (!policy) {
    return agentJson(request, { message: "A published privacy policy is required" }, { status: 428 });
  }
  if (policy.requiresConsent) {
    const consent = await db.query.employeeConsents.findFirst({
      where: and(
        eq(schema.employeeConsents.organizationId, credential.organizationId),
        eq(schema.employeeConsents.employeeId, credential.device.employeeId),
        eq(schema.employeeConsents.trackingPolicyId, policy.id),
        eq(schema.employeeConsents.status, "accepted"),
      ),
    });
    if (!consent) {
      return agentJson(request, { message: "Consent to the current policy is required", code: "consent_required" }, { status: 428 });
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.deviceCredentials)
      .set({ lastUsedAt: now })
      .where(eq(schema.deviceCredentials.id, credential.id));
    await tx
      .update(schema.devices)
      .set({
        lastSeenAt: now,
        agentVersion: parsed.data.agentVersion,
        osVersion: parsed.data.osVersion,
      })
      .where(eq(schema.devices.id, credential.deviceId));
  });

  return agentJson(request, {
    status: "online",
    tracking: "off",
    serverTime: now,
    policyVersion: policy.version,
    employee: {
      name: credential.device.employee.name,
      organizationName: credential.device.organization.name,
    },
  });
}
