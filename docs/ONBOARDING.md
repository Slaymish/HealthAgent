# HealthAgent Onboarding

Short, practical notes for getting oriented.

## Quickstart (end-to-end)

```bash
pnpm i
pnpm db:up
pnpm db:generate
pnpm db:migrate
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @health-agent/api seed:sample
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/health

## Repo map

- `apps/api/` — Fastify API + Prisma
- `apps/web/` — Next.js frontend
- `storage/local/` — local raw ingest storage
- `apps/api/prisma/schema.prisma` — canonical schema

## Key flow (one sentence)

Ingest JSON → store raw → normalize into Postgres → compute metrics → render UI.

## Where to start reading

1. `apps/api/src/routes/pipeline.ts`
2. `apps/api/src/routes/ingest.ts`
3. `apps/api/src/parsers/healthAutoExport.ts`
4. `apps/web/app/page.tsx`

## Notes

- API dotenv lives at `apps/api/.env`.
- Web env lives at `apps/web/.env.local`.
- `INTERNAL_API_KEY` and `PIPELINE_TOKEN` must match between API and web env files.
- Storage providers: `local` and `gcs`.
- API is ESM, so internal imports use `.js` extensions.
