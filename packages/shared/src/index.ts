export const roles = ["owner", "admin", "manager", "employee"] as const;
export type Role = (typeof roles)[number];

export const deviceStatuses = ["pending", "active", "revoked"] as const;
export type DeviceStatus = (typeof deviceStatuses)[number];

export const employeeStatuses = ["pending", "active", "archived"] as const;
export type EmployeeStatus = (typeof employeeStatuses)[number];

export type Nullable<T> = T | null;
export type EntityId = string;

export const APP_NAME = "Workplus";
