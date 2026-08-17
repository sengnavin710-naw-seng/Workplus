import { db, schema } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDashboardIdentity } from "@/auth/server";
import { isAdminRole } from "./access-policy";

export async function getEmployeeOrganizationContext() {
  const identity = await getDashboardIdentity();
  if (!identity) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  if (!identity.activeOrganization) {
    return {
      error: NextResponse.json(
        { message: "Active organization is required" },
        { status: 412 },
      ),
    } as const;
  }
  if (isAdminRole(identity.role)) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    } as const;
  }

  const employee = await db.query.employees.findFirst({
    where: and(
      eq(schema.employees.organizationId, identity.activeOrganization.id),
      eq(schema.employees.linkedUserId, identity.session.user.id),
      eq(schema.employees.status, "active"),
    ),
  });
  if (!employee) {
    return {
      error: NextResponse.json(
        { message: "Employee profile not found" },
        { status: 404 },
      ),
    } as const;
  }

  return {
    employee,
    organizationId: identity.activeOrganization.id,
    session: identity.session,
  } as const;
}
