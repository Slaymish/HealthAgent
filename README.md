# Health Insights Agent

A personal “am I on track?” dashboard that ingests Apple Health exports daily, stores canonical health data in Postgres, computes a compact metrics pack, and uses an LLM to update a living insights document via diffs (so it stays grounded and incremental).

This is **not** “feed the model raw data and pray”. It’s:
1) ingest → 2) normalise → 3) compute metrics → 4) generate doc patch → 5) show results in a clean UI.

## What it answers

The dashboard is designed around one question:

**Am I on track for my goal?**

And two follow-ups:

- **Why / what changed since last time?**
- **What are the highest-leverage things I can do next?**

Inputs (from Apple Health):
- Weight
- Nutrition (calories/macros) — ideally via MacroFactor → Apple Health
- Workouts (type, duration, distance, pace, HR summary)
- Sleep
- Resting heart rate / HRV (if present)

Outputs:
- A simple “on track” scorecard
- Trends (7/14/28 days)
- “Key levers” (3 max, actionable, metric-backed)
- A living insights doc + **diff history** (unified patches)

---

## Tech stack

**Backend**
- Node.js + TypeScript
- Fastify
- Zod (payload validation)
- Prisma (Postgres ORM + migrations)

**Frontend**
- Next.js (TypeScript)

**Infra**
- Postgres
- Object storage for raw exports (S3/GCS)
- Daily scheduler (cron) to run the pipeline

**LLM**
- One module that takes:
  - previous insights doc
  - current metrics pack
  - returns a unified diff patch

---

## How ingestion works (Apple Health)

This project expects **daily automated exports** from Apple Health.

Recommended workflow:
1) Enable MacroFactor → Apple Health so nutrition lands in Apple Health.
2) Use an exporter app (e.g. Health Auto Export) to send **daily JSON/CSV** to your endpoint:
   `POST /api/ingest/apple-health`

We keep every raw payload in object storage (audit trail), then parse & upsert into Postgres.

---

## Data model (high level)

You want *canonical* tables that are stable and easy to query:

- `ingest_files`
  - raw file metadata (received_at, source, checksum, storage_key)
- `daily_nutrition`
  - date, calories, protein_g, carbs_g, fat_g (optionals: fibre, alcohol)
- `daily_weight`
  - date, weight_kg
- `sleep_sessions`
  - start, end, duration_min, quality (if available)
- `workouts`
  - start, type, duration_min, distance_km, avg_hr, max_hr, avg_pace (if available)
- `daily_vitals`
  - date, resting_hr, hrv (if available)
- `insights_docs`
  - versioned markdown docs + diff patches + metrics pack references

---

## The daily pipeline

Triggered once per day by a scheduler:

1) **Parse new exports** since last run
2) **Upsert** into canonical tables
3) **Compute metrics pack** (numbers-only summary)
4) **Generate insights patch** (unified diff)
5) **Persist new doc version** + reference the metrics pack used

### Metrics pack (example contents)

- Date ranges: last 7 / 14 / 28 days
- Weight:
  - latest weight, 7d trend slope, 14d trend slope
  - projected vs required slope for goal date
- Nutrition:
  - avg calories, avg protein, adherence rate
- Training:
  - sessions/week, minutes/week, easy vs hard split (if available)
  - running pace↔HR summary (median HR per pace band)
- Sleep & recovery:
  - avg sleep duration, consistency
  - resting HR change vs prior week

The LLM never sees raw time series unless you explicitly add it later.

---

## Running locally

### Prereqs
- Node 20+
- pnpm
- Docker (for local Postgres)

### Setup
```bash
pnpm i
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

### Endpoints

* `POST /api/ingest/apple-health`

  * receives daily export payload
  * requires an `X-INGEST-TOKEN` header
* `POST /api/pipeline/run`

  * runs parse → upsert → metrics → insights

---

## Environment variables

```bash
# API
INGEST_TOKEN=supersecret
DATABASE_URL=postgresql://...

# Storage for raw ingest payloads
STORAGE_PROVIDER=gcs|s3
STORAGE_BUCKET=...

# LLM
OPENAI_API_KEY=...
INSIGHTS_MODEL=...
```

---

## Security notes

* Treat health data as sensitive.
* Use an ingest token (header) + HTTPS only.
* Store raw files encrypted-at-rest (default on most cloud storage).
* Add a retention policy if you want (e.g. keep raw files 90 days).

---

## Roadmap

v1 (useful):

* automated daily ingestion
* canonical DB
* “on track” scorecard
* trends
* insights doc + diff history

v1.5:

* correlations screen (“not causal”)
* hypotheses log
* basic alerting (e.g. missing ingests)

v2:

* richer workout analysis (HR drift, zones, pace/grade adjustments)
* more personalised levers based on your historical responses

---

## Non-goals

* Replacing your brain
* Pretending correlations are causation
* Training custom models
* A fragile prompt-engineering tower
