export const roles = ["owner", "admin", "manager", "employee"] as const;
export type Role = (typeof roles)[number];

export const deviceStatuses = ["pending", "active", "revoked"] as const;
export type DeviceStatus = (typeof deviceStatuses)[number];

export const employeeStatuses = ["pending", "active", "archived"] as const;
export type EmployeeStatus = (typeof employeeStatuses)[number];

export const trackingPolicyStatuses = [
  "draft",
  "published",
  "retired",
] as const;
export type TrackingPolicyStatus = (typeof trackingPolicyStatuses)[number];

export const employeeConsentStatuses = [
  "pending",
  "accepted",
  "declined",
  "revoked",
] as const;
export type EmployeeConsentStatus = (typeof employeeConsentStatuses)[number];

export type Nullable<T> = T | null;
export type EntityId = string;

export const APP_NAME = "Workplus";
