import { roles } from "@repo/shared";
import { z } from "zod";

const trimmedName = (label: string, maximum: number) =>
  z.string().trim().min(1, `${label} is required`).max(maximum);

export const organizationNameSchema = trimmedName("Organization name", 120);
export const accountNameSchema = trimmedName("Name", 120);
export const workspaceSlugSchema = z
  .string()
  .trim()
  .min(3, "Workspace URL must contain at least 3 characters")
  .max(63, "Workspace URL must contain at most 63 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens only");
export const signUpSchema = z.object({
  name: accountNameSchema,
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must contain at least 8 characters").max(128),
});
export const teamNameSchema = trimmedName("Team name", 120);
export const deviceNameSchema = trimmedName("Device name", 160);
export const roleSchema = z.enum(roles);
