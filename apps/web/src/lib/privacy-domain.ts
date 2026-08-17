type TrackingPolicyStatus = "draft" | "published" | "retired";
type EmployeeConsentStatus = "pending" | "accepted" | "declined" | "revoked";

export type ConsentAction = "accept" | "decline" | "revoke";

export function canViewPrivacyAdministration(role: string | null | undefined) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canManagePrivacyPolicy(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function canEditPolicy(status: TrackingPolicyStatus) {
  return status === "draft";
}

export function canPublishPolicy(status: TrackingPolicyStatus) {
  return status === "draft";
}

export function consentStatusForAction(
  current: EmployeeConsentStatus,
  action: ConsentAction,
): EmployeeConsentStatus | null {
  if (action === "accept") return "accepted";
  if (action === "decline") {
    return current === "pending" || current === "declined" ? "declined" : null;
  }
  return current === "accepted" || current === "revoked" ? "revoked" : null;
}
