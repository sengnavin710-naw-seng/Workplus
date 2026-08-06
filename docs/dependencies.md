# Dependencies

## Production dependencies

- `next`, `react`, `react-dom` — web App Router runtime and rendering.
- `tailwindcss`, `@tailwindcss/postcss` — web styling pipeline (development-time tooling).
- `@tauri-apps/api`, `tauri` — Tauri 2 frontend and Rust desktop runtimes.
- `drizzle-orm` — typed PostgreSQL schema and queries.
- `postgres` — PostgreSQL network driver used by Drizzle.
- `better-auth`, `@better-auth/drizzle-adapter` — browser authentication, organization membership, and Drizzle persistence.
- `@trpc/server`, `@trpc/client` — typed dashboard API router and minimal web client integration.
- `zod` — runtime validation for shared inputs and API output shape.
- `server-only` — build-time guard against importing backend modules into browser bundles.

Workspace dependencies under `@repo/*` connect internal packages and are not downloaded third-party libraries.

## Development dependencies

Turborepo coordinates tasks. TypeScript performs strict checking. ESLint, its TypeScript/React/Next integrations, and Prettier enforce code quality. Vite and its React plugin build the agent frontend. The Tauri CLI and `tauri-build` support native development. Drizzle Kit and `dotenv` support schema push and Studio. Type declaration packages provide React and platform types.

No Redis client, queue, WebSocket library, object-storage SDK, chart library, or monitoring-specific native package is installed.
