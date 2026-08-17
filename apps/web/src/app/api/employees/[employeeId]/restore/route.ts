import { db, schema } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "../../../../../lib/organization-access";

type RouteContext = { params: Promise<{ employeeId: string }> };

export async function POST(_request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;

  const { employeeId } = await route.params;
  const employee = await db.query.employees.findFirst({
    where: and(
      eq(schema.employees.id, employeeId),
      eq(schema.employees.organizationId, context.organizationId),
    ),
  });
  if (!employee) {
    return NextResponse.json({ message: "Employee not found" }, { status: 404 });
  }
  if (employee.status !== "archived") {
    return NextResponse.json({ status: employee.status });
  }

  const restoredStatus = employee.linkedUserId ? "active" : "pending";
  await db.transaction(async (tx) => {
    await tx
      .update(schema.employees)
      .set({
        status: restoredStatus,
        archivedAt: null,
        archivedByUserId: null,
        archiveReason: null,
      })
      .where(
        and(
          eq(schema.employees.id, employee.id),
          eq(schema.employees.organizationId, context.organizationId),
        ),
      );
    if (employee.linkedUserId) {
      await tx
        .insert(schema.organizationMembers)
        .values({
          organizationId: context.organizationId,
          userId: employee.linkedUserId,
          role: "employee",
        })
        .onConflictDoNothing();
    }
  });

  return NextResponse.json({ status: restoredStatus });
}
