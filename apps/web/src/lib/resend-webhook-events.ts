import { db, schema } from "@repo/db";
import { and, asc, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { replaceableCurrentDeliveryStatuses } from "./resend-delivery-status";

export async function reconcileResendWebhookEvents(resendEmailId: string) {
  return db.transaction(async (tx) => {
    const invitation = await tx.query.employeeInvitations.findFirst({
      columns: { id: true },
      where: eq(schema.employeeInvitations.resendEmailId, resendEmailId),
    });
    if (!invitation) return false;

    const pendingEvents = await tx.query.resendWebhookEvents.findMany({
      where: and(
        eq(schema.resendWebhookEvents.resendEmailId, resendEmailId),
        isNull(schema.resendWebhookEvents.matchedAt),
      ),
      orderBy: [asc(schema.resendWebhookEvents.occurredAt)],
    });

    for (const event of pendingEvents) {
      await tx
        .update(schema.employeeInvitations)
        .set({
          deliveryStatus: event.deliveryStatus,
          deliveryUpdatedAt: event.occurredAt,
          deliveryError: event.deliveryError,
        })
        .where(
          and(
            eq(schema.employeeInvitations.id, invitation.id),
            inArray(
              schema.employeeInvitations.deliveryStatus,
              replaceableCurrentDeliveryStatuses(event.deliveryStatus),
            ),
            or(
              eq(schema.employeeInvitations.deliveryStatus, "queued"),
              isNull(schema.employeeInvitations.deliveryUpdatedAt),
              lte(
                schema.employeeInvitations.deliveryUpdatedAt,
                event.occurredAt,
              ),
            ),
          ),
        );

      await tx
        .update(schema.resendWebhookEvents)
        .set({ matchedAt: new Date() })
        .where(eq(schema.resendWebhookEvents.svixId, event.svixId));
    }

    return true;
  });
}

export async function pruneOldResendWebhookEvents() {
  const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db
    .delete(schema.resendWebhookEvents)
    .where(lt(schema.resendWebhookEvents.receivedAt, retentionCutoff));
}
