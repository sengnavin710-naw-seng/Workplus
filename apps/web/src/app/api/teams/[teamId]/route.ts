import { db, schema } from "@repo/db";
import { updateTeamSchema } from "@repo/validation";
import { and, eq, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getManageOrganizationContext } from "../../../../lib/organization-access";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function PATCH(request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const { teamId } = await route.params;
  const parsed = updateTeamSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid team" },
      { status: 400 },
    );
  }

  if (parsed.data.name) {
    const duplicate = await db.query.teams.findFirst({
      where: and(
        eq(schema.teams.organizationId, context.organizationId),
        ilike(schema.teams.name, parsed.data.name),
      ),
    });
    if (duplicate && duplicate.id !== teamId) {
      return NextResponse.json(
        { message: "A team with this name already exists" },
        { status: 409 },
      );
    }
  }

  const team = (
    await db
      .update(schema.teams)
      .set(parsed.data)
      .where(
        and(
          eq(schema.teams.id, teamId),
          eq(schema.teams.organizationId, context.organizationId),
        ),
      )
      .returning()
  )[0];
  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 });
  }
  return NextResponse.json({ team });
}

export async function DELETE(_request: Request, route: RouteContext) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const { teamId } = await route.params;
  const team = await db.query.teams.findFirst({
    where: and(
      eq(schema.teams.id, teamId),
      eq(schema.teams.organizationId, context.organizationId),
    ),
    with: { members: true },
  });
  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 });
  }
  if (team.members.length > 0) {
    return NextResponse.json(
      { message: "Move all employees before deleting this team" },
      { status: 409 },
    );
  }

  await db
    .delete(schema.teams)
    .where(
      and(
        eq(schema.teams.id, teamId),
        eq(schema.teams.organizationId, context.organizationId),
      ),
    );
  return new NextResponse(null, { status: 204 });
}
