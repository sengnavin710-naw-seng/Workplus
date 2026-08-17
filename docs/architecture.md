# Architecture

## Responsibilities

The web dashboard renders administration interfaces and exposes the Better Auth and tRPC route handlers. It must keep database and authentication modules on the server.

The desktop agent is a visible Tauri application. It authorizes an employee through the system browser, presents the current privacy notice when consent is required, stores its separate credential in the operating-system credential manager, and sends a minimal connection heartbeat. It collects no activity. Future native capabilities belong in focused Rust modules and require explicit permissions, visible state, and privacy review.

The tRPC package is the typed dashboard API boundary. It provides public and browser-session-authenticated procedures; it does not provide an agent ingestion API. The database package owns PostgreSQL access, relational constraints, and tenant keys.

## Authentication schema

`users` is the canonical Better Auth identity for people who access the web application, such as workspace owners and future administrators. Better Auth also requires `sessions`, `accounts`, and `verifications`. Its organization plugin uses `organizations`, `organization_members`, and `invitations`. Public email/password sign-up creates a web identity; onboarding then creates a workspace and assigns the creator the `owner` role.

Google OAuth is an optional Better Auth web identity provider. It uses the same canonical `users` and `accounts` tables rather than creating a competing user model. A Google-authenticated user without a workspace is sent to onboarding; a returning member is sent to the dashboard. Google OAuth sessions remain browser sessions and must never be reused as desktop-device credentials.

Email/password accounts can recover access with a six-digit Better Auth email verification code. The code is stored as a hash through Better Auth's `verifications` schema, expires after ten minutes, permits at most five verification attempts, and is delivered by Resend only when server-side email credentials are configured. The request UI returns a generic response to avoid revealing whether an email address is registered. A valid code verifies the email address and creates a browser session; it does not change or remove the existing credential password. OTP values and Resend credentials are never exposed beyond the required server-side delivery path.

`employees` is a separate workforce-domain table. An employee can install the desktop agent and belong to a workspace without having a Better Auth account. Its optional `linkedUserId` supports a future employee self-service portal without making browser identity a prerequisite for device enrollment. Teams and devices reference employees, not Better Auth users.

The interactive `bun auth:bootstrap-owner` command remains only for local recovery or private installations. Normal SaaS customers use public sign-up and workspace onboarding. No public bootstrap HTTP endpoint exists.

Teams are foundational domain tables but are not enabled through Better Auth's optional team feature. This keeps `organizationId` explicit on every tenant-owned row, including `team_members`, and leaves team authorization policy to a later dashboard feature.

## Identity boundaries

Browser users authenticate with Better Auth's cookie sessions. Desktop devices never store or present those browser cookies as device identity. Enrollment uses an expiring, one-time poll secret and issues a separately scoped, revocable device credential over the versioned HTTP agent API. Only credential hashes are stored server-side. The plaintext device credential is shown once to the Agent and stored in the operating-system credential manager.

The Agent heartbeat reports only device connection health, operating-system label, and Agent version. Every heartbeat rechecks that the employee and device remain active and that the latest published policy has current consent. A new policy version therefore blocks the heartbeat until browser authorization and consent are completed again. Reauthorization rotates the credential without creating a duplicate device. Heartbeats never enable tracking.

Every tenant-owned table includes `organizationId`. API queries must derive the active organization from authorized membership and include the tenant predicate; a supplied organization ID is never sufficient authorization.

After sign-up or sign-in, a user without a workspace is redirected to a two-step onboarding flow. The first step collects the workspace name, the owner's working role, and team size; the second records the owner's initial workspace goals. The flow creates nothing until the final confirmation, then Better Auth creates the organization and owner membership, stores the onboarding preferences in organization metadata, and marks the workspace active for the browser session. The dashboard displays the verified workspace role. Organization-scoped tRPC routers should use `organizationProcedure`, which requires an active organization and rechecks membership before executing the procedure.

## Future data flow

```text
Desktop Agent
    → versioned HTTP agent API
    → PostgreSQL raw activity data
    → background aggregation
    → summary tables
    → Admin Dashboard
```

None of the activity, aggregation, or summary stages exist yet. Their schemas and dependencies should be introduced only with defined retention, access, consent, and audit requirements.

The phased proposed data model is documented in [`database-design.md`](./database-design.md). It is a blueprint only; future tables are not part of the current Drizzle schema.
