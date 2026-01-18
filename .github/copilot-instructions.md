# Copilot instructions (HealthAgent)

## Big picture
- PNPM workspace monorepo: `apps/api` (Fastify + Prisma, TS ESM) and `apps/web` (Next.js App Router).
- Canonical health data lives in Postgres (Prisma); raw ingest payloads are stored separately (local disk in dev, optional GCS).

## Core data flow (read this mental model first)
- Ingest: `POST /api/ingest/apple-health`
  - Auth: `X-INGEST-TOKEN` **or** `Authorization: Bearer <token>` (must match `INGEST_TOKEN`).
  - Normalizes body (buffer/string/JSON), hashes SHA-256, writes raw JSON to storage at `apple-health/<timestamp>_<checksum>.json`, inserts `ingest_files`.
  - Code: `apps/api/src/routes/ingest.ts`, `apps/api/src/storage/storage.ts`.
- Pipeline: `POST /api/pipeline/run`
  - Optional auth: if `PIPELINE_TOKEN` is set, require `X-PIPELINE-TOKEN` or `Authorization: Bearer <token>`.
  - Processes unhandled ingests (`processed_at IS NULL`): read raw JSON → parse via `parseAppleHealthExport` → upsert canonical tables in a transaction → mark ingest processed.
  - Computes metrics pack + optional `onTrack`, inserts `pipeline_runs`; emits `warnings[]` from parser + sanity checks.
  - Optional insights: when `INSIGHTS_ENABLED=true`, creates/updates `insights_docs` using an OpenAI-generated unified diff (see `apps/api/src/insights/*`).
  - Code: `apps/api/src/routes/pipeline.ts`, `apps/api/src/parsers/healthAutoExport.ts`.
- Web reads metrics: `GET /api/pipeline/latest` (see `apps/web/app/metrics/page.tsx`).

## Local dev workflows
- Install + run: `pnpm i` → `pnpm db:up` → `pnpm db:generate` → `pnpm db:migrate` → `pnpm dev`.
- API dev (default 3001): `pnpm --filter @health-agent/api dev`; Web dev (3000): `pnpm --filter @health-agent/web dev`.
- Seed bundled sample + run pipeline: `pnpm --filter @health-agent/api seed:sample`.
- Parser smoke: `pnpm --filter @health-agent/api parse:test`.

## Env + conventions (easy to get wrong)
- API loads dotenv from `apps/api/.env` (see `apps/api/src/dotenv.ts`); env is validated with zod in `apps/api/src/env.ts`.
- Storage: `STORAGE_PROVIDER=local|gcs`; local writes under `STORAGE_LOCAL_DIR` (default `storage/local`); GCS requires `STORAGE_BUCKET`.
- API is ESM (`"type": "module"`): TS imports use `.js` extensions (e.g. `./routes/pipeline.js`).
- Prisma uses camelCase fields in code but maps to snake_case via `@map`/`@@map` in `apps/api/prisma/schema.prisma`.
- Web uses `API_BASE_URL` (default `http://localhost:3001`); some pages fall back to demo data when unauthenticated.

## Where to change things
- DB schema: `apps/api/prisma/schema.prisma` → `pnpm db:migrate`.
- Parser output/types: `apps/api/src/parsers/types.ts` + `apps/api/src/parsers/healthAutoExport.ts`.
- Routes: implement under `apps/api/src/routes/*` and register in `apps/api/src/app.ts`.
