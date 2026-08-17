# Resend webhook local end-to-end testing

This workflow exposes the local Next.js application through a temporary HTTPS
URL. It is suitable for development verification only. A Quick Tunnel URL is
not stable and must not be treated as a production deployment.

## Prerequisites

- The database schema is current (`bun db:push`).
- `RESEND_API_KEY` and `AUTH_EMAIL_FROM` are configured in `.env`.
- The Resend sending domain is verified.
- The web application can run locally on port 3000.

## 1. Install Cloudflare Tunnel

```powershell
winget install --id Cloudflare.cloudflared
cloudflared --version
```

## 2. Start the local application

```powershell
bun run dev
```

Confirm the web application URL shown in the terminal. The examples below
assume `http://localhost:3000`.

## 3. Start a temporary HTTPS tunnel

Open another terminal and run:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Copy the generated `https://*.trycloudflare.com` URL. Keep this terminal open.

## 4. Create the Resend webhook

In Resend, open **Webhooks**, choose **Add Webhook**, and enter:

```text
https://YOUR-TUNNEL.trycloudflare.com/api/webhooks/resend
```

Subscribe to these events:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.failed`
- `email.bounced`
- `email.complained`
- `email.suppressed`

Copy the webhook signing secret from the webhook details page and add it to the
local `.env` file:

```dotenv
RESEND_WEBHOOK_SECRET=whsec_replace_with_the_real_secret
```

Never commit or share this value. Restart `bun run dev` after changing `.env`.

## 5. Verify delivery outcomes

Send Personal Computer invitations to Resend's test recipients:

| Recipient | Expected status |
| --- | --- |
| `delivered+phase0@resend.dev` | `delivered` |
| `bounced+phase0@resend.dev` | `bounced` |
| `complained+phase0@resend.dev` | `complained` |
| `suppressed@resend.dev` | `suppressed` |

For each invitation:

1. Confirm the email exists in Resend **Emails**.
2. Confirm the event in Resend **Webhooks** returned HTTP 200.
3. Refresh the WorkPlus Employees page.
4. Confirm the delivery status and any delivery error match the Resend event.

Replay one webhook event from Resend. It should still return HTTP 200, but its
`svix-id` must prevent it from being processed twice. Sending an older event
after a newer event must not replace the newer delivery status.

## 6. Complete the invitation lifecycle

Use a real secondary inbox for these checks:

1. Send an invitation and confirm it is delivered.
2. Accept it and verify the employee becomes linked and active.
3. Send another invitation, revoke it, and confirm its old link is rejected.
4. Send a new invitation after revocation and confirm only the new link works.

## Operational notes

- A Quick Tunnel URL changes whenever the tunnel is restarted. Update the
  Resend webhook endpoint each time.
- Both the Next.js server and `cloudflared` must remain running during testing.
- Resend uses at-least-once webhook delivery; duplicate events are expected and
  are deduplicated through the stored `svix-id`.
- A delivery event that arrives before the invitation stores its Resend email
  ID remains unmatched and is reconciled automatically when the outbox records
  that ID. Unrelated Resend emails do not cause webhook retry loops.
- Stored webhook reconciliation records are deleted after 30 days.
- The webhook rejects signatures with timestamps more than five minutes from
  the application clock. Keep the Windows system clock synchronized.
