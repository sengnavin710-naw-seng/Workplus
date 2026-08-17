import { db, schema } from "@repo/db";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "@/lib/organization-access";

export async function GET() {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const devices = await db.query.devices.findMany({
    where: eq(schema.devices.organizationId, context.organizationId),
    with: { employee: true },
    orderBy: [desc(schema.devices.createdAt)],
  });
  const onlineThreshold = Date.now() - 90_000;
  return NextResponse.json({
    devices: devices.map((device) => ({
      id: device.id,
      name: device.name,
      platform: device.platform,
      osVersion: device.osVersion,
      agentVersion: device.agentVersion,
      status: device.status,
      connectionStatus:
        device.status === "revoked"
          ? "revoked"
          : device.lastSeenAt && device.lastSeenAt.getTime() >= onlineThreshold
            ? "online"
            : "offline",
      connectedAt: device.connectedAt,
      lastSeenAt: device.lastSeenAt,
      employee: {
        id: device.employee.id,
        name: device.employee.name,
        email: device.employee.email,
      },
    })),
  });
}
