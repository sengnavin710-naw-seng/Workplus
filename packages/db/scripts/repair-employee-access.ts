import { and, eq, isNotNull, ne } from "drizzle-orm";
import { closeDatabaseConnection, db, schema } from "../src";

async function repairEmployeeAccess() {
  const [accessibleEmployees, archivedEmployees] = await Promise.all([
    db.query.employees.findMany({
      columns: { linkedUserId: true, organizationId: true },
      where: and(
        isNotNull(schema.employees.linkedUserId),
        ne(schema.employees.status, "archived"),
      ),
    }),
    db.query.employees.findMany({
      columns: { linkedUserId: true, organizationId: true },
      where: and(
        isNotNull(schema.employees.linkedUserId),
        eq(schema.employees.status, "archived"),
      ),
    }),
  ]);

  let membershipsAdded = 0;
  let archivedMembershipsRemoved = 0;
  await db.transaction(async (tx) => {
    for (const employee of accessibleEmployees) {
      if (!employee.linkedUserId) continue;
      const inserted = await tx
        .insert(schema.organizationMembers)
        .values({
          organizationId: employee.organizationId,
          userId: employee.linkedUserId,
          role: "employee",
        })
        .onConflictDoNothing()
        .returning({ id: schema.organizationMembers.id });
      membershipsAdded += inserted.length;
    }

    for (const employee of archivedEmployees) {
      if (!employee.linkedUserId) continue;
      const removed = await tx
        .delete(schema.organizationMembers)
        .where(
          and(
            eq(
              schema.organizationMembers.organizationId,
              employee.organizationId,
            ),
            eq(schema.organizationMembers.userId, employee.linkedUserId),
          ),
        )
        .returning({ id: schema.organizationMembers.id });
      archivedMembershipsRemoved += removed.length;
      await tx
        .update(schema.sessions)
        .set({ activeOrganizationId: null })
        .where(
          and(
            eq(schema.sessions.userId, employee.linkedUserId),
            eq(
              schema.sessions.activeOrganizationId,
              employee.organizationId,
            ),
          ),
        );
    }
  });

  console.log(
    JSON.stringify({
      archivedMembershipsRemoved,
      linkedEmployeesChecked: accessibleEmployees.length,
      membershipsAdded,
    }),
  );
}

try {
  await repairEmployeeAccess();
} finally {
  await closeDatabaseConnection();
}
