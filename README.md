# HealthAgent

HealthAgent ingests daily Apple Health exports (e.g. Health Auto Export JSON), stores raw payloads for audit/debug, parses into a canonical Postgres schema, computes a compact metrics pack, and (optionally) updates a living insights Markdown document via unified diff patches.

- API: Fastify + Prisma (Postgres)
- Web: Next.js App Router
- Raw storage: local disk (dev) or GCS (cloud)

For a deeper “how it works” walkthrough, see [ONBOARDING.md](docs/ONBOARDING.md).

## Repo layout

- `apps/api` — Fastify API + Prisma
- `apps/web` — Next.js frontend
- `storage/local` — local raw ingest storage (dev)

## Run locally

Prereqs: Node 20+, pnpm, Docker.

```bash
pnpm i
pnpm db:up
pnpm db:generate
pnpm db:migrate

cp .env.example apps/api/.env
pnpm dev
```

- API: http://localhost:3001/health
- Web: http://localhost:3000

Tip: the API loads dotenv from `apps/api/.env`.

## Key endpoints

- `POST /api/ingest/apple-health` (auth: `X-INGEST-TOKEN`)
- `POST /api/pipeline/run` (optional auth: `X-PIPELINE-TOKEN` if `PIPELINE_TOKEN` is set)
- `GET /api/pipeline/latest`
- `GET /api/insights/latest`
- `GET /api/data-quality/summary`

## Config (API)

See `.env.example` for the full list. Common ones:

- `INGEST_TOKEN`
- `DATABASE_URL`
- `STORAGE_PROVIDER=local|gcs` (+ `STORAGE_LOCAL_DIR` or `STORAGE_BUCKET`)
- `OPENAI_API_KEY` + `INSIGHTS_MODEL` (optional)
- `GOAL_TARGET_WEIGHT_KG` + `GOAL_TARGET_DATE` (optional)

## Deploy

GCP deployment (Cloud Run + Cloud SQL + GCS + Cloud Scheduler) is documented in [DEPLOY_GCP.md](docs/DEPLOY_GCP.md).
