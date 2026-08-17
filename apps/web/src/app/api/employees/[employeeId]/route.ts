import { db, schema } from "@repo/db";
import { updateEmployeeSchema } from "@repo/validation";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "../../../../lib/organization-access";

type RouteContext = { params: Promise<{ employeeId: string }> };

export async function PATCH(request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;

  const { employeeId } = await route.params;
  const parsed = updateEmployeeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues[0]?.message ?? "Invalid employee details",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const [employee, team] = await Promise.all([
    db.query.employees.findFirst({
      where: and(
        eq(schema.employees.id, employeeId),
        eq(schema.employees.organizationId, context.organizationId),
      ),
    }),
    db.query.teams.findFirst({
      where: and(
        eq(schema.teams.id, parsed.data.teamId),
        eq(schema.teams.organizationId, context.organizationId),
      ),
    }),
  ]);

  if (!employee) {
    return NextResponse.json({ message: "Employee not found" }, { status: 404 });
  }
  if (employee.status === "archived") {
    return NextResponse.json(
      { message: "Restore this employee before editing their profile" },
      { status: 409 },
    );
  }
  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.employees)
      .set({ name: parsed.data.fullName, jobTitle: parsed.data.role })
      .where(
        and(
          eq(schema.employees.id, employee.id),
          eq(schema.employees.organizationId, context.organizationId),
        ),
      );
    await tx
      .delete(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.organizationId, context.organizationId),
          eq(schema.teamMembers.employeeId, employee.id),
        ),
      );
    await tx.insert(schema.teamMembers).values({
      organizationId: context.organizationId,
      teamId: team.id,
      employeeId: employee.id,
    });
    await tx
      .update(schema.employeeInvitations)
      .set({ role: parsed.data.role, teamId: team.id })
      .where(
        and(
          eq(schema.employeeInvitations.organizationId, context.organizationId),
          eq(schema.employeeInvitations.employeeId, employee.id),
          inArray(schema.employeeInvitations.status, ["sent", "pending"]),
        ),
      );
  });

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: parsed.data.fullName,
      role: parsed.data.role,
      team: { id: team.id, name: team.name },
    },
  });
}
