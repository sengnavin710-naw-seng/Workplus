import { db, schema } from "@repo/db";
import { eq } from "drizzle-orm";
import { agentJson, agentOptions, authenticatedDevice } from "@/lib/agent-api";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

export function OPTIONS(request: Request) {
  return agentOptions(request);
}

export async function POST(request: Request) {
  const credential = await authenticatedDevice(request);
  if (!credential) {
    return agentJson(request, { message: "Device credential is invalid or revoked" }, { status: 401 });
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.deviceCredentials)
      .set({ revokedAt: now })
      .where(eq(schema.deviceCredentials.deviceId, credential.deviceId));
    await tx
      .update(schema.devices)
      .set({ status: "revoked", revokedAt: now })
      .where(eq(schema.devices.id, credential.deviceId));
    await tx.insert(schema.auditLogs).values({
      organizationId: credential.organizationId,
      actorUserId: null,
      action: "device.disconnected",
      resourceType: "device",
      resourceId: credential.deviceId,
      requestId: requestIdFor(request),
      metadata: auditMetadata({ source: "agent" }),
    });
  });
  return agentJson(request, { status: "revoked" });
}
