import { db, schema } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "@/lib/organization-access";
import { auditMetadata, requestIdFor } from "@/lib/request-audit";

type RouteContext = { params: Promise<{ deviceId: string }> };

export async function POST(request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const { deviceId } = await route.params;
  const device = await db.query.devices.findFirst({
    where: and(
      eq(schema.devices.id, deviceId),
      eq(schema.devices.organizationId, context.organizationId),
    ),
  });
  if (!device) {
    return NextResponse.json({ message: "Device not found" }, { status: 404 });
  }
  if (device.status === "revoked") {
    return NextResponse.json({ status: "revoked" });
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.devices)
      .set({ status: "revoked", revokedAt: now })
      .where(
        and(
          eq(schema.devices.id, device.id),
          eq(schema.devices.organizationId, context.organizationId),
        ),
      );
    await tx
      .update(schema.deviceCredentials)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.deviceCredentials.deviceId, device.id),
          eq(schema.deviceCredentials.organizationId, context.organizationId),
        ),
      );
    await tx.insert(schema.auditLogs).values({
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      action: "device.revoked",
      resourceType: "device",
      resourceId: device.id,
      requestId: requestIdFor(request),
      metadata: auditMetadata({ employeeId: device.employeeId }),
    });
  });
  return NextResponse.json({ status: "revoked" });
}
