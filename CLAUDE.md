# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quickstart Commands

```bash
# Initial setup
pnpm i
pnpm db:up                    # Start Postgres via Docker
pnpm db:generate              # Generate Prisma client
pnpm db:migrate               # Run migrations
cp .env.example apps/api/.env # Copy env template for API
cp .env.example .env          # Copy env template for root/web

# Development
pnpm dev                      # Start API (port 3001) and web (port 3000) in parallel

# Database operations
pnpm db:down                  # Stop Postgres container

# Sample data
pnpm --filter @health-agent/api seed:sample  # Load sample data and run pipeline

# Build and typecheck
pnpm build                    # Build all packages
pnpm typecheck                # Typecheck all packages

# API-specific commands (from apps/api/)
pnpm prisma:studio            # Open Prisma Studio browser
pnpm users:list               # List all users in the database
pnpm parse:test               # Test the Apple Health parser
pnpm insights:sanitize        # Sanitize existing insights docs
pnpm smoke                    # Run API smoke tests
```

## Repository Architecture

This is a **monorepo** using **pnpm workspaces** with three main components:

### Apps
- **`apps/api/`** — Fastify REST API with Prisma ORM
  - Processes Apple Health exports via `/api/ingest/apple-health`
  - Computes metrics packs via `/api/pipeline/run`
  - Uses ESM (imports require `.js` extensions)
  - Entry point: `apps/api/src/server.ts`

- **`apps/web/`** — Next.js 14 App Router frontend
  - Uses NextAuth for GitHub OAuth
  - Fetches data from API via `apps/web/app/api/` proxy routes
  - Entry point: `apps/web/app/page.tsx`

### Packages
- **`packages/shared/`** — Shared constants and types between API and web

### Storage
- **`storage/local/`** — Local filesystem storage for raw ingest payloads (dev only)
- Production uses Google Cloud Storage (GCS)

## Core Data Flow

1. **Ingest**: Apple Health Auto Export JSON → `POST /api/ingest/apple-health`
   - Auth: `X-INGEST-TOKEN` header (per-user token hash)
   - Payload stored raw in storage (local or GCS)
   - Creates `IngestFile` record in Postgres

2. **Pipeline**: `POST /api/pipeline/run` (internal endpoint)
   - Auth: `X-INTERNAL-API-KEY` + `X-USER-ID` headers (or `X-PIPELINE-TOKEN`)
   - Reads unprocessed `IngestFile` records
   - Parses Apple Health export → canonical tables
   - Computes metrics pack (7d/14d/28d aggregations)
   - Optionally generates insights via LLM
   - Creates `PipelineRun` record with computed metrics

3. **Parser**: `apps/api/src/parsers/healthAutoExport.ts`
   - Converts Health Auto Export JSON format to canonical schema
   - Handles: weight, nutrition, workouts, sleep, vitals
   - Generates dedupe keys for idempotency

4. **Metrics**: `apps/api/src/routes/pipeline.ts`
   - `computeMetricsPack()` — Aggregates daily data into 7/14/28 day windows
   - Computes linear regression slopes for weight trends
   - Generates actionable "levers" (protein, sleep, training)

5. **Insights** (optional): `apps/api/src/insights/llm.ts`
   - Uses Tinker LLM or OpenAI API to update insights doc
   - Generates unified diff patch against previous markdown
   - Applies patch and sanitizes to bullet-only format

## Key Concepts

### Multi-user Architecture
- **Legacy user**: Single-user mode with `INGEST_TOKEN` (user ID: `legacy-user`)
- **Multi-user**: NextAuth GitHub OAuth creates new users with unique ingest tokens
- All data is scoped by `userId` in database tables

### Authentication Patterns
- **Ingest endpoint**: Per-user token via `X-INGEST-TOKEN` or `Authorization: Bearer <token>`
- **Internal API**: Shared `INTERNAL_API_KEY` via `X-INTERNAL-API-KEY` header
- **Pipeline token**: Optional `PIPELINE_TOKEN` for scheduled runs
- See `apps/api/src/auth.ts` for auth logic

### Storage Abstraction
- `STORAGE_PROVIDER=local|gcs` environment variable
- `apps/api/src/storage/storage.ts` provides unified read/write interface
- Local: writes to `storage/local/apple-health/<userId>/<filename>.json`
- GCS: writes to configured Google Cloud Storage bucket

### Prisma Schema
- **Canonical tables**: `DailyWeight`, `DailyNutrition`, `Workout`, `SleepSession`, `DailyVitals`
- All use composite primary keys: `userId` + date/sourceId
- Upsert pattern prevents duplicates
- See `apps/api/prisma/schema.prisma`

### Environment Configuration
- API loads env from `apps/api/.env` (via `apps/api/src/dotenv.ts`)
- Web loads env from root `.env`
- Root `INTERNAL_API_KEY` must match API's `INTERNAL_API_KEY`
- See `.env.example` for all required variables

### Tinker LLM Integration
- Local LLM via Python bridge: `apps/api/tinker_bridge.py`
- Configured via `TINKER_MODEL_PATH` and `TINKER_BRIDGE_CMD` env vars
- Alternative: OpenAI API via `OPENAI_API_KEY` and `INSIGHTS_MODEL`
- Model generates unified diff patches for insights updates

## Deployment (GCP)

See `docs/DEPLOY_GCP.md` for full details. Briefly:

1. Build and deploy API to Cloud Run:
   ```bash
   gcloud builds submit --config cloudbuild-api.yaml
   ```

2. Environment is set via Cloud Build substitutions and Secret Manager:
   - `DATABASE_URL`, `DATABASE_DIRECT_URL` (Postgres connection strings)
   - `TINKER_API_KEY` (if using Tinker LLM)

3. Cloud Scheduler job triggers daily pipeline runs:
   - Calls `POST /api/pipeline/run`
   - Auth: `X-PIPELINE-TOKEN` + `X-USER-ID` headers

## Important Notes

- API is ESM — all internal imports must use `.js` extensions
- API uses `API_PORT` env var (not `PORT`), but Cloud Run sets `PORT` (fallback handled)
- `prisma migrate deploy` runs automatically on API start if `PRISMA_MIGRATE_ON_START=true`
- Web app proxy routes at `apps/web/app/api/` forward to API using `INTERNAL_API_KEY`
- All timestamps stored in UTC; frontend converts to local time
- Insights markdown must be bullet-only format (enforced by sanitizer)

## Working with Sample Data

The repo includes a sample Apple Health export (`HealthAutoExport-*.json`). To test:

```bash
pnpm --filter @health-agent/api seed:sample
```

This:
1. Loads sample data into local storage
2. Runs the full pipeline
3. Creates a pipeline run with metrics pack
4. Opens http://localhost:3000 with populated dashboard

## Database Resets

To reset local database:
```bash
pnpm db:down      # Stop container
docker volume rm healthagent_postgres_data  # Remove volume (adjust name if different)
pnpm db:up        # Start fresh container
pnpm db:migrate   # Re-run migrations
```

## Testing Parser

```bash
pnpm --filter @health-agent/api parse:test
```

Tests the Apple Health parser against the sample export file.
