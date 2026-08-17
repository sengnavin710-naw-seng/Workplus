# Render + Neon beta deployment

This guide deploys the WorkPlus beta without buying a hosting plan:

- Hostinger manages DNS for `workplus.store`.
- Render Free runs the Next.js web application and API routes.
- Neon Free stores PostgreSQL data.
- Resend Free sends authentication and invitation email.

The canonical application origin is `https://app.workplus.store`. Do not use the
Render-generated hostname for authentication after the custom domain is active.

## Free-plan limitations

Render Free sleeps after a period without traffic. The first request after sleep
can be slow, and a Resend webhook can time out while Render wakes up. Resend
retries failed webhook deliveries. This setup is appropriate for development and
beta testing, not a production SLA.

Neon can also suspend idle compute. Durable application state remains in Neon;
the Render filesystem must be treated as temporary.

## 1. Rotate production credentials

Do not reuse values that have appeared in screenshots, chat, terminal output, or
the local `.env` file. Before deployment, create new values for:

- the Neon database password and connection strings;
- `BETTER_AUTH_SECRET`;
- `GOOGLE_CLIENT_SECRET`;
- `RESEND_API_KEY`;
- `RESEND_WEBHOOK_SECRET`;
- `INVITATION_OUTBOX_SECRET`.

Generate the two application secrets separately and save them directly in the
Render dashboard. Do not paste them into source files:

```powershell
bun -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Run the command once for `BETTER_AUTH_SECRET` and again for
`INVITATION_OUTBOX_SECRET`.

## 2. Create the Neon database

1. Sign in to Neon and create a project named `workplus-production`.
2. Choose a region close to Render's Singapore region when available.
3. In **Connect**, copy both connection strings:
   - **Direct connection** for the one-time schema push.
   - **Pooled connection** (the hostname contains `-pooler`) for Render.
4. Keep both URLs private.

This project does not create migration files. Push the current Drizzle schema
once from the repository root, using the direct Neon URL only for this command:

```powershell
$env:DATABASE_URL = '<NEON_DIRECT_CONNECTION_STRING>'
bun db:push
Remove-Item Env:DATABASE_URL
```

Read the target shown by Drizzle before confirming. A fresh Neon database has no
local users, organizations, teams, policies, or test data; create the first owner
through normal signup and onboarding after deployment.

## 3. Push the repository to GitHub

Render builds from a Git repository. Review and commit the intended WorkPlus
files, then push them to a private GitHub repository. Never commit `.env`.

The repository root must remain the Render root because the web app imports
workspace packages from `packages/*` and uses the root `bun.lock`.

## 4. Create the Render service

1. Sign in to Render and select **New > Blueprint**.
2. Connect the GitHub repository that contains this `render.yaml`.
3. Keep the service on the **Free** plan.
4. Enter the secret values requested by the Blueprint:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string |
| `BETTER_AUTH_SECRET` | new 32-byte-or-longer random value |
| `GOOGLE_CLIENT_ID` | current Google Web OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | newly rotated Google client secret |
| `RESEND_API_KEY` | newly created Resend sending API key |
| `RESEND_WEBHOOK_SECRET` | temporary value until the permanent webhook is created |
| `INVITATION_OUTBOX_SECRET` | a second, different random value |

The Blueprint already supplies these non-secret production values:

```text
BETTER_AUTH_URL=https://app.workplus.store
NEXT_PUBLIC_APP_URL=https://app.workplus.store
AUTH_EMAIL_FROM=WorkPlus <invites@mail.workplus.store>
```

The service uses:

```text
Build: bun install --frozen-lockfile && bun --filter @repo/web build
Start: bun --filter @repo/web start
Health: /api/health
```

Wait for the first deploy to finish. The application can start before email and
OAuth are enabled, but authentication should be tested only on the canonical
custom domain.

## 5. Attach `app.workplus.store`

1. Open the Render service and choose **Settings > Custom Domains**.
2. Add `app.workplus.store`.
3. Render shows the exact DNS target for the service.
4. In Hostinger DNS, create the CNAME record Render requests:

```text
Type: CNAME
Name: app
Target: <the exact Render hostname>
TTL: default
```

Remove conflicting `app` A, AAAA, or CNAME records first. Do not change the root
domain or unrelated DNS records. Wait until Render reports the domain verified
and its managed TLS certificate is ready, then verify:

```text
https://app.workplus.store/api/health
```

The response should contain `{"status":"ok"}`.

## 6. Configure Google OAuth

In the existing Google Cloud Web OAuth client, add this exact production redirect
URI:

```text
https://app.workplus.store/api/auth/callback/google
```

Keep the local redirect URI only in the development OAuth client. Publish the
OAuth consent screen, or add every beta account as a test user. Restart the
Render service after changing Render environment variables.

## 7. Verify the new Resend sending domain

1. Add `mail.workplus.store` in Resend Domains.
2. Copy the DKIM, SPF/MX, and DMARC records generated for this new domain.
3. Add those exact records in Hostinger DNS. Do not copy records from
   `mail.seng688.com`.
4. Wait for Resend to show **Verified**.
5. Create a new restricted sending API key and put it in Render as
   `RESEND_API_KEY`.
6. Confirm Render has
   `AUTH_EMAIL_FROM=WorkPlus <invites@mail.workplus.store>` and redeploy.

## 8. Replace the local Resend webhook

Create a permanent Resend webhook with this endpoint:

```text
https://app.workplus.store/api/webhooks/resend
```

Subscribe to all events handled by the application:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.failed`
- `email.bounced`
- `email.complained`
- `email.suppressed`

Copy the new webhook signing secret directly into Render as
`RESEND_WEBHOOK_SECRET`, restart the service, send a test invitation, and confirm
the webhook event receives HTTP 200 with `{"received":true}`. Replay the same
event once to verify duplicate delivery remains safe. Disable the obsolete Dev
Tunnel webhook after the permanent endpoint works.

## 9. Build the desktop Agent for production

`VITE_WORKPLUS_API_URL` is compiled into the Agent. It is not a Render web-service
variable and changing it later does not update an existing installer. Build from
PowerShell with the production origin exported for that build:

```powershell
$env:VITE_WORKPLUS_API_URL = 'https://app.workplus.store'
bun --filter @repo/agent tauri build
Remove-Item Env:VITE_WORKPLUS_API_URL
```

The Agent must never fall back to `localhost` in a distributed installer.

## 10. End-to-end beta check

Test in this order:

1. Open `https://app.workplus.store` and complete owner signup/onboarding.
2. Sign out and test email/password and Google sign-in.
3. Send a Personal Computer invitation to a fresh test mailbox.
4. Confirm Resend reports delivered and the permanent webhook returns 200.
5. Accept the invitation and confirm the employee is linked to the organization.
6. Publish a privacy policy and confirm the employee consent flow.
7. Install the production Agent, connect it, accept consent, and confirm heartbeat.
8. Restart the Agent and confirm the device credential persists.
9. Revoke the device and confirm the Agent can no longer heartbeat.

## Remaining beta operations

Initial invitation delivery is attempted during the API request. Automatic
recovery of failed outbox rows still needs a free external scheduler that sends
an authenticated POST request to:

```text
https://app.workplus.store/api/internal/invitation-email-outbox
```

Use `Authorization: Bearer <INVITATION_OUTBOX_SECRET>`. Configure this only in a
service that stores secrets; never place the token in browser code or a public
URL. Manual resend remains available while a scheduler is not configured.
