1) Repo + scaffolding
- [ ] Create monorepo (`pnpm workspaces`)
- [ ] Add `apps/api` (Fastify + TS) + `apps/web` (Next.js + TS)
- [ ] Add `packages/shared` for shared types

2) Database + migrations
- [ ] Stand up Postgres (Docker local)
- [ ] Add Prisma schema + migrations
- [ ] Create canonical tables: `ingest_files`, `daily_weight`, `daily_nutrition`, `workouts`, `sleep_sessions`, `daily_vitals`, `insights_docs`

3) Ingestion endpoint (Apple Health → you)
- [ ] Implement `POST /api/ingest/apple-health`
- [ ] Authenticate via `X-INGEST-TOKEN`
- [ ] Store raw payload to object storage (or local disk for dev)
- [ ] Insert an `ingest_files` row
- [ ] Basic “last ingest status” endpoint for the UI

4) Parser + normaliser
- [ ] Write a parser that turns the export format into canonical rows
- [ ] Upsert logic (idempotent) so reprocessing doesn’t duplicate rows
- [ ] Unit tests for parsing (one sample file)

5) Daily pipeline job
- [ ] Implement `POST /api/pipeline/run`
- [ ] Load unprocessed ingest files → parse → upsert → mark processed
- [ ] Compute the metrics pack for last 7/14/28 days
- [ ] Persist metrics pack (JSON blob tied to a run)

6) Insights doc diff writer (LLM)
- [ ] Store an initial baseline `insights.md` in DB
- [ ] Provide the model: previous doc + metrics pack
- [ ] Require output as **unified diff**
- [ ] Apply patch server-side, store new doc version + diff

7) Frontend (the “useful” screens)
- [ ] Dashboard: on-track card + score tiles + key levers
- [ ] Trends page (weight, calories/protein, sleep, training volume)
- [ ] Insights page: latest doc + diff history
- [ ] Data quality page: last ingest + missing days

8) Cloud deploy (daily automatic)
- [ ] Deploy API to Cloud Run (or equivalent)
- [ ] Add object storage bucket
- [ ] Add hosted Postgres
- [ ] Add daily scheduler to hit `/api/pipeline/run`
- [ ] Point Health exporter app at your ingest endpoint

9) Tighten correctness
- [ ] Add “numbers used” section under the insights doc
- [ ] Add sanity checks: impossible calories, negative sleep, workout duplicates
- [ ] Add alerts: “no ingest in 36h” (optional)

10) Iterate on leverage + on-track logic
- [ ] Define goal target weight + target date
- [ ] Implement required weight-loss slope + compare to observed trend slope
- [ ] Improve lever selection rules (always 3 max, always actionable)
