# AGENTS.md

## Project

This project is a privacy-first workforce analytics and employee time-tracking platform.

It is a Bun and Turborepo monorepo containing a Next.js admin dashboard, a Tauri desktop agent, tRPC, Drizzle ORM, PostgreSQL, Better Auth, Tailwind CSS, and shared workspace packages.

Read `README.md` and the relevant file in `docs/` before changing authentication, database schemas, desktop permissions, data collection, or deployment configuration.

## General rules

- Use Bun only.
- Do not add npm, Yarn, or pnpm lockfiles.
- Inspect the existing implementation before editing it.
- Preserve unrelated changes.
- Import workspace packages through `@repo/*`.
- Make the smallest change that completely handles the request.
- Do not add dependencies unless the requested work requires them.
- Never commit real passwords, database URLs, access keys, session tokens, device tokens, or authentication secrets.
- Never implement hidden monitoring, keylogging, or password collection.
- Employee tracking must remain visible and transparent.
- Separate browser authentication sessions from desktop device credentials.
- Do not create database migration files. Use `bun db:push`.
- Never run `bun run build`, `bun run dev`, or a Tauri development command unless explicitly requested.
- After changes, run `bun run lint` and `bun run check-types`.
