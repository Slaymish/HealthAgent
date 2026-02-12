# Architecture

## System Overview
HealthAgent ingests Apple Health Auto Export payloads, normalizes them into canonical Postgres tables, computes short-window health trends, and serves a dashboard-oriented web app.

Primary users:
- Individual users signing in with GitHub via NextAuth.
- Operational/internal callers (web server routes, schedulers) invoking internal API endpoints with shared keys.

Top-level capabilities:
- Token-authenticated ingest (`/api/ingest/apple-health`) with raw payload archival.
- Pipeline processing (`/api/pipeline/run`) into canonical rows and metrics packs.
- Optional insights generation with OpenAI or Tinker backends.
- Data quality and healthcheck surfaces for freshness/completeness monitoring.
- User preference storage (targets + custom insights system prompt).

## Boundaries and Invariants
Boundaries:
- `apps/api` owns ingest parsing, canonical persistence, metrics computation, and operational checks.
- `apps/web` owns UI rendering, NextAuth session lifecycle, and server route proxies to API.
- `packages/shared` owns shared constants/types used across app boundaries.
- Raw payload storage is abstracted behind `apps/api/src/storage/*` and can be local FS or GCS.

Invariants:
- Health data rows remain user-scoped (`userId`) across all tables and endpoints.
- Ingested payloads are persisted before canonical transformation (audit trail).
- Canonical tables remain idempotent through upserts/composite uniqueness.
- API env validation happens through `apps/api/src/env.ts`; startup should fail fast on invalid critical config.
- API source is ESM (`type: module`), so internal imports in API code must keep `.js` extensions.

## Runtime Model
Entry points:
- API process: `apps/api/src/server.ts` -> `createApp()` from `apps/api/src/app.ts`.
- Web process: Next.js app under `apps/web/app/*` with server routes in `apps/web/app/api/*`.
- Scheduler/automation entry: `POST /api/pipeline/run` with `X-PIPELINE-TOKEN` and `X-USER-ID`.
- Utility CLIs/scripts:
  - `pnpm --filter @health-agent/api seed:sample`
  - `pnpm --filter @health-agent/api users:list`
  - `pnpm --filter @health-agent/api insights:sanitize`

Lifecycle:
1. Ingest route validates token (`X-INGEST-TOKEN` or bearer), stores raw JSON to storage, writes `ingest_files`.
2. Pipeline run reads unprocessed ingests (bounded by `PIPELINE_MAX_INGESTS_PER_RUN`), parses payloads, upserts canonical tables, and marks ingests processed.
3. Pipeline computes metrics pack (7/14/28 day windows + goal projection), persists `pipeline_runs`, and optionally writes `insights_docs`.
4. Web pages call API through server-side route handlers using internal headers and session user IDs.

Runtime constraints:
- Node 20+, pnpm workspaces, TypeScript strict mode.
- API defaults to port `8080` (or `PORT`) but local env typically sets `API_PORT=3001`.
- Postgres is required; Prisma schema is source of truth.
- Local dev raw storage path defaults to `storage/local`; cloud deploy can switch to GCS.

## Data Flow
Inputs:
- Apple Health JSON payloads over HTTP (`POST /api/ingest/apple-health`).
- Internal API reads from web route handlers using shared keys.
- Scheduler-triggered pipeline runs.
- Optional LLM provider calls for insights generation.

Transformations:
- Parser (`apps/api/src/parsers/healthAutoExport.ts`) normalizes health export structures into canonical rows.
- Pipeline computes trend aggregates, linear regression slopes, and simple lever recommendations.
- Insights module generates and sanitizes markdown summaries tied to pipeline runs.

Outputs:
- Persisted rows in `daily_weight`, `daily_nutrition`, `sleep_sessions`, `workouts`, `daily_vitals`, `pipeline_runs`, `insights_docs`.
- Stored raw ingest artifacts in local FS or GCS bucket.
- API JSON responses consumed by web pages and tooling.

External dependencies:
- Postgres via Prisma.
- GitHub OAuth through NextAuth.
- Optional OpenAI or Tinker model backend for insights.
- Optional Google Cloud Storage for raw ingest storage.

## Operational Footguns
- Risk: `INTERNAL_API_KEY` or `PIPELINE_TOKEN` mismatch between API and web causes silent API proxy failures.
  - Mitigation: update both env files together (`apps/api/.env`, `apps/web/.env.local`) and verify with `/health` + dashboard load.
- Risk: Parser unit assumptions (especially dietary energy units) can skew downstream metrics.
  - Mitigation: keep parser tests current and inspect pipeline warnings after ingesting new exporter formats.
- Risk: Missing `X-USER-ID` on internal endpoints yields confusing 400/404 behavior.
  - Mitigation: reuse `fetchUserApi` and `requireUserFromInternalRequest` patterns rather than custom header logic.
- Risk: Enabling insights without provider credentials creates failed runs or warning noise.
  - Mitigation: set `INSIGHTS_ENABLED=false` unless one backend credential set is present and tested.
- Risk: Schema changes can break auth/session tables or existing mapped column names.
  - Mitigation: review `@map`/`@@map` changes carefully, run migrations locally, and run API tests before merge.

## Change Log
- 2026-02-12: Initialized and replaced template with repository-specific architecture details.
