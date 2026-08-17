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
export const teamIconSchema = z.enum([
  "code",
  "globe",
  "folder",
  "finance",
  "monitor",
  "people",
]);
export const teamSchema = z.object({
  name: teamNameSchema,
  description: z.string().trim().max(240).default(""),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, "Choose a valid team color"),
  icon: teamIconSchema,
  utilizationGoal: z.number().int().min(0).max(100),
});
export const updateTeamSchema = teamSchema.partial().refine(
  (team) => Object.keys(team).length > 0,
  "Provide at least one team field",
);
export const assignEmployeeTeamSchema = z.object({
  teamId: z.string().uuid("Choose a valid team"),
});
export const employeeJobTitles = [
  "CEO / Owner",
  "Manager",
  "HR",
  "Marketing",
  "Finance",
  "Operations",
  "IT / Security",
  "Engineering / Product",
  "CSR Leader",
  "Customer Service",
  "QA",
  "Workforce Scheduler",
] as const;
export const employeeJobTitleSchema = z.enum(employeeJobTitles);
export const updateEmployeeSchema = z.object({
  fullName: trimmedName("Employee name", 120),
  role: employeeJobTitleSchema,
  teamId: z.string().uuid("Choose a valid team"),
});
export const archiveEmployeeSchema = z.object({
  reason: z.string().trim().max(500, "Reason must contain at most 500 characters").optional(),
});
export const deviceNameSchema = trimmedName("Device name", 160);
export const agentPlatformSchema = z.enum(["windows", "macos", "linux"]);
export const startDeviceEnrollmentSchema = z.object({
  deviceName: deviceNameSchema,
  platform: agentPlatformSchema,
  osVersion: z.string().trim().max(120).optional(),
  agentVersion: z.string().trim().min(1).max(40),
});
export const deviceEnrollmentConsentSchema = z.object({
  action: z.enum(["accept", "decline"]),
});
export const deviceHeartbeatSchema = z.object({
  agentVersion: z.string().trim().min(1).max(40),
  osVersion: z.string().trim().max(120).optional(),
});
export const roleSchema = z.enum(roles);

export const trackingPolicyInputSchema = z.object({
  name: trimmedName("Policy name", 120),
  noticeVersion: z
    .string()
    .trim()
    .min(1, "Notice version is required")
    .max(40, "Notice version must contain at most 40 characters"),
  noticeText: z
    .string()
    .trim()
    .min(20, "Privacy notice must contain at least 20 characters")
    .max(10_000, "Privacy notice must contain at most 10,000 characters"),
  requiresConsent: z.boolean().default(true),
  applicationUsageEnabled: z.boolean().default(false),
  idleDetectionEnabled: z.boolean().default(false),
  screenshotsEnabled: z.boolean().default(false),
});

export const updateTrackingPolicySchema = trackingPolicyInputSchema
  .partial()
  .refine(
    (policy) => Object.keys(policy).length > 0,
    "Provide at least one policy field",
  );

export const employeeConsentResponseSchema = z.object({
  action: z.enum(["accept", "decline", "revoke"]),
});

export const retentionDataCategories = [
  "audit_logs",
  "agent_events",
  "application_usage",
  "screenshots",
  "time_entries",
  "aggregates",
] as const;

export const retentionPolicySchema = z.object({
  dataCategory: z.enum(retentionDataCategories),
  retentionDays: z.number().int().min(1).max(3650),
});

export const retentionPolicyBatchSchema = z
  .array(retentionPolicySchema)
  .min(1, "Configure at least one retention category")
  .max(retentionDataCategories.length)
  .superRefine((policies, context) => {
    const seen = new Set<string>();
    policies.forEach((policy, index) => {
      if (seen.has(policy.dataCategory)) {
        context.addIssue({
          code: "custom",
          message: "Configure each retention category only once",
          path: [index, "dataCategory"],
        });
      }
      seen.add(policy.dataCategory);
    });
  });

export const personalEmployeeInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter an employee email")
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  fullName: trimmedName("Employee name", 120),
  teamId: z.string().uuid("Choose a team"),
  role: employeeJobTitleSchema.default("Customer Service"),
});

export const personalEmployeeInvitationBatchSchema = z
  .array(personalEmployeeInvitationSchema)
  .min(1, "Add at least one employee")
  .max(100, "Invite no more than 100 employees at a time")
  .superRefine((employees, context) => {
    const firstRowByEmail = new Map<string, number>();

    employees.forEach((employee, index) => {
      const firstIndex = firstRowByEmail.get(employee.email);
      if (firstIndex === undefined) {
        firstRowByEmail.set(employee.email, index);
        return;
      }

      context.addIssue({
        code: "custom",
        message: `This email is already used in row ${firstIndex + 1}`,
        path: [index, "email"],
      });
      context.addIssue({
        code: "custom",
        message: `This email is also used in row ${index + 1}`,
        path: [firstIndex, "email"],
      });
    });
  });

export type PersonalEmployeeInvitation = z.infer<
  typeof personalEmployeeInvitationSchema
>;
