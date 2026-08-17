import { employeeInvitationDeliveryStatusEnum } from "@repo/db/schema";

export type InvitationDeliveryStatus =
  (typeof employeeInvitationDeliveryStatusEnum.enumValues)[number];

const terminalDeliveryStatuses = new Set<InvitationDeliveryStatus>([
  "failed",
  "bounced",
  "complained",
  "suppressed",
]);

export function isTerminalDeliveryStatus(status: InvitationDeliveryStatus) {
  return terminalDeliveryStatuses.has(status);
}

export function canReplaceDeliveryStatus(
  currentStatus: InvitationDeliveryStatus,
  incomingStatus: InvitationDeliveryStatus,
) {
  return (
    isTerminalDeliveryStatus(incomingStatus) ||
    !isTerminalDeliveryStatus(currentStatus)
  );
}

export function replaceableCurrentDeliveryStatuses(
  incomingStatus: InvitationDeliveryStatus,
) {
  return employeeInvitationDeliveryStatusEnum.enumValues.filter(
    (currentStatus) =>
      canReplaceDeliveryStatus(currentStatus, incomingStatus),
  );
}

export function shouldApplyDeliveryEvent({
  currentStatus,
  currentUpdatedAt,
  incomingStatus,
  incomingOccurredAt,
}: {
  currentStatus: InvitationDeliveryStatus;
  currentUpdatedAt: Date | null;
  incomingStatus: InvitationDeliveryStatus;
  incomingOccurredAt: Date;
}) {
  const isNewEnough =
    currentStatus === "queued" ||
    currentUpdatedAt === null ||
    currentUpdatedAt <= incomingOccurredAt;

  return (
    isNewEnough && canReplaceDeliveryStatus(currentStatus, incomingStatus)
  );
}
