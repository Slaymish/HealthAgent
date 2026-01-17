# Deploy to GCP (Cloud Run + Postgres + GCS + Cloud Scheduler)

This repo is set up to deploy the API to Cloud Run and store raw ingests in GCS.

## Prereqs

- `gcloud` installed and authenticated
- A GCP project selected

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Enable required APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  cloudscheduler.googleapis.com \
  storage.googleapis.com
```

## 1) Create GCS bucket (raw ingest storage)

```bash
export BUCKET=health-agent-raw-YOUR_PROJECT_ID
# If your database is in APAC (e.g. Neon ap-southeast-2), using an AU region reduces latency/egress.
export REGION=australia-southeast1

gcloud storage buckets create gs://$BUCKET --location=$REGION
```

## 2) Choose your Postgres

This repo uses Postgres via Prisma. You have two options:

- **Option B (managed on GCP): Cloud SQL Postgres** (easy, but can be surprisingly expensive if left running)
- **Option C (budget-friendly): external/serverless Postgres** (avoids “always-on Cloud SQL VM” costs)

If your goal is **<$10/month** and you only ingest once a day, Option C is usually the best fit.

### Option C (recommended for low budget): external/serverless Postgres

Use a Postgres provider that supports **connection pooling** (often via a “pooled” connection string / PgBouncer endpoint). Prisma works best with a pooled endpoint when your compute can scale.

What you need from the provider:

- A Postgres database
- A **pooled** connection string (preferred)
- A **direct** connection string (sometimes required for migrations)

Set these as env vars (names are up to you; the API only requires `DATABASE_URL`):

- `DATABASE_URL` = pooled URL (recommended for runtime)
- `DATABASE_DIRECT_URL` = direct URL (recommended for migrations), if your provider gives one

Then run migrations from your machine:

```bash
# Example:
# export DATABASE_URL='postgresql://...'
# export DATABASE_DIRECT_URL='postgresql://...'
pnpm --filter @health-agent/api prisma:deploy
```

Deploying to Cloud Run (no Cloud SQL attachment):

```bash
export SERVICE=health-agent-api
export IMAGE=gcr.io/$PROJECT_ID/health-agent-api:latest

gcloud run deploy $SERVICE \
  --image $IMAGE \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars \
API_PORT=8080,STORAGE_PROVIDER=gcs,STORAGE_BUCKET=$BUCKET,INGEST_TOKEN=REPLACE_ME,PIPELINE_TOKEN=REPLACE_ME,DATABASE_URL='REPLACE_WITH_PROVIDER_URL'
```

Note: avoid putting secrets directly in command history. For production, prefer Secret Manager + `--set-secrets`.

When deploying the Cloud Run service, you will **not** use `--add-cloudsql-instances` and you will set `DATABASE_URL` to the provider URL.

### Option B: Cloud SQL Postgres

```bash
export INSTANCE=health-agent-pg
export DB=health_agent

gcloud sql instances create "$INSTANCE" \
  --database-version=POSTGRES_16 \
  --region="$REGION" \
  --edition=ENTERPRISE \
  --tier=db-custom-1-4096 \
  --storage-type=SSD \
  --storage-size=10

# run this next
gcloud sql databases create $DB --instance=$INSTANCE

gcloud sql users set-password postgres \
  --instance=$INSTANCE \
  --password='CHOOSE_A_STRONG_PASSWORD'
```

Connection name:

```bash
gcloud sql instances describe $INSTANCE --format='value(connectionName)'
```

- hamishapps:us-central1:health-agent-pg

## 3) Build and deploy API to Cloud Run

### Build image (Cloud Build)

```bash
gcloud builds submit --config cloudbuild-api.yaml
```

This will push:

- `gcr.io/$PROJECT_ID/health-agent-api:$BUILD_ID`
- `gcr.io/$PROJECT_ID/health-agent-api:latest`

### Deploy

Set these env vars (pick strong random tokens):

- `INGEST_TOKEN` (used by exporter app)
- `PIPELINE_TOKEN` (used by Cloud Scheduler)

Do not commit real tokens/passwords into this repo. Use placeholders locally and set real values in Cloud Run.

Note: `gcloud run services describe ... --format='value(...env)'` will print your secrets in plaintext. Avoid pasting that output into docs/chats. If secrets are exposed, rotate them.

If you are using Cloud SQL, you also need a Cloud SQL socket DATABASE_URL. Example:

```
postgresql://postgres:PASSWORD@/health_agent?host=/cloudsql/INSTANCE_CONNECTION_NAME&schema=public
```

Deploy command:

```bash
export SERVICE=health-agent-api
export IMAGE=gcr.io/$PROJECT_ID/health-agent-api:latest
export INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE --format='value(connectionName)')

gcloud run deploy $SERVICE \
  --image $IMAGE \
  --region $REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances $INSTANCE_CONNECTION_NAME \
  --set-env-vars \
API_PORT=8080,STORAGE_PROVIDER=gcs,STORAGE_BUCKET=$BUCKET,INGEST_TOKEN=REPLACE_ME,PIPELINE_TOKEN=REPLACE_ME,DATABASE_URL='postgresql://postgres:PASSWORD@/health_agent?host=/cloudsql/'$INSTANCE_CONNECTION_NAME'&schema=public'

### Low-cost Cloud Run settings (recommended)

To keep Cloud Run costs near-zero when idle:

- Set **min instances = 0**
- Consider setting **max instances = 1** (helps protect your Postgres from too many concurrent connections)

You can apply these on deploy, for example:

```bash
gcloud run deploy $SERVICE \
  --region $REGION \
  --min-instances 0 \
  --max-instances 1
```
```

For production, prefer storing `INGEST_TOKEN`, `PIPELINE_TOKEN`, and `DATABASE_URL` in Secret Manager and mounting them as env vars via `--set-secrets` instead of `--set-env-vars`.

Grant the Cloud Run runtime service account permission to use the bucket (adjust SA if you use a custom one):

```bash
export RUN_SA=$(gcloud run services describe $SERVICE --region $REGION --format='value(spec.template.spec.serviceAccountName)')

gcloud storage buckets add-iam-policy-binding gs://$BUCKET \
  --member=serviceAccount:$RUN_SA \
  --role=roles/storage.objectAdmin
```

Run migrations against Cloud SQL (recommended via Cloud SQL Auth Proxy):

Before running the proxy, ensure you have Application Default Credentials (ADC) set up (this is separate from `gcloud auth login`):

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project $PROJECT_ID
```

Your user (or service account) also needs `roles/cloudsql.client` on the project.

```bash
export INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE --format='value(connectionName)')

# If you have local Postgres running (e.g. via docker-compose), 5432 is often already taken.
# Use a different local port for the proxy (example: 5433).
export PROXY_PORT=5433
cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port $PROXY_PORT
```

The Cloud SQL Auth Proxy is just a single binary, but on Arch/aarch64 the AUR packages may not be available. Pick one of these options:

### Option A (recommended): run the proxy via Docker (works on ARM64)

```bash
export INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE --format='value(connectionName)')

docker run --rm -it \
  -p 127.0.0.1:5433:5432 \
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.20.0 \
  --address 0.0.0.0 \
  --port 5432 \
  "$INSTANCE_CONNECTION_NAME"
```

### Option B: install the proxy binary directly (linux_arm64)

```bash
curl -fsSL -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.20.0/cloud-sql-proxy.linux.arm64
chmod +x cloud-sql-proxy
sudo mv cloud-sql-proxy /usr/local/bin/cloud-sql-proxy

export INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE --format='value(connectionName)')
export PROXY_PORT=5433
cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port $PROXY_PORT
```

### Option C: install via system package manager (varies by distro/arch)

If you’re on an amd64 distro that packages it, you can use your OS package.

In another terminal:

```bash
export PROXY_PORT=5433
# Use the password you set earlier with:
#   gcloud sql users set-password postgres --instance=$INSTANCE --password='...'
# If you don't remember it, reset it now:
#   gcloud sql users set-password postgres --instance=$INSTANCE --password='CHOOSE_A_STRONG_PASSWORD'

# Paste or prompt for the password (avoid committing it anywhere):
read -s CLOUDSQL_POSTGRES_PASSWORD?"Cloud SQL postgres password: " && echo
export DATABASE_URL="postgresql://postgres:$CLOUDSQL_POSTGRES_PASSWORD@localhost:$PROXY_PORT/health_agent?schema=public"
pnpm --filter @health-agent/api prisma:deploy
```

## 4) Cloud Scheduler: daily pipeline run

Get the Cloud Run URL:

```bash
export API_URL=$(gcloud run services describe $SERVICE --region $REGION --format='value(status.url)')
```

Create a scheduler job that hits `/api/pipeline/run` with the header `X-PIPELINE-TOKEN`:

```bash
gcloud scheduler jobs create http health-agent-daily-pipeline \
  --location $REGION \
  --schedule "0 3 * * *" \
  --time-zone "UTC" \
  --uri "$API_URL/api/pipeline/run" \
  --http-method POST \
  --headers "X-PIPELINE-TOKEN=REPLACE_ME" \
  --attempt-deadline 10m
```

## 5) Point your exporter app at ingest

- Endpoint: `POST $API_URL/api/ingest/apple-health`
- Header: `X-INGEST-TOKEN: <INGEST_TOKEN>`

## Notes

- The API supports `STORAGE_PROVIDER=local` (dev) and `STORAGE_PROVIDER=gcs` (cloud).
- `/api/pipeline/run` is protected only when `PIPELINE_TOKEN` is set.
- Web deployment isn’t covered here; simplest is Vercel pointing at the API URL via `API_BASE_URL`.
- If you only upload once a day, Cloud Run + Scheduler + external Postgres typically stays very cheap; your largest variable cost is usually LLM usage if `OPENAI_API_KEY` is enabled.
