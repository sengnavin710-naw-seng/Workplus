import { describe, expect, test } from "bun:test";
import {
  canReplaceDeliveryStatus,
  replaceableCurrentDeliveryStatuses,
  shouldApplyDeliveryEvent,
  type InvitationDeliveryStatus,
} from "./resend-delivery-status";

const terminalStatuses = [
  "failed",
  "bounced",
  "complained",
  "suppressed",
] as const satisfies readonly InvitationDeliveryStatus[];

const lighterStatuses = [
  "sent",
  "delivery_delayed",
  "delivered",
] as const satisfies readonly InvitationDeliveryStatus[];

describe("Resend delivery status precedence", () => {
  test.each(terminalStatuses)(
    "%s cannot be overwritten by a lighter status",
    (terminalStatus: InvitationDeliveryStatus) => {
      for (const lighterStatus of lighterStatuses) {
        expect(
          canReplaceDeliveryStatus(terminalStatus, lighterStatus),
        ).toBe(false);
      }
    },
  );

  test.each(terminalStatuses)(
    "%s can replace a lighter status",
    (terminalStatus: InvitationDeliveryStatus) => {
      for (const lighterStatus of lighterStatuses) {
        expect(
          canReplaceDeliveryStatus(lighterStatus, terminalStatus),
        ).toBe(true);
      }
    },
  );

  test("a later terminal outcome may replace an earlier terminal outcome", () => {
    expect(canReplaceDeliveryStatus("failed", "complained")).toBe(true);
  });

  test("complained remains terminal when delivered arrives afterward", () => {
    const allowedCurrentStatuses =
      replaceableCurrentDeliveryStatuses("delivered");

    expect(allowedCurrentStatuses).not.toContain("complained");
  });

  test("an older replay cannot replace a newer delivery outcome", () => {
    expect(
      shouldApplyDeliveryEvent({
        currentStatus: "delivered",
        currentUpdatedAt: new Date("2026-08-15T10:05:00.000Z"),
        incomingStatus: "sent",
        incomingOccurredAt: new Date("2026-08-15T10:00:00.000Z"),
      }),
    ).toBe(false);
  });

  test("delivered cannot replace complained even when delivered is newer", () => {
    expect(
      shouldApplyDeliveryEvent({
        currentStatus: "complained",
        currentUpdatedAt: new Date("2026-08-15T10:00:00.000Z"),
        incomingStatus: "delivered",
        incomingOccurredAt: new Date("2026-08-15T10:05:00.000Z"),
      }),
    ).toBe(false);
  });
});
