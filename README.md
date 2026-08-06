# Workforce Platform

A privacy-first foundation for a workforce analytics and employee time-tracking platform. This repository currently provides infrastructure only: employee monitoring, screenshots, activity collection, idle detection, timesheets, productivity scoring, and analytics are not implemented.

## Technology

Bun workspaces and Turborepo coordinate a strict TypeScript monorepo. The admin app uses Next.js App Router, React, Tailwind CSS, tRPC, Better Auth, Drizzle ORM, and PostgreSQL. The visible desktop shell uses Tauri 2, React, TypeScript, and Rust.

## Structure

- `apps/web` — admin dashboard foundation and HTTP handlers
- `apps/agent` — Windows-first, user-visible Tauri agent shell
- `packages/api` — tRPC context, procedures, and routers
- `packages/auth` — Better Auth server configuration
- `packages/db` — Drizzle client, configuration, and schema
- `packages/shared` — shared constants and utility types
- `packages/validation` — shared Zod schemas
- `packages/ui` — small accessible React components
- `packages/eslint-config` and `packages/typescript-config` — shared tooling
- `docs` — architecture, privacy, dependencies, and conventions

The proposed phased data model is documented in `docs/database-design.md`. It does not create future monitoring tables.

## Prerequisites

- Bun 1.3 or newer
- PostgreSQL (only when you are ready to push the schema)
- Rust stable, Microsoft C++ Build Tools, and WebView2 for Tauri development on Windows

## Install and configure

```sh
bun install
copy .env.example .env
```

Replace every placeholder in `.env`. Generate `BETTER_AUTH_SECRET` with a cryptographically secure secret generator; do not commit `.env`.

Google sign-in is optional. Create a Web application OAuth client in Google Cloud, add
`http://localhost:3000/api/auth/callback/google` as an authorized redirect URI, then set
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. Both variables must be present;
when both are absent, Google authentication and its login button remain disabled.

Email-code sign-in delivery is optional and uses the Resend HTTPS API without an SDK.
Create a Resend API key, verify the sending domain, then configure `RESEND_API_KEY` and
`AUTH_EMAIL_FROM` together. Better Auth sends a six-digit sign-in code that expires after
ten minutes, stores it as a hash, and limits verification attempts. A valid code verifies
the email address and creates a browser session without changing the account password.

To synchronize an explicitly configured local database without generating migration files:

```sh
bun db:push
```

This command connects to and modifies the database named by `DATABASE_URL`; review the target first.

For local recovery or a private installation, an empty database can still bootstrap an owner interactively:

```sh
bun auth:bootstrap-owner
```

Normal SaaS customers should use `/signup` and create their workspace through onboarding. The bootstrap command refuses to run when any user already exists and does not save the plaintext password.

## Scripts

- `bun run dev` — run workspace development tasks
- `bun run lint` — lint all applicable workspaces
- `bun run check-types` — type-check all applicable workspaces
- `bun run format` — format repository files
- `bun auth:bootstrap-owner` — recovery-only command for creating an owner in an empty database
- `bun db:push` — push the Drizzle schema directly
- `bun db:studio` — open Drizzle Studio

Run only the web app with `bun --filter @repo/web dev`. Run the Tauri app with `bun --filter @repo/agent tauri dev` after installing Rust and the Windows prerequisites. The desktop command intentionally has not been run during foundation setup.

## Current limitations

Public email/password registration, workspace onboarding, owner login/logout, email-code account recovery, route protection, and organization/role display are implemented. Sign-in code delivery requires Resend configuration. There is no subscription billing, employee enrollment link, device credential protocol, background processing, monitoring, tracking, screenshots, timesheets, or analytics. Better Auth sessions authenticate browser users only. Desktop employees will not require web accounts; the agent must use a separate, revocable device credential.
