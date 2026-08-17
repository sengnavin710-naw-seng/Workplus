import { db, schema } from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  pruneOldResendWebhookEvents,
  reconcileResendWebhookEvents,
} from "@/lib/resend-webhook-events";
import { verifyResendSignature } from "./signature";

const resendEmailEventSchema = z.object({
  type: z.enum([
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.failed",
    "email.bounced",
    "email.complained",
    "email.suppressed",
  ]),
  created_at: z.string().min(1),
  data: z.object({
    email_id: z.string().min(1),
    bounce: z.object({ message: z.string().min(1) }).optional(),
    failed: z.object({ reason: z.string().min(1) }).optional(),
    suppressed: z.object({ message: z.string().min(1) }).optional(),
  }),
});

const deliveryStatusByEvent = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.failed": "failed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
} as const;

function deliveryError(event: z.infer<typeof resendEmailEventSchema>) {
  if (event.type === "email.failed")
    return event.data.failed?.reason
      ? `Resend failed to send the email: ${event.data.failed.reason}`
      : "Resend reported that the email could not be sent.";
  if (event.type === "email.bounced")
    return event.data.bounce?.message ?? "The recipient server rejected the email.";
  if (event.type === "email.complained")
    return "The recipient marked this email as spam.";
  if (event.type === "email.suppressed")
    return (
      event.data.suppressed?.message ??
      "Resend suppressed delivery to this recipient."
    );
  if (event.type === "email.delivery_delayed")
    return "Delivery is delayed by the recipient email server.";
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const svixId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  const payload = await request.text();

  if (
    !secret ||
    !svixId ||
    !timestamp ||
    !signature ||
    !verifyResendSignature({ payload, secret, signature, svixId, timestamp })
  ) {
    return NextResponse.json({ message: "Invalid webhook" }, { status: 400 });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return NextResponse.json({ message: "Invalid webhook" }, { status: 400 });
  }
  const event = resendEmailEventSchema.safeParse(parsedPayload);
  if (!event.success) {
    return NextResponse.json({ received: true });
  }

  const deliveryStatus = deliveryStatusByEvent[event.data.type];
  const occurredAt = new Date(event.data.created_at);
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ received: true });
  }
  const resendEmailId = event.data.data.email_id;
  await db
    .insert(schema.resendWebhookEvents)
    .values({
      svixId,
      eventType: event.data.type,
      resendEmailId,
      deliveryStatus,
      deliveryError: deliveryError(event.data),
      occurredAt,
    })
    .onConflictDoNothing({ target: schema.resendWebhookEvents.svixId });

  // Always reconcile, including duplicate deliveries. This lets a retry recover
  // if the event arrived before the outbox stored the provider email ID.
  await reconcileResendWebhookEvents(resendEmailId);
  await pruneOldResendWebhookEvents();

  return NextResponse.json({ received: true });
}
