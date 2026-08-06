# Conventions

- Use Bun for installation and scripts; never add npm, Yarn, or pnpm lockfiles.
- Address internal workspaces through `@repo/*` and declare them with `workspace:*`.
- Keep TypeScript strict, avoid `any`, and use shared validation at untrusted boundaries.
- Use `camelCase` for TypeScript values, `PascalCase` for components and types, and `snake_case` for PostgreSQL names.
- Keep server-only database and authentication imports outside client components. Add `"use client"` only at the smallest interactive boundary.
- Read secrets from environment variables. Commit documented placeholders only in `.env.example`; never expose secrets through `NEXT_PUBLIC_*` variables.
- Make small, focused changes and avoid adding infrastructure before a concrete use case requires it.
- Use `bun db:push`; do not create migration files in the current phase.
