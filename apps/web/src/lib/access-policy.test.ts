import { describe, expect, test } from "bun:test";
import {
  destinationForRole,
  isAdminRole,
  safeInternalReturnTo,
} from "./access-policy";

describe("access policy", () => {
  test.each(["owner", "admin", "manager"])(
    "%s can use the admin dashboard",
    (role) => {
      expect(isAdminRole(role)).toBe(true);
      expect(destinationForRole(role)).toBe("/dashboard");
    },
  );

  test("employees are routed to their own portal", () => {
    expect(isAdminRole("employee")).toBe(false);
    expect(destinationForRole("employee")).toBe("/employee");
  });

  test("only accepts same-origin application paths", () => {
    expect(safeInternalReturnTo("/employee-invite/token")).toBe(
      "/employee-invite/token",
    );
    expect(safeInternalReturnTo("https://example.com")).toBe(null);
    expect(safeInternalReturnTo("//example.com")).toBe(null);
  });
});
