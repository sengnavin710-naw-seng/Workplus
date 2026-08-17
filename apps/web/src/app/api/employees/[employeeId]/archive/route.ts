import { db, schema } from "@repo/db";
import { archiveEmployeeSchema } from "@repo/validation";
import { and, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "../../../../../lib/organization-access";

type RouteContext = { params: Promise<{ employeeId: string }> };

export async function POST(request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;

  const parsed = archiveEmployeeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid archive reason" },
      { status: 400 },
    );
  }

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
  if (employee.status === "archived") {
    return NextResponse.json({ status: "archived" });
  }

  const archivedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.employees)
      .set({
        status: "archived",
        archivedAt,
        archivedByUserId: context.session.user.id,
        archiveReason: parsed.data.reason || null,
      })
      .where(
        and(
          eq(schema.employees.id, employee.id),
          eq(schema.employees.organizationId, context.organizationId),
        ),
      );

    const openInvitations = await tx.query.employeeInvitations.findMany({
      columns: { id: true },
      where: and(
        eq(schema.employeeInvitations.organizationId, context.organizationId),
        eq(schema.employeeInvitations.employeeId, employee.id),
        inArray(schema.employeeInvitations.status, ["sent", "pending"]),
      ),
    });
    const invitationIds = openInvitations.map((invitation) => invitation.id);
    if (invitationIds.length) {
      await tx
        .update(schema.employeeInvitations)
        .set({ status: "revoked", revokedAt: archivedAt })
        .where(inArray(schema.employeeInvitations.id, invitationIds));
      await tx
        .update(schema.invitationEmailOutbox)
        .set({
          status: "cancelled",
          encryptedPayload: "",
          lockedAt: null,
          lastError: "Employee was archived",
        })
        .where(
          and(
            inArray(schema.invitationEmailOutbox.invitationId, invitationIds),
            or(
              eq(schema.invitationEmailOutbox.status, "pending"),
              eq(schema.invitationEmailOutbox.status, "processing"),
              eq(schema.invitationEmailOutbox.status, "failed"),
            ),
          ),
        );
    }

    await tx
      .update(schema.devices)
      .set({ status: "revoked", revokedAt: archivedAt })
      .where(
        and(
          eq(schema.devices.organizationId, context.organizationId),
          eq(schema.devices.employeeId, employee.id),
          inArray(schema.devices.status, ["pending", "active"]),
        ),
      );

    if (employee.linkedUserId) {
      await tx
        .delete(schema.organizationMembers)
        .where(
          and(
            eq(schema.organizationMembers.organizationId, context.organizationId),
            eq(schema.organizationMembers.userId, employee.linkedUserId),
          ),
        );
      await tx
        .update(schema.sessions)
        .set({ activeOrganizationId: null })
        .where(
          and(
            eq(schema.sessions.userId, employee.linkedUserId),
            eq(schema.sessions.activeOrganizationId, context.organizationId),
          ),
        );
    }
  });

  return NextResponse.json({ status: "archived", archivedAt });
}
