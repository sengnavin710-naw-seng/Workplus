import { describe, expect, test } from "bun:test";
import {
  canEditPolicy,
  canManagePrivacyPolicy,
  canPublishPolicy,
  canViewPrivacyAdministration,
  consentStatusForAction,
} from "./privacy-domain";

describe("privacy domain policy", () => {
  test("only owners and admins can manage policy", () => {
    expect(canManagePrivacyPolicy("owner")).toBe(true);
    expect(canManagePrivacyPolicy("admin")).toBe(true);
    expect(canManagePrivacyPolicy("manager")).toBe(false);
    expect(canManagePrivacyPolicy("employee")).toBe(false);
  });

  test("managers may view privacy administration", () => {
    expect(canViewPrivacyAdministration("manager")).toBe(true);
    expect(canViewPrivacyAdministration("employee")).toBe(false);
  });

  test("only draft policies are mutable or publishable", () => {
    expect(canEditPolicy("draft")).toBe(true);
    expect(canPublishPolicy("draft")).toBe(true);
    expect(canEditPolicy("published")).toBe(false);
    expect(canPublishPolicy("retired")).toBe(false);
  });
});

describe("privacy consent transitions", () => {
  test("acceptance is idempotent and can follow a decline or revocation", () => {
    expect(consentStatusForAction("pending", "accept")).toBe("accepted");
    expect(consentStatusForAction("accepted", "accept")).toBe("accepted");
    expect(consentStatusForAction("declined", "accept")).toBe("accepted");
    expect(consentStatusForAction("revoked", "accept")).toBe("accepted");
  });

  test("decline is idempotent but cannot replace acceptance", () => {
    expect(consentStatusForAction("pending", "decline")).toBe("declined");
    expect(consentStatusForAction("declined", "decline")).toBe("declined");
    expect(consentStatusForAction("accepted", "decline")).toBe(null);
  });

  test("revocation is idempotent and requires prior acceptance", () => {
    expect(consentStatusForAction("accepted", "revoke")).toBe("revoked");
    expect(consentStatusForAction("revoked", "revoke")).toBe("revoked");
    expect(consentStatusForAction("pending", "revoke")).toBe(null);
  });
});
