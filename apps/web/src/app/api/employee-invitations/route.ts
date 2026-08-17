import { db, schema } from "@repo/db";
import { personalEmployeeInvitationBatchSchema } from "@repo/validation";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  encryptInvitationEmailPayload,
  processInvitationEmailOutbox,
} from "../../../lib/invitation-email-outbox";
import { getManageOrganizationContext } from "../../../lib/organization-access";

const manageInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  action: z.enum(["revoke", "resend"]),
});

const invitationExpiryMs = 7 * 24 * 60 * 60 * 1000;
const resendCooldownMs = 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function invitationExpiry() {
  return new Date(Date.now() + invitationExpiryMs);
}

function resendCooldown(invitation: {
  lastEmailSentAt: Date | null;
}) {
  if (!invitation.lastEmailSentAt) return null;

  const retryAfterMs =
    invitation.lastEmailSentAt.getTime() + resendCooldownMs - Date.now();
  if (retryAfterMs <= 0) return null;

  return Math.ceil(retryAfterMs / 1000);
}

export async function GET(request: Request) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const includeArchived = new URL(request.url).searchParams.get("status") === "archived";
  const rows = await db.query.employees.findMany({
    where: and(
      eq(schema.employees.organizationId, context.organizationId),
      includeArchived
        ? eq(schema.employees.status, "archived")
        : or(
            eq(schema.employees.status, "pending"),
            eq(schema.employees.status, "active"),
          ),
    ),
    with: {
      teamMemberships: { with: { team: true } },
      devices: true,
      invitations: { orderBy: [desc(schema.employeeInvitations.createdAt)] },
    },
    orderBy: [desc(schema.employees.createdAt)],
  });
  return NextResponse.json({
    employees: rows.map((employee) => {
      const invitation = employee.invitations[0];
      const team = employee.teamMemberships[0]?.team;
      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        teamId: team?.id ?? null,
        team: team?.name ?? "Unassigned",
        role: employee.jobTitle ?? invitation?.role ?? "Customer Service",
        employeeStatus: employee.status,
        archivedAt: employee.archivedAt,
        archiveReason: employee.archiveReason,
        devices: employee.devices.map((device) => ({
          id: device.id,
          agentVersion: device.agentVersion,
          lastSeenAt: device.lastSeenAt,
          status: device.status,
        })),
        invitation: invitation
          ? {
              id: invitation.id,
              status: invitation.status,
              expiresAt: invitation.expiresAt,
              deliveryStatus: invitation.deliveryStatus,
              deliveryUpdatedAt: invitation.deliveryUpdatedAt,
              deliveryError: invitation.deliveryError,
              lastEmailSentAt: invitation.lastEmailSentAt,
            }
          : null,
      };
    }),
  });
}

export async function POST(request: Request) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const body: unknown = await request.json();
  const bodyRecord =
    typeof body === "object" && body !== null
      ? (body as { employees?: unknown })
      : {};
  const rawEntries = Array.isArray(bodyRecord.employees)
    ? bodyRecord.employees
    : [body];
  const parsed = personalEmployeeInvitationBatchSchema.safeParse(rawEntries);
  if (!parsed.success)
    return NextResponse.json(
      {
        message: "Invalid employee invitation",
        rowErrors: parsed.error.issues.map((issue) => ({
          row: typeof issue.path[0] === "number" ? issue.path[0] : null,
          field: typeof issue.path[1] === "string" ? issue.path[1] : null,
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  const baseUrl = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
  const prepared = [];
  for (const [row, entry] of parsed.data.entries()) {
    try {
      const item = await db.transaction(async (tx) => {
        const team = await tx.query.teams.findFirst({
          where: and(
            eq(schema.teams.organizationId, context.organizationId),
            eq(schema.teams.id, entry.teamId),
          ),
        });
        if (!team) throw new Error("Team not found");

        const existingEmployee = await tx.query.employees.findFirst({
          where: and(
            eq(schema.employees.organizationId, context.organizationId),
            eq(schema.employees.email, entry.email),
          ),
        });
        if (existingEmployee?.status === "archived")
          throw new Error("Restore this archived employee before sending an invitation");
        const employee =
          existingEmployee ??
          (
            await tx
              .insert(schema.employees)
              .values({
                organizationId: context.organizationId,
                name: entry.fullName,
                jobTitle: entry.role,
                email: entry.email,
                status: "pending",
              })
              .returning()
          )[0];
        if (!employee) throw new Error("Employee could not be created");

        const existingInvitation = existingEmployee
          ? await tx.query.employeeInvitations.findFirst({
              where: and(
                eq(
                  schema.employeeInvitations.organizationId,
                  context.organizationId,
                ),
                eq(schema.employeeInvitations.employeeId, employee.id),
              ),
              orderBy: [desc(schema.employeeInvitations.createdAt)],
            })
          : null;
        if (
          existingEmployee?.linkedUserId ||
          existingInvitation?.status === "accepted"
        )
          throw new Error("This employee has already accepted their invitation");
        const cooldownSeconds = existingInvitation
          ? resendCooldown(existingInvitation)
          : null;
        if (cooldownSeconds)
          throw new Error(
            `Please wait ${cooldownSeconds} seconds before sending another invitation.`,
          );

        if (existingInvitation) {
          const retryableOutbox = await tx.query.invitationEmailOutbox.findFirst({
            where: and(
              eq(
                schema.invitationEmailOutbox.invitationId,
                existingInvitation.id,
              ),
              or(
                eq(schema.invitationEmailOutbox.status, "pending"),
                eq(schema.invitationEmailOutbox.status, "processing"),
                eq(schema.invitationEmailOutbox.status, "failed"),
              ),
            ),
            orderBy: [desc(schema.invitationEmailOutbox.createdAt)],
          });
          if (retryableOutbox)
            return {
              row,
              id: existingInvitation.id,
              email: entry.email,
              action: "retry",
              outboxId: retryableOutbox.id,
            };
        }

        if (existingEmployee) {
          await tx
            .update(schema.employees)
            .set({ name: entry.fullName, jobTitle: entry.role })
            .where(eq(schema.employees.id, existingEmployee.id));
        }

        const token = randomBytes(32).toString("base64url");
        const invitation = existingInvitation
          ? (
              await tx
                .update(schema.employeeInvitations)
                .set({
                  email: entry.email,
                  teamId: team.id,
                  role: entry.role,
                  tokenHash: hashToken(token),
                  status: "sent",
                  resendEmailId: null,
                  deliveryStatus: "not_sent",
                  deliveryUpdatedAt: new Date(),
                  deliveryError: null,
                  expiresAt: invitationExpiry(),
                  acceptedAt: null,
                  revokedAt: null,
                  invitedByUserId: context.session.user.id,
                })
                .where(eq(schema.employeeInvitations.id, existingInvitation.id))
                .returning()
            )[0]
          : (
              await tx
                .insert(schema.employeeInvitations)
                .values({
                  organizationId: context.organizationId,
                  employeeId: employee.id,
                  email: entry.email,
                  teamId: team.id,
                  role: entry.role,
                  tokenHash: hashToken(token),
                  status: "sent",
                  deliveryStatus: "not_sent",
                  deliveryUpdatedAt: new Date(),
                  expiresAt: invitationExpiry(),
                  invitedByUserId: context.session.user.id,
                })
                .returning()
            )[0];
        if (!invitation) throw new Error("Invitation could not be created");

        await tx
          .delete(schema.teamMembers)
          .where(
            and(
              eq(schema.teamMembers.organizationId, context.organizationId),
              eq(schema.teamMembers.employeeId, employee.id),
            ),
          );
        await tx
          .insert(schema.teamMembers)
          .values({
            organizationId: context.organizationId,
            teamId: team.id,
            employeeId: employee.id,
          });
        const outboxIdempotencyKey = `employee-invite/${invitation.id}/${randomUUID()}`;
        const outbox = (
          await tx
            .insert(schema.invitationEmailOutbox)
            .values({
              organizationId: context.organizationId,
              invitationId: invitation.id,
              idempotencyKey: outboxIdempotencyKey,
              encryptedPayload: encryptInvitationEmailPayload({
                employeeName: entry.fullName,
                inviteUrl: `${baseUrl}/employee-invite/${token}`,
                isResend: Boolean(existingInvitation),
                to: entry.email,
              }),
            })
            .returning()
        )[0];
        if (!outbox) throw new Error("Invitation email could not be queued");
        return {
          row,
          id: invitation.id,
          email: entry.email,
          action: existingInvitation ? "resent" : "created",
          outboxId: outbox.id,
        };
      });
      prepared.push(item);
    } catch (error) {
      prepared.push({
        row,
        id: null,
        email: entry.email,
        action: "failed",
        outboxId: null,
        error: error instanceof Error ? error.message : "Invitation could not be created",
      });
    }
  }

  const results = [];
  for (const item of prepared) {
    if (!item.outboxId) {
      results.push({ ...item, emailDelivery: "failed" });
      continue;
    }
    const delivery = await processInvitationEmailOutbox(item.outboxId);
    results.push({
      ...item,
      emailDelivery: delivery.status,
      resendEmailId: delivery.resendEmailId,
      error: delivery.status === "failed" ? delivery.message : undefined,
    });
  }
  const sentCount = results.filter(
    (result) => result.emailDelivery === "queued",
  ).length;
  return NextResponse.json(
    {
      invitations: results,
      summary: { total: results.length, sent: sentCount, failed: results.length - sentCount },
    },
    { status: sentCount ? 201 : 502 },
  );
}

export async function PATCH(request: Request) {
  const context = await getManageOrganizationContext();
  if ("error" in context) return context.error;
  const parsed = manageInvitationSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { message: "Invalid invitation action" },
      { status: 400 },
    );
  const invitation = await db.query.employeeInvitations.findFirst({
    where: and(
      eq(schema.employeeInvitations.id, parsed.data.invitationId),
      eq(schema.employeeInvitations.organizationId, context.organizationId),
    ),
  });
  if (!invitation)
    return NextResponse.json(
      { message: "Invitation not found" },
      { status: 404 },
    );
  if (parsed.data.action === "revoke") {
    if (invitation.status === "revoked")
      return NextResponse.json({ status: "revoked" });
    if (invitation.status === "accepted" || invitation.status === "expired")
      return NextResponse.json(
        {
          message:
            invitation.status === "accepted"
              ? "Accepted invitations cannot be revoked"
              : "Expired invitations do not need to be revoked",
        },
        { status: 409 },
      );

    const revoked = await db.transaction(async (tx) => {
      const updatedInvitation = (
        await tx
        .update(schema.employeeInvitations)
        .set({ status: "revoked", revokedAt: new Date() })
          .where(
            and(
              eq(schema.employeeInvitations.id, invitation.id),
              eq(
                schema.employeeInvitations.organizationId,
                context.organizationId,
              ),
              inArray(schema.employeeInvitations.status, ["sent", "pending"]),
            ),
          )
          .returning({ id: schema.employeeInvitations.id })
      )[0];
      if (!updatedInvitation) return false;

      await tx
        .update(schema.invitationEmailOutbox)
        .set({
          status: "cancelled",
          encryptedPayload: "",
          lockedAt: null,
          lastError: "Invitation was revoked",
        })
        .where(
          and(
            eq(schema.invitationEmailOutbox.invitationId, invitation.id),
            or(
              eq(schema.invitationEmailOutbox.status, "pending"),
              eq(schema.invitationEmailOutbox.status, "processing"),
              eq(schema.invitationEmailOutbox.status, "failed"),
            ),
          ),
        );
      return true;
    });
    if (!revoked) {
      const currentInvitation =
        await db.query.employeeInvitations.findFirst({
          where: and(
            eq(schema.employeeInvitations.id, invitation.id),
            eq(
              schema.employeeInvitations.organizationId,
              context.organizationId,
            ),
          ),
        });
      if (currentInvitation?.status === "revoked")
        return NextResponse.json({ status: "revoked" });
      return NextResponse.json(
        { message: "This invitation is no longer available to revoke" },
        { status: 409 },
      );
    }
    return NextResponse.json({ status: "revoked" });
  }
  if (invitation.status === "accepted")
    return NextResponse.json(
      { message: "Accepted invitations cannot be resent" },
      { status: 409 },
    );
  const cooldownSeconds = resendCooldown(invitation);
  if (cooldownSeconds) {
    return NextResponse.json(
      {
        message: `Please wait ${cooldownSeconds} seconds before resending this invitation.`,
        retryAfterSeconds: cooldownSeconds,
      },
      { status: 429, headers: { "Retry-After": String(cooldownSeconds) } },
    );
  }
  const employee = await db.query.employees.findFirst({
    where: and(
      eq(schema.employees.id, invitation.employeeId),
      eq(schema.employees.organizationId, context.organizationId),
    ),
  });
  if (!employee)
    return NextResponse.json(
      { message: "Employee not found for this invitation" },
      { status: 404 },
    );
  const retryableOutbox = await db.query.invitationEmailOutbox.findFirst({
    where: and(
      eq(schema.invitationEmailOutbox.invitationId, invitation.id),
      or(
        eq(schema.invitationEmailOutbox.status, "pending"),
        eq(schema.invitationEmailOutbox.status, "processing"),
        eq(schema.invitationEmailOutbox.status, "failed"),
      ),
    ),
    orderBy: [desc(schema.invitationEmailOutbox.createdAt)],
  });
  if (retryableOutbox) {
    const retry = await processInvitationEmailOutbox(retryableOutbox.id);
    if (retry.status === "failed")
      return NextResponse.json({ message: retry.message }, { status: 502 });
    return NextResponse.json({
      status: "sent",
      emailDelivery: retry.status,
      resendEmailId: retry.resendEmailId,
    });
  }
  const token = randomBytes(32).toString("base64url");
  const outbox = await db.transaction(async (tx) => {
    const refreshedInvitation = (
      await tx
        .update(schema.employeeInvitations)
        .set({
          tokenHash: hashToken(token),
          status: "sent",
          resendEmailId: null,
          deliveryStatus: "not_sent",
          deliveryUpdatedAt: new Date(),
          deliveryError: null,
          expiresAt: invitationExpiry(),
          acceptedAt: null,
          revokedAt: null,
        })
        .where(
          and(
            eq(schema.employeeInvitations.id, invitation.id),
            eq(
              schema.employeeInvitations.organizationId,
              context.organizationId,
            ),
            inArray(schema.employeeInvitations.status, [
              "sent",
              "pending",
              "revoked",
              "expired",
            ]),
          ),
        )
        .returning({ id: schema.employeeInvitations.id })
    )[0];
    if (!refreshedInvitation) return null;
    return (
      await tx
        .insert(schema.invitationEmailOutbox)
        .values({
          organizationId: context.organizationId,
          invitationId: invitation.id,
          idempotencyKey: `employee-invite/${invitation.id}/${randomUUID()}`,
          encryptedPayload: encryptInvitationEmailPayload({
            employeeName: employee.name,
            inviteUrl: `${process.env.BETTER_AUTH_URL ?? new URL(request.url).origin}/employee-invite/${token}`,
            isResend: true,
            to: invitation.email,
          }),
        })
        .returning()
    )[0];
  });
  if (!outbox)
    return NextResponse.json(
      { message: "This invitation is no longer available to resend" },
      { status: 409 },
    );
  const delivery = await processInvitationEmailOutbox(outbox.id);
  if (delivery.status === "failed")
    return NextResponse.json({ message: delivery.message }, { status: 502 });
  return NextResponse.json({
    status: "sent",
    emailDelivery: delivery.status,
    resendEmailId: delivery.resendEmailId,
  });
}
