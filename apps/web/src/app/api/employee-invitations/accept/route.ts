import { auth } from "@repo/auth";
import { db, schema } from "@repo/db";
import { and, eq, gt, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const tokenSchema = z.string().min(32).max(200);
const acceptSchema = z.object({
  token: tokenSchema,
  password: z.string().min(8).max(128).optional(),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sameEmail(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

async function findInvitation(token: string) {
  return db.query.employeeInvitations.findFirst({
    where: eq(schema.employeeInvitations.tokenHash, hashToken(token)),
    with: { employee: true, organization: true },
  });
}

function invitationIsOpen(
  invitation: Awaited<ReturnType<typeof findInvitation>>,
) {
  return Boolean(
    invitation &&
      (invitation.status === "sent" || invitation.status === "pending") &&
      invitation.expiresAt.getTime() > Date.now() &&
      invitation.employee.status !== "archived",
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const parsedToken = tokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return NextResponse.json({ message: "Invalid invitation" }, { status: 400 });
  }

  const invitation = await findInvitation(parsedToken.data);
  if (!invitationIsOpen(invitation)) {
    return NextResponse.json(
      { message: "This invitation is invalid or expired" },
      { status: 400 },
    );
  }

  const [existingUser, session] = await Promise.all([
    db.query.users.findFirst({
      columns: { id: true },
      where: ilike(schema.users.email, invitation!.email),
    }),
    auth.api.getSession({ headers: await headers() }),
  ]);

  return NextResponse.json({
    accountExists: Boolean(existingUser),
    authenticated: Boolean(session),
    authenticatedAsInvitee: Boolean(
      session && sameEmail(session.user.email, invitation!.email),
    ),
    employeeName: invitation!.employee.name,
    organizationName: invitation!.organization.name,
  });
}

export async function POST(request: Request) {
  const parsed = acceptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid invitation" }, { status: 400 });
  }

  const invitation = await findInvitation(parsed.data.token);
  if (!invitationIsOpen(invitation)) {
    if (
      invitation &&
      (invitation.status === "sent" || invitation.status === "pending") &&
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      await db
        .update(schema.employeeInvitations)
        .set({ status: "expired" })
        .where(
          and(
            eq(schema.employeeInvitations.id, invitation.id),
            inArray(schema.employeeInvitations.status, ["sent", "pending"]),
          ),
        );
    }
    return NextResponse.json(
      { message: "This invitation is invalid or expired" },
      { status: 400 },
    );
  }

  const requestHeaders = await headers();
  const [existingUser, session] = await Promise.all([
    db.query.users.findFirst({
      where: ilike(schema.users.email, invitation!.email),
    }),
    auth.api.getSession({ headers: requestHeaders }),
  ]);

  let userId = existingUser?.id;
  if (existingUser) {
    if (!session || !sameEmail(session.user.email, invitation!.email)) {
      return NextResponse.json(
        { message: "Sign in with the invited email before accepting" },
        { status: 401 },
      );
    }
  } else {
    if (!parsed.data.password) {
      return NextResponse.json(
        { message: "Create a password to accept this invitation" },
        { status: 400 },
      );
    }
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: invitation!.email,
          name: invitation!.employee.name,
          password: parsed.data.password,
        },
      });
      userId = result.user.id;
    } catch {
      return NextResponse.json(
        { message: "Unable to create the employee account" },
        { status: 400 },
      );
    }
  }

  if (!userId) {
    return NextResponse.json(
      { message: "Unable to link the employee account" },
      { status: 500 },
    );
  }

  const accepted = await db
    .transaction(async (tx) => {
      const acceptedInvitation = (
        await tx
          .update(schema.employeeInvitations)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(
            and(
              eq(schema.employeeInvitations.id, invitation!.id),
              inArray(schema.employeeInvitations.status, ["sent", "pending"]),
              gt(schema.employeeInvitations.expiresAt, new Date()),
            ),
          )
          .returning({ id: schema.employeeInvitations.id })
      )[0];
      if (!acceptedInvitation) return false;

      const linkedEmployee = (
        await tx
          .update(schema.employees)
          .set({ linkedUserId: userId, status: "active" })
          .where(
            and(
              eq(schema.employees.id, invitation!.employeeId),
              eq(schema.employees.organizationId, invitation!.organizationId),
              or(
                isNull(schema.employees.linkedUserId),
                eq(schema.employees.linkedUserId, userId),
              ),
              ne(schema.employees.status, "archived"),
            ),
          )
          .returning({ id: schema.employees.id })
      )[0];
      if (!linkedEmployee) throw new Error("EMPLOYEE_LINK_CONFLICT");

      await tx
        .insert(schema.organizationMembers)
        .values({
          organizationId: invitation!.organizationId,
          userId,
          role: "employee",
        })
        .onConflictDoNothing();
      await tx
        .update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.id, userId));
      return true;
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === "EMPLOYEE_LINK_CONFLICT")
        return false;
      throw error;
    });

  if (!accepted) {
    return NextResponse.json(
      { message: "This invitation is no longer available" },
      { status: 409 },
    );
  }

  if (session && session.user.id === userId) {
    await auth.api.setActiveOrganization({
      body: { organizationId: invitation!.organizationId },
      headers: requestHeaders,
    });
  }

  return NextResponse.json({
    accountCreated: !existingUser,
    employeeId: invitation!.employeeId,
    status: "accepted",
  });
}
