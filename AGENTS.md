# Agent Guide

## Start Points
- Read `README.md` for setup, endpoints, and environment contract.
- Read `ARCHITECTURE.md` for boundaries, invariants, and runtime flow.
- Read `docs/ONBOARDING.md` for first-code reading order.
- Read `docs/tasks.md` and `docs/tech-debt-tracker.md` before planning non-trivial changes.
- Keep `PLANS.md` unchanged unless syncing from the setup skill canonical reference.

## Fast Repo Map
- `apps/api`: Fastify API, Prisma, ingest/pipeline/insights/data-quality/alerts routes.
- `apps/web`: Next.js App Router UI + NextAuth + server route proxies to API.
- `packages/shared`: shared constants/types (`LEGACY_USER_ID`, shared contracts).
- `apps/api/prisma/schema.prisma`: canonical data model and table mapping.
- `docs/exec-plans/active` and `docs/exec-plans/completed`: execution plans.

## Build, Test, Run
Run from repo root unless noted.

```bash
pnpm i
pnpm db:up
pnpm db:generate
pnpm db:migrate
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

```bash
pnpm typecheck
pnpm test
pnpm --filter @health-agent/api test
pnpm --filter @health-agent/api seed:sample
pnpm --filter @health-agent/api parse:test
pnpm db:down
```

CI parity check:

```bash
pnpm typecheck && pnpm --filter @health-agent/api test
```

## Where To Go For X
- New or changed API endpoint: `apps/api/src/routes/*` and register in `apps/api/src/app.ts`.
- Auth changes (ingest/internal/pipeline tokens): `apps/api/src/auth.ts`, `apps/web/app/auth.ts`, `apps/web/app/lib/api-client.ts`.
- Ingest parsing logic: `apps/api/src/parsers/healthAutoExport.ts`, `apps/api/src/parsers/types.ts`.
- Metrics pack and projection logic: `apps/api/src/routes/pipeline.ts`.
- Insights generation/sanitization: `apps/api/src/insights/llm.ts`, `apps/api/src/insights/patch.ts`, `apps/api/src/insights/sanitize.ts`.
- Storage provider behavior: `apps/api/src/storage/storage.ts`, `apps/api/src/storage/localStorage.ts`, `apps/api/src/storage/gcsStorage.ts`.
- Web data-fetching failures and auth fallback: `apps/web/app/lib/api-client.ts`, `apps/web/app/lib/session.ts`, page files under `apps/web/app/*/page.tsx`.
- Schema/data model changes: `apps/api/prisma/schema.prisma` then run `pnpm db:migrate` and `pnpm db:generate`.

## Environment and Config Notes
- API dotenv source is fixed to `apps/api/.env` via `apps/api/src/dotenv.ts`.
- Web env source is `apps/web/.env.local` (see `apps/web/.env.example`).
- `INTERNAL_API_KEY` must match in API and web env; web server route handlers depend on it.
- `PIPELINE_TOKEN` should match across API and web if used.
- API storage mode is `STORAGE_PROVIDER=local|gcs`; `gcs` requires `STORAGE_BUCKET`.
- Insights require `INSIGHTS_ENABLED=true` plus either:
  - `OPENAI_API_KEY` + `INSIGHTS_MODEL`, or
  - `TINKER_API_KEY` + `TINKER_MODEL_PATH`.

## Working Rules
- Keep all health data user-scoped; preserve `userId` filters on every query and mutation.
- Keep API files ESM-compatible; internal imports in `apps/api/src` must use `.js` extensions.
- Do not remove idempotency protections (composite keys/upserts on ingest-derived tables).
- Do not log or commit secrets/tokens/sample private health payloads.
- Prefer existing route proxy pattern in `apps/web/app/api/*` for server-side API calls.
- Keep changes small and verify with root `pnpm typecheck` and API tests when touching core flows.

## Sensitive Zones and Footguns
- `apps/api/src/routes/pipeline.ts`: large, stateful ingest-to-metrics path; regressions here affect every dashboard.
- `apps/api/src/auth.ts`: header contract (`x-user-id`, `x-internal-api-key`, `x-pipeline-token`) must remain consistent with web proxies and scheduler jobs.
- `apps/api/src/parsers/healthAutoExport.ts`: unit assumptions (notably energy) and dedupe key generation influence data correctness.
- `apps/api/prisma/schema.prisma`: changing `@map`/`@@map` can break existing DBs and NextAuth tables.
- `apps/api/src/migrate.ts`: `PRISMA_MIGRATE_ON_START=true` runs deploy migrations at startup; safe for deploy, risky for local debugging if misconfigured.
- `apps/web/app/demo-data.ts` fallback is used when unauthenticated; do not mistake demo rendering for real API success.
