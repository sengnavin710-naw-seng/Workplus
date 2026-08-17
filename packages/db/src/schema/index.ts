import { relations, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const roleEnum = pgEnum("organization_role", [
  "owner",
  "admin",
  "manager",
  "employee",
]);
export const employeeStatusEnum = pgEnum("employee_status", [
  "pending",
  "active",
  "archived",
]);
export const deviceStatusEnum = pgEnum("device_status", [
  "pending",
  "active",
  "revoked",
]);
export const deviceEnrollmentStatusEnum = pgEnum(
  "device_enrollment_status",
  [
    "pending",
    "consent_required",
    "authorized",
    "declined",
    "completed",
    "expired",
  ],
);
export const employeeInvitationStatusEnum = pgEnum(
  "employee_invitation_status",
  ["sent", "pending", "accepted", "revoked", "expired"],
);
export const employeeInvitationDeliveryStatusEnum = pgEnum(
  "employee_invitation_delivery_status",
  [
    "not_sent",
    "not_configured",
    "queued",
    "sent",
    "delivered",
    "delivery_delayed",
    "failed",
    "bounced",
    "complained",
    "suppressed",
  ],
);
export const invitationEmailOutboxStatusEnum = pgEnum(
  "invitation_email_outbox_status",
  ["pending", "processing", "sent", "failed", "cancelled"],
);
export const trackingPolicyStatusEnum = pgEnum("tracking_policy_status", [
  "draft",
  "published",
  "retired",
]);
export const employeeConsentStatusEnum = pgEnum("employee_consent_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
export const retentionDataCategoryEnum = pgEnum("retention_data_category", [
  "audit_logs",
  "agent_events",
  "application_usage",
  "screenshots",
  "time_entries",
  "aggregates",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_uidx").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrganizationId: uuid("active_organization_id"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sessions_token_uidx").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("accounts_provider_account_uidx").on(
      table.providerId,
      table.accountId,
    ),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    metadata: text("metadata"),
    ...timestamps,
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").default("employee").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_uidx").on(
      table.organizationId,
      table.userId,
    ),
    index("organization_members_user_id_idx").on(table.userId),
  ],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    linkedUserId: uuid("linked_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    jobTitle: text("job_title").default("Customer Service").notNull(),
    email: text("email"),
    status: employeeStatusEnum("status").default("pending").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedByUserId: uuid("archived_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    archiveReason: text("archive_reason"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("employees_org_email_uidx").on(
      table.organizationId,
      table.email,
    ),
    index("employees_organization_id_idx").on(table.organizationId),
    uniqueIndex("employees_org_linked_user_uidx").on(
      table.organizationId,
      table.linkedUserId,
    ),
    index("employees_archived_by_user_id_idx").on(table.archivedByUserId),
  ],
);

export const employeeInvitations = pgTable(
  "employee_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    role: text("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    status: employeeInvitationStatusEnum("status").default("sent").notNull(),
    resendEmailId: text("resend_email_id"),
    deliveryStatus: employeeInvitationDeliveryStatusEnum("delivery_status")
      .default("not_sent")
      .notNull(),
    deliveryUpdatedAt: timestamp("delivery_updated_at", {
      withTimezone: true,
    }),
    deliveryError: text("delivery_error"),
    lastEmailSentAt: timestamp("last_email_sent_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("employee_invitations_token_hash_uidx").on(table.tokenHash),
    uniqueIndex("employee_invitations_resend_email_id_uidx").on(
      table.resendEmailId,
    ),
    index("employee_invitations_org_email_idx").on(
      table.organizationId,
      table.email,
    ),
    index("employee_invitations_employee_id_idx").on(table.employeeId),
  ],
);

export const invitationEmailOutbox = pgTable(
  "invitation_email_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitationId: uuid("invitation_id")
      .notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    encryptedPayload: text("encrypted_payload").notNull(),
    status: invitationEmailOutboxStatusEnum("status")
      .default("pending")
      .notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.invitationId],
      foreignColumns: [employeeInvitations.id],
      name: "invitation_outbox_invitation_fk",
    }).onDelete("cascade"),
    uniqueIndex("invitation_email_outbox_idempotency_key_uidx").on(
      table.idempotencyKey,
    ),
    index("invitation_email_outbox_status_available_idx").on(
      table.status,
      table.availableAt,
    ),
    index("invitation_email_outbox_invitation_id_idx").on(
      table.invitationId,
    ),
  ],
);

export const resendWebhookEvents = pgTable(
  "resend_webhook_events",
  {
    svixId: text("svix_id").primaryKey(),
    eventType: text("event_type").notNull(),
    resendEmailId: text("resend_email_id").notNull(),
    deliveryStatus: employeeInvitationDeliveryStatusEnum("delivery_status")
      .notNull(),
    deliveryError: text("delivery_error"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    matchedAt: timestamp("matched_at", { withTimezone: true }),
  },
  (table) => [
    index("resend_webhook_events_email_occurred_idx").on(
      table.resendEmailId,
      table.occurredAt,
    ),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("invitations_org_email_idx").on(table.organizationId, table.email),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    color: text("color").default("#6c5ecf").notNull(),
    icon: text("icon").default("people").notNull(),
    utilizationGoal: integer("utilization_goal").default(75).notNull(),
    memberCount: integer("member_count").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("teams_org_name_uidx").on(table.organizationId, table.name),
  ],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    membershipKey: text("membership_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("team_members_team_employee_uidx").on(
      table.teamId,
      table.employeeId,
    ),
    uniqueIndex("team_members_org_employee_uidx").on(
      table.organizationId,
      table.employeeId,
    ),
    index("team_members_organization_id_idx").on(table.organizationId),
    index("team_members_employee_id_idx").on(table.employeeId),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    platform: text("platform").notNull(),
    osVersion: text("os_version"),
    agentVersion: text("agent_version").default("unknown").notNull(),
    status: deviceStatusEnum("status").default("pending").notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("devices_organization_id_idx").on(table.organizationId),
    index("devices_employee_id_idx").on(table.employeeId),
  ],
);

export const trackingPolicies = pgTable(
  "tracking_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: integer("version").notNull(),
    status: trackingPolicyStatusEnum("status").default("draft").notNull(),
    noticeVersion: text("notice_version").notNull(),
    noticeText: text("notice_text").notNull(),
    requiresConsent: boolean("requires_consent").default(true).notNull(),
    applicationUsageEnabled: boolean("application_usage_enabled")
      .default(false)
      .notNull(),
    idleDetectionEnabled: boolean("idle_detection_enabled")
      .default(false)
      .notNull(),
    screenshotsEnabled: boolean("screenshots_enabled")
      .default(false)
      .notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedByUserId: uuid("published_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tracking_policies_org_version_uidx").on(
      table.organizationId,
      table.version,
    ),
    uniqueIndex("tracking_policies_org_published_uidx")
      .on(table.organizationId)
      .where(sql`${table.status} = 'published'`),
    index("tracking_policies_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const employeeConsents = pgTable(
  "employee_consents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    trackingPolicyId: uuid("tracking_policy_id")
      .notNull()
      .references(() => trackingPolicies.id, { onDelete: "restrict" }),
    status: employeeConsentStatusEnum("status").default("pending").notNull(),
    noticeVersion: text("notice_version").notNull(),
    presentedAt: timestamp("presented_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("employee_consents_org_employee_policy_uidx").on(
      table.organizationId,
      table.employeeId,
      table.trackingPolicyId,
    ),
    index("employee_consents_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
  ],
);

export const deviceEnrollmentSessions = pgTable(
  "device_enrollment_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(
      () => organizations.id,
      { onDelete: "cascade" },
    ),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "cascade",
    }),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "cascade",
    }),
    authorizedByUserId: uuid("authorized_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    trackingPolicyId: uuid("tracking_policy_id").references(
      () => trackingPolicies.id,
      { onDelete: "restrict" },
    ),
    pollTokenHash: text("poll_token_hash").notNull(),
    deviceName: text("device_name").notNull(),
    platform: text("platform").notNull(),
    osVersion: text("os_version"),
    agentVersion: text("agent_version").notNull(),
    status: deviceEnrollmentStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("device_enrollment_sessions_poll_hash_uidx").on(
      table.pollTokenHash,
    ),
    index("device_enrollment_sessions_org_employee_idx").on(
      table.organizationId,
      table.employeeId,
    ),
    index("device_enrollment_sessions_device_idx").on(table.deviceId),
    index("device_enrollment_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const deviceCredentials = pgTable(
  "device_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    credentialPrefix: text("credential_prefix").notNull(),
    credentialHash: text("credential_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("device_credentials_hash_uidx").on(table.credentialHash),
    index("device_credentials_prefix_idx").on(table.credentialPrefix),
    index("device_credentials_org_device_idx").on(
      table.organizationId,
      table.deviceId,
    ),
  ],
);

export const retentionPolicies = pgTable(
  "retention_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dataCategory: retentionDataCategoryEnum("data_category").notNull(),
    retentionDays: integer("retention_days").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("retention_policies_org_category_uidx").on(
      table.organizationId,
      table.dataCategory,
    ),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    requestId: text("request_id").notNull(),
    ipAddress: text("ip_address"),
    metadata: text("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_org_occurred_idx").on(
      table.organizationId,
      table.occurredAt,
    ),
    index("audit_logs_org_resource_idx").on(
      table.organizationId,
      table.resourceType,
      table.resourceId,
    ),
  ],
);

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  organizationMemberships: many(organizationMembers),
  linkedEmployees: many(employees),
}));

export const organizationRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  employees: many(employees),
  teams: many(teams),
  devices: many(devices),
  invitations: many(invitations),
  employeeInvitations: many(employeeInvitations),
  trackingPolicies: many(trackingPolicies),
  employeeConsents: many(employeeConsents),
  deviceEnrollmentSessions: many(deviceEnrollmentSessions),
  deviceCredentials: many(deviceCredentials),
  retentionPolicies: many(retentionPolicies),
  auditLogs: many(auditLogs),
}));

export const employeeRelations = relations(employees, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [employees.organizationId],
    references: [organizations.id],
  }),
  linkedUser: one(users, {
    fields: [employees.linkedUserId],
    references: [users.id],
  }),
  teamMemberships: many(teamMembers),
  devices: many(devices),
  invitations: many(employeeInvitations),
  consents: many(employeeConsents),
  enrollmentSessions: many(deviceEnrollmentSessions),
}));

export const teamRelations = relations(teams, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  members: many(teamMembers),
  invitations: many(employeeInvitations),
}));

export const teamMemberRelations = relations(teamMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamMembers.organizationId],
    references: [organizations.id],
  }),
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  employee: one(employees, {
    fields: [teamMembers.employeeId],
    references: [employees.id],
  }),
}));

export const deviceRelations = relations(devices, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [devices.organizationId],
    references: [organizations.id],
  }),
  employee: one(employees, {
    fields: [devices.employeeId],
    references: [employees.id],
  }),
  credentials: many(deviceCredentials),
}));

export const deviceEnrollmentSessionRelations = relations(
  deviceEnrollmentSessions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [deviceEnrollmentSessions.organizationId],
      references: [organizations.id],
    }),
    employee: one(employees, {
      fields: [deviceEnrollmentSessions.employeeId],
      references: [employees.id],
    }),
    device: one(devices, {
      fields: [deviceEnrollmentSessions.deviceId],
      references: [devices.id],
    }),
    authorizedBy: one(users, {
      fields: [deviceEnrollmentSessions.authorizedByUserId],
      references: [users.id],
    }),
    trackingPolicy: one(trackingPolicies, {
      fields: [deviceEnrollmentSessions.trackingPolicyId],
      references: [trackingPolicies.id],
    }),
  }),
);

export const deviceCredentialRelations = relations(
  deviceCredentials,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [deviceCredentials.organizationId],
      references: [organizations.id],
    }),
    device: one(devices, {
      fields: [deviceCredentials.deviceId],
      references: [devices.id],
    }),
  }),
);

export const trackingPolicyRelations = relations(
  trackingPolicies,
  ({ many, one }) => ({
    organization: one(organizations, {
      fields: [trackingPolicies.organizationId],
      references: [organizations.id],
    }),
    createdBy: one(users, {
      fields: [trackingPolicies.createdByUserId],
      references: [users.id],
      relationName: "trackingPolicyCreatedBy",
    }),
    publishedBy: one(users, {
      fields: [trackingPolicies.publishedByUserId],
      references: [users.id],
      relationName: "trackingPolicyPublishedBy",
    }),
    consents: many(employeeConsents),
  }),
);

export const employeeConsentRelations = relations(
  employeeConsents,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [employeeConsents.organizationId],
      references: [organizations.id],
    }),
    employee: one(employees, {
      fields: [employeeConsents.employeeId],
      references: [employees.id],
    }),
    trackingPolicy: one(trackingPolicies, {
      fields: [employeeConsents.trackingPolicyId],
      references: [trackingPolicies.id],
    }),
  }),
);

export const employeeInvitationRelations = relations(
  employeeInvitations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [employeeInvitations.organizationId],
      references: [organizations.id],
    }),
    employee: one(employees, {
      fields: [employeeInvitations.employeeId],
      references: [employees.id],
    }),
    team: one(teams, {
      fields: [employeeInvitations.teamId],
      references: [teams.id],
    }),
    invitedBy: one(users, {
      fields: [employeeInvitations.invitedByUserId],
      references: [users.id],
    }),
  }),
);

export const organizationMemberRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  }),
);
