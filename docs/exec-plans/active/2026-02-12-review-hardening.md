# Harden Auth, Pipeline Resilience, Insights Timeouts, and Web Smoke Coverage

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `PLANS.md` at the repository root.

## Purpose / Big Picture

After this change, HealthAgent will no longer auto-transfer legacy health data to the first account that signs in, ingest processing will continue even if one payload is corrupted, insights generation will fail fast instead of hanging on model calls, and CI will exercise basic web page and auth-protected route behavior. A user should be able to run pipeline processing with mixed good/bad ingests and still see successful processing of valid data, while operators can run an explicit one-time legacy migration task with an auditable record.

## Progress

- [x] (2026-02-12 23:41Z) Reviewed findings and opened this execution plan.
- [x] (2026-02-12 23:47Z) Implemented explicit legacy migration tool (`apps/api/src/tools/migrateLegacyDataToUser.ts`) with persistent audit records in `admin_audit_logs`, and removed automatic sign-in migration from `apps/web/app/auth.ts`.
- [x] (2026-02-12 23:49Z) Implemented dead-letter style ingest failure handling in pipeline route and failure metadata fields on `ingest_files`.
- [x] (2026-02-12 23:50Z) Added OpenAI/Tinker timeout configuration to env and wired timeout-aware insights execution.
- [x] (2026-02-12 23:50Z) Enforced server-side max `insightsSystemPrompt` length in preferences API route.
- [x] (2026-02-12 23:51Z) Added web smoke checks into API test suite (`apps/api/src/webSmoke.test.ts`) and wired into `@health-agent/api` test command.
- [x] (2026-02-12 23:58Z) Restored reliable typecheck prerequisites by updating scripts/config: root `typecheck` now builds `@health-agent/shared`, API `typecheck` runs `prisma:generate`, and web/api tsconfig paths are aligned.
- [x] (2026-02-12 23:59Z) Verified `pnpm typecheck` succeeds and `pnpm --filter @health-agent/api test` succeeds (tests required escalated execution because `tsx` IPC pipe is blocked inside sandbox).
- [x] (2026-02-12 23:51Z) Updated debt tracker entries for TD-003 and TD-004 to recently resolved.

## Surprises & Discoveries

- Observation: `tsx` test execution inside this sandbox fails with `listen EPERM` on a pipe path under `/tmp/tsx-*`.
  Evidence: `Error: listen EPERM: operation not permitted /tmp/tsx-1000/205614.pipe` when running API tests without escalation.

- Observation: Prisma client generation needs network access in this environment when engines are missing.
  Evidence: `getaddrinfo EAI_AGAIN binaries.prisma.sh` until `prisma:generate` was re-run with escalated permissions.

## Decision Log

- Decision: Use a repository-tracked ExecPlan in `docs/exec-plans/active` and execute directly from it.
  Rationale: User explicitly requested “use execplan,” and repository guidance expects active plans in this directory.
  Date/Author: 2026-02-12 / Codex

- Decision: Move legacy data migration out of sign-in path into an explicit CLI operation with audit rows in Postgres.
  Rationale: Automatic migration on first sign-in creates a cross-user data assignment risk; explicit operator-triggered migration is safer and traceable.
  Date/Author: 2026-02-12 / Codex

- Decision: Implement dead-letter semantics by adding `failed_at` and `failure_reason` on `ingest_files` and skipping failed rows in normal queue selection.
  Rationale: This keeps healthy ingests flowing without repeatedly retrying the same corrupted payload on every run.
  Date/Author: 2026-02-12 / Codex

- Decision: Add web smoke coverage via API test suite (`tsx`-driven checks) rather than introducing a new test runner for the web app.
  Rationale: CI already executes `@health-agent/api` tests; extending this path avoids dependency/tooling churn while adding immediate guardrails.
  Date/Author: 2026-02-12 / Codex

- Decision: Update root `typecheck` to build `@health-agent/shared` before recursive checks, and keep API `typecheck` responsible for ensuring Prisma client generation.
  Rationale: This removes fragile assumptions about prebuilt shared artifacts and missing generated Prisma client types.
  Date/Author: 2026-02-12 / Codex

## Outcomes & Retrospective

Implemented all requested hardening changes from the review findings, including high-severity auth/data ownership risk removal and pipeline resiliency against bad payloads. Timeouts and prompt bounds were added to reduce latency/cost failure modes, and CI-path smoke checks now cover key web contracts. Validation now passes for `pnpm typecheck` and `pnpm --filter @health-agent/api test` in this session.

## Context and Orientation

The backend API lives in `apps/api` and owns ingest processing, pipeline runs, and insights generation. Authentication and session management for the web app live in `apps/web/app/auth.ts` and `apps/web/app/lib/*`. The multi-user data model is defined in `apps/api/prisma/schema.prisma`.

Key pre-change risk areas addressed by this plan were:

1. Sign-in path implicitly migrated legacy data.
2. Pipeline queue aborted on first bad ingest.
3. Insights model calls were unbounded in runtime.
4. Preferences allowed unbounded `insightsSystemPrompt`.
5. Web page/auth-route smoke contracts were not checked in CI path.

## Plan of Work

First, replace automatic legacy migration behavior with an explicit admin CLI migration in API tooling. This requires:

- Removing sign-in migration invocation from `apps/web/app/auth.ts`.
- Removing or deactivating migration helper logic in `apps/web/app/lib/user-provisioning.ts`.
- Adding a dedicated API tool script that migrates from `legacy-user` to a specified target user only when explicitly invoked.
- Persisting an audit record for migration attempts/results in a new Prisma model and SQL migration.

Second, harden pipeline ingest handling in `apps/api/src/routes/pipeline.ts` by isolating per-ingest failures, persisting failure metadata on `ingest_files`, and continuing through remaining ingests. This needs schema additions and route response updates to surface failure counts.

Third, add timeout controls in `apps/api/src/insights/llm.ts` and `apps/api/src/env.ts` so model calls are bounded. Thread timeout values from validated env to the insights call sites.

Fourth, enforce a maximum length for `insightsSystemPrompt` in `apps/web/app/api/preferences/route.ts` to bound cost/latency.

Fifth, add web smoke checks executed through API package tests so existing CI (`pnpm --filter @health-agent/api test`) validates:

- server-page rendering for critical routes (`/`, `/insights`, `/data-quality`) under demo fallback.
- auth-required web API routes return `401` when unauthenticated.

Finally, update this plan with decisions, discoveries, validation, and outcomes.

## Concrete Steps

Run from repo root `/home/hamishburke/Documents/HealthAgent` unless noted.

1. Edit auth, user-provisioning, pipeline, insights, env, schema, and migration files. (completed)
2. Add new API tool and tests for web smoke coverage. (completed)
3. Run:
   pnpm typecheck
   pnpm --filter @health-agent/api test
4. Capture command outcomes in this plan under Artifacts and in the final summary. (completed)

Expected success signal:

- `pnpm typecheck` exits 0.
- `pnpm --filter @health-agent/api test` exits 0 and includes new smoke/auth-route checks.

## Validation and Acceptance

Acceptance is met when all of the following are true:

1. Sign-in no longer triggers legacy data reassignment in `apps/web/app/auth.ts`.
2. A dedicated admin tool exists to migrate legacy data with explicit target user and writes an audit row.
3. Pipeline run no longer aborts the entire queue on one broken ingest; failed ingests are marked and good ingests continue.
4. Insights calls time out deterministically for both OpenAI and Tinker paths.
5. Preferences API rejects oversized `insightsSystemPrompt`.
6. CI path command `pnpm --filter @health-agent/api test` runs newly added web smoke assertions.

## Idempotence and Recovery

The code edits are idempotent. Re-running tests is safe. The new legacy migration tool will include guardrails to avoid accidental repeated migrations. If migration has already completed, re-running should report no-op and preserve existing data.

For schema updates, use standard Prisma migration flow; if a migration fails locally, fix SQL/schema mismatch and rerun migration generation in a clean local database.

## Artifacts and Notes

Implementation artifacts:

1. New migration: `apps/api/prisma/migrations/20260212234500_pipeline_failures_and_audit_log/migration.sql`.
2. New explicit migration CLI: `apps/api/src/tools/migrateLegacyDataToUser.ts` plus script `legacy:migrate` in `apps/api/package.json`.
3. Dead-letter ingest handling and visibility updates:
   - `apps/api/src/routes/pipeline.ts`
   - `apps/api/src/routes/dataQuality.ts`
   - `apps/api/src/routes/ingest.ts`
   - `apps/web/app/data-quality/page.tsx`
4. Insights timeout wiring:
   - `apps/api/src/env.ts`
   - `apps/api/src/insights/llm.ts`
   - `apps/api/src/routes/insights.ts`
5. Web auth guard + smoke coverage:
   - `apps/web/app/lib/auth-guard.ts`
   - `apps/web/app/api/{sync,insights/rerun,ingest-token,preferences}/route.ts`
   - `apps/api/src/webSmoke.test.ts`

Validation command outcomes:

  pnpm typecheck
  ... apps/web typecheck: Done
  ... apps/api typecheck: Done

  pnpm --filter @health-agent/api test
  {"ok":true}
  {"ok":true}
  {"ok":true}
  {"ok":true,"counts":{"weights":2,"nutrition":2,"vitals":2,"workouts":1,"sleep":2},"warnings":[]}
  {"ok":true}

## Interfaces and Dependencies

Expected interfaces after completion:

1. `IngestFile` model in `apps/api/prisma/schema.prisma` includes failure metadata fields for dead-letter behavior.
2. New audit model exists for administrative migration events (name finalized during implementation).
3. `generateInsightsUnifiedDiff` path supports timeout configuration through validated env.
4. API tool script exists under `apps/api/src/tools/` for explicit legacy migration.
5. API test command includes additional smoke checks that import web pages and auth-required route handlers.

Plan revision note: Initial plan created to implement all findings from the repository review per user request.

Plan revision note (2026-02-12): Updated plan to reflect completed implementation milestones, key decisions, and local validation blocker (`pnpm` unavailable).

Plan revision note (2026-02-12): Updated plan after unblocking toolchain availability and completing full validation (`typecheck` + API tests).
