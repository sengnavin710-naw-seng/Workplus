import { db, schema } from "@repo/db";
import { teamSchema } from "@repo/validation";
import { and, desc, eq, ilike, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "../../../lib/organization-access";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function GET() {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;

  const [teams, employees] = await Promise.all([
    db.query.teams.findMany({
      where: eq(schema.teams.organizationId, context.organizationId),
      with: {
        members: {
          with: {
            employee: {
              with: {
                invitations: {
                  orderBy: [desc(schema.employeeInvitations.createdAt)],
                  limit: 1,
                },
              },
            },
          },
        },
      },
      orderBy: [schema.teams.name],
    }),
    db.query.employees.findMany({
      where: and(
        eq(schema.employees.organizationId, context.organizationId),
        ne(schema.employees.status, "archived"),
      ),
      with: {
        invitations: {
          orderBy: [desc(schema.employeeInvitations.createdAt)],
          limit: 1,
        },
      },
      orderBy: [schema.employees.name],
    }),
  ]);

  return NextResponse.json({
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      color: team.color,
      icon: team.icon,
      utilizationGoal: team.utilizationGoal,
      members: team.members
        .filter(({ employee }) => employee.status !== "archived")
        .map(({ employee }) => ({
        id: employee.id,
        name: employee.name,
        role:
          employee.jobTitle ??
          employee.invitations[0]?.role ??
          "Customer Service",
        status: employee.status,
        })),
    })),
    employees: employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role:
        employee.jobTitle ?? employee.invitations[0]?.role ?? "Customer Service",
      status: employee.status,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;

  const parsed = teamSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid team" },
      { status: 400 },
    );
  }

  const duplicate = await db.query.teams.findFirst({
    where: and(
      eq(schema.teams.organizationId, context.organizationId),
      ilike(schema.teams.name, parsed.data.name),
    ),
  });
  if (duplicate) {
    return NextResponse.json(
      { message: "A team with this name already exists" },
      { status: 409 },
    );
  }

  try {
    const team = (
      await db
        .insert(schema.teams)
        .values({
          organizationId: context.organizationId,
          ...parsed.data,
        })
        .returning()
    )[0];
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { message: "A team with this name already exists" },
        { status: 409 },
      );
    }
    throw error;
  }
}
