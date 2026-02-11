# Deploy to GCP (Cloud Run + Postgres + GCS + Cloud Scheduler)

Short, low-cost path for the API.

## Quick path

1) Create a GCS bucket  
2) Use an external/serverless Postgres provider  
3) Build and deploy the API to Cloud Run  
4) Add a Cloud Scheduler job for `/api/pipeline/run`  

## Prereqs

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com cloudscheduler.googleapis.com storage.googleapis.com
```

## Create bucket

```bash
export BUCKET=health-agent-raw-YOUR_PROJECT_ID
export REGION=australia-southeast1
gcloud storage buckets create gs://$BUCKET --location=$REGION
```

## Build + deploy

```bash
gcloud builds submit --config cloudbuild-api.yaml

export SERVICE=health-agent-api
export IMAGE=gcr.io/$PROJECT_ID/health-agent-api:latest

gcloud run deploy $SERVICE \
  --image $IMAGE \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars API_PORT=8080,STORAGE_PROVIDER=gcs,STORAGE_BUCKET=$BUCKET,INSIGHTS_ENABLED=false \
  --set-secrets DATABASE_URL=health-agent-database-url:latest \
  --set-secrets DATABASE_DIRECT_URL=health-agent-database-direct-url:latest \
  --set-secrets INTERNAL_API_KEY=internal-api-key:latest \
  --set-secrets PIPELINE_TOKEN=health-agent-pipeline-token:latest \
  --set-secrets TINKER_API_KEY=tinker-api-key:latest
```

## Daily pipeline job

```bash
export API_URL=$(gcloud run services describe $SERVICE --region $REGION --format='value(status.url)')

gcloud scheduler jobs create http health-agent-daily-pipeline \
  --location $REGION \
  --schedule "0 3 * * *" \
  --time-zone "UTC" \
  --uri "$API_URL/api/pipeline/run" \
  --http-method POST \
  --headers "X-PIPELINE-TOKEN=REPLACE_ME,X-USER-ID=REPLACE_USER_ID" \
  --attempt-deadline 10m
```

## Notes

- Prefer Secret Manager for secrets.
- Never set `INTERNAL_API_KEY`, `PIPELINE_TOKEN`, `DATABASE_URL`, `NEXTAUTH_SECRET`, or provider keys inline with `--set-env-vars`.
- Web deploy isn’t covered here; use `API_BASE_URL` for the web app.
- Cloud SQL is supported but always-on; use it only if you want a managed DB.
