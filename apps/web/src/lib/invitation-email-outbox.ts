import { sendEmployeeInvitationEmail } from "@repo/auth";
import { db, schema } from "@repo/db";
import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { reconcileResendWebhookEvents } from "./resend-webhook-events";

export interface InvitationEmailPayload {
  employeeName: string;
  inviteUrl: string;
  isResend: boolean;
  to: string;
}

function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  return createHash("sha256").update(secret).digest();
}

export function encryptInvitationEmailPayload(
  payload: InvitationEmailPayload,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function decryptInvitationEmailPayload(value: string): InvitationEmailPayload {
  const [encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext)
    throw new Error("Invalid invitation outbox payload");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as InvitationEmailPayload;
}

export async function processInvitationEmailOutbox(outboxId: string) {
  const now = new Date();
  const claimed = (
    await db
      .update(schema.invitationEmailOutbox)
      .set({
        status: "processing",
        lockedAt: new Date(),
        attemptCount: sql`${schema.invitationEmailOutbox.attemptCount} + 1`,
        lastError: null,
      })
      .where(
        and(
          eq(schema.invitationEmailOutbox.id, outboxId),
          or(
            eq(schema.invitationEmailOutbox.status, "pending"),
            and(
              eq(schema.invitationEmailOutbox.status, "failed"),
              lte(schema.invitationEmailOutbox.availableAt, now),
            ),
          ),
        ),
      )
      .returning()
  )[0];
  if (!claimed) {
    const existing = await db.query.invitationEmailOutbox.findFirst({
      where: eq(schema.invitationEmailOutbox.id, outboxId),
    });
    if (existing?.status === "sent")
      return { status: "queued" as const, resendEmailId: null };
    if (
      existing?.status === "failed" &&
      existing.availableAt.getTime() > now.getTime()
    )
      return {
        status: "failed" as const,
        message: `Retry available in ${Math.ceil((existing.availableAt.getTime() - now.getTime()) / 1000)} seconds`,
      };
    return { status: "failed" as const, message: "Email is already processing" };
  }

  const invitation = await db.query.employeeInvitations.findFirst({
    where: eq(schema.employeeInvitations.id, claimed.invitationId),
    with: { employee: true },
  });
  if (
    !invitation ||
    invitation.status === "revoked" ||
    invitation.status === "accepted" ||
    invitation.status === "expired" ||
    invitation.employee.status === "archived"
  ) {
    await db
      .update(schema.invitationEmailOutbox)
      .set({
        status: "cancelled",
        encryptedPayload: "",
        lockedAt: null,
        lastError: "Invitation is no longer active",
      })
      .where(eq(schema.invitationEmailOutbox.id, outboxId));
    return {
      status: "failed" as const,
      message: "Invitation is no longer active",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    await markFailed(outboxId, claimed.invitationId, "Email delivery is not configured");
    return { status: "failed" as const, message: "Email delivery is not configured" };
  }

  try {
    const payload = decryptInvitationEmailPayload(claimed.encryptedPayload);
    const { id: resendEmailId } = await sendEmployeeInvitationEmail({
      apiKey,
      from,
      idempotencyKey: claimed.idempotencyKey,
      ...payload,
    });
    const sentAt = new Date();
    const recorded = await db.transaction(async (tx) => {
      const completedOutbox = (
        await tx
        .update(schema.invitationEmailOutbox)
        .set({
          status: "sent",
          encryptedPayload: "",
          sentAt,
          lockedAt: null,
          lastError: null,
        })
          .where(
            and(
              eq(schema.invitationEmailOutbox.id, outboxId),
              eq(schema.invitationEmailOutbox.status, "processing"),
            ),
          )
          .returning({ id: schema.invitationEmailOutbox.id })
      )[0];
      if (!completedOutbox) return false;

      await tx
        .update(schema.employeeInvitations)
        .set({
          resendEmailId,
          deliveryStatus: "queued",
          deliveryUpdatedAt: sentAt,
          deliveryError: null,
          lastEmailSentAt: sentAt,
        })
        .where(
          and(
            eq(schema.employeeInvitations.id, claimed.invitationId),
            inArray(schema.employeeInvitations.status, ["sent", "pending"]),
          ),
        );
      return true;
    });
    if (!recorded)
      return {
        status: "failed" as const,
        message: "Invitation is no longer active",
      };
    await reconcileResendWebhookEvents(resendEmailId);
    return { status: "queued" as const, resendEmailId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email delivery failed";
    await markFailed(outboxId, claimed.invitationId, message);
    return { status: "failed" as const, message };
  }
}

export async function processPendingInvitationEmails(limit = 25) {
  const staleLock = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await db.query.invitationEmailOutbox.findMany({
    where: or(
      and(
        eq(schema.invitationEmailOutbox.status, "pending"),
        lte(schema.invitationEmailOutbox.availableAt, new Date()),
      ),
      and(
        eq(schema.invitationEmailOutbox.status, "failed"),
        lte(schema.invitationEmailOutbox.availableAt, new Date()),
      ),
      and(
        eq(schema.invitationEmailOutbox.status, "processing"),
        lte(schema.invitationEmailOutbox.lockedAt, staleLock),
      ),
    ),
    orderBy: [asc(schema.invitationEmailOutbox.availableAt)],
    limit,
  });
  const results = [];
  for (const row of rows) {
    if (row.status === "processing") {
      await db
        .update(schema.invitationEmailOutbox)
        .set({ status: "failed", lockedAt: null })
        .where(eq(schema.invitationEmailOutbox.id, row.id));
    }
    results.push({ id: row.id, ...(await processInvitationEmailOutbox(row.id)) });
  }
  return results;
}

async function markFailed(
  outboxId: string,
  invitationId: string,
  message: string,
) {
  const now = new Date();
  await db.transaction(async (tx) => {
    const outbox = await tx.query.invitationEmailOutbox.findFirst({
      where: eq(schema.invitationEmailOutbox.id, outboxId),
    });
    const attemptCount = outbox?.attemptCount ?? 1;
    const retryDelayMinutes = Math.min(60, 2 ** Math.min(attemptCount, 6));
    await tx
      .update(schema.invitationEmailOutbox)
      .set({
        status: "failed",
        lockedAt: null,
        lastError: message,
        availableAt: new Date(Date.now() + retryDelayMinutes * 60 * 1000),
      })
      .where(
        and(
          eq(schema.invitationEmailOutbox.id, outboxId),
          eq(schema.invitationEmailOutbox.status, "processing"),
        ),
      );
    await tx
      .update(schema.employeeInvitations)
      .set({
        deliveryStatus: "failed",
        deliveryUpdatedAt: now,
        deliveryError: message,
      })
      .where(
        and(
          eq(schema.employeeInvitations.id, invitationId),
          inArray(schema.employeeInvitations.status, ["sent", "pending"]),
        ),
      );
  });
}
