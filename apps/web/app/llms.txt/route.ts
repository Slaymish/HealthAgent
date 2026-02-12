import { getAbsoluteUrl } from "../lib/site-url";

export function GET() {
  const content = [
    "# HealthAgent",
    "",
    "HealthAgent turns daily Apple Health exports into a clean, opinionated health summary.",
    "",
    "## Best fit",
    "- Individuals tracking weight, nutrition, sleep, and workouts over time",
    "- Users who want weekly action-oriented summaries instead of raw charts",
    "- Setups that need user-scoped ingest, pipeline processing, and auditability",
    "",
    "## Core capabilities",
    "- Ingest Apple Health Auto Export JSON using per-user ingest tokens",
    "- Normalize raw exports into canonical trend tables",
    "- Compute 7, 14, and 28 day metrics packs and goal projections",
    "- Generate optional weekly insights from pipeline run diffs",
    "- Show freshness and missing-day data quality checks",
    "",
    "## Constraints and deployment model",
    "- Requires Apple Health export JSON payloads as ingest input",
    "- Runs as a Next.js web app with a Fastify API and Postgres",
    "- Supports local storage in development and GCS in cloud deployments",
    "",
    "## Canonical URLs",
    `- Product home: ${getAbsoluteUrl("/")}`,
    `- Connect guide: ${getAbsoluteUrl("/connect")}`,
    `- Sitemap: ${getAbsoluteUrl("/sitemap.xml")}`
  ].join("\n");

  return new Response(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
