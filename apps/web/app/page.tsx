import Link from "next/link";
import { Badge, Card, Grid, PageHeader, Stat } from "./components/ui";
import { demoPipelineLatest } from "./demo-data";
import { getSessionOrNull } from "./lib/session";

type PipelineLatestResponse = {
  latestRun:
    | {
        id: string;
        createdAt: string;
        processedIngestCount: number;
        metricsPack: any;
      }
    | null;
};

export const dynamic = "force-dynamic";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? value.toString() : value.toFixed(digits);
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (Number.isNaN(value)) return "—";
  const rounded = Math.round(value);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function MetricTile({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="metric-tile">
      <h4 className="metric-title">{title}</h4>
      <div className="metric-list">
        {items.map((item) => (
          <div key={item.label} className="metric-item">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const session = await getSessionOrNull();
  const isDemo = !session;

  let data: PipelineLatestResponse;
  if (isDemo) {
    data = demoPipelineLatest;
  } else {
    const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiBaseUrl}/api/pipeline/latest`, { cache: "no-store" });
    if (!res.ok) {
      return (
        <div className="section">
          <PageHeader title="Dashboard" description="Signals that show whether the plan is working and where to focus." />
          <Card title="API unavailable">
            <p className="muted">Failed to load from API: {res.status}</p>
          </Card>
        </div>
      );
    }
    data = (await res.json()) as PipelineLatestResponse;
  }

  const pack = data.latestRun?.metricsPack;

  const onTrack = pack?.onTrack as
    | {
        onTrack: boolean;
        targetWeightKg: number;
        targetDate: string;
        requiredSlopeKgPerDay: number;
        observedSlopeKgPerDay14: number;
      }
    | null
    | undefined;

  const levers = (pack?.levers ?? []) as string[];

  const scoreTiles = [
    {
      title: "Weight",
      items: [
        {
          label: "Latest",
          value: pack?.weight?.latest?.weightKg != null ? `${formatNumber(pack.weight.latest.weightKg, 1)} kg` : "—"
        },
        { label: "7d slope", value: pack?.weight?.slopeKgPerDay7 != null ? `${formatNumber(pack.weight.slopeKgPerDay7, 3)} kg/day` : "—" },
        { label: "14d slope", value: pack?.weight?.slopeKgPerDay14 != null ? `${formatNumber(pack.weight.slopeKgPerDay14, 3)} kg/day` : "—" }
      ]
    },
    {
      title: "Nutrition",
      items: [
        { label: "Calories (7d)", value: pack?.nutrition?.avgCalories7 != null ? formatNumber(pack.nutrition.avgCalories7, 0) : "—" },
        { label: "Calories (14d)", value: pack?.nutrition?.avgCalories14 != null ? formatNumber(pack.nutrition.avgCalories14, 0) : "—" },
        { label: "Protein (7d)", value: pack?.nutrition?.avgProteinG7 != null ? `${formatNumber(pack.nutrition.avgProteinG7, 0)} g` : "—" },
        { label: "Protein (14d)", value: pack?.nutrition?.avgProteinG14 != null ? `${formatNumber(pack.nutrition.avgProteinG14, 0)} g` : "—" }
      ]
    },
    {
      title: "Training",
      items: [
        { label: "Sessions (7d)", value: pack?.training?.sessions7 != null ? formatNumber(pack.training.sessions7, 0) : "—" },
        { label: "Sessions (14d)", value: pack?.training?.sessions14 != null ? formatNumber(pack.training.sessions14, 0) : "—" },
        { label: "Minutes (7d)", value: pack?.training?.minutes7 != null ? formatMinutes(pack.training.minutes7) : "—" },
        { label: "Minutes (14d)", value: pack?.training?.minutes14 != null ? formatMinutes(pack.training.minutes14) : "—" }
      ]
    },
    {
      title: "Sleep",
      items: [
        { label: "Avg sleep (7d)", value: pack?.sleep?.avgSleepMin7 != null ? formatMinutes(pack.sleep.avgSleepMin7) : "—" },
        { label: "Avg sleep (14d)", value: pack?.sleep?.avgSleepMin14 != null ? formatMinutes(pack.sleep.avgSleepMin14) : "—" }
      ]
    },
    {
      title: "Recovery",
      items: [
        { label: "Resting HR (7d)", value: pack?.recovery?.avgRestingHr7 != null ? `${formatNumber(pack.recovery.avgRestingHr7, 0)} bpm` : "—" },
        { label: "Resting HR (14d)", value: pack?.recovery?.avgRestingHr14 != null ? `${formatNumber(pack.recovery.avgRestingHr14, 0)} bpm` : "—" }
      ]
    }
  ];

  return (
    <div className="section">
      <PageHeader
        title="Dashboard"
        description={
          isDemo
            ? "Demo view: sign in to see your own data."
            : "Latest read on whether the plan is on track, how the inputs look, and the levers to pull next."
        }
        meta={
          data.latestRun
            ? [{ label: "Last run", value: formatDate(data.latestRun.createdAt) }]
            : [{ label: "Pipeline", value: "Not run yet" }]
        }
      />

      {!data.latestRun ? (
        <Card title="No pipeline runs yet">
          <p className="muted">Ingest data and trigger a pipeline run to start seeing health signals.</p>
        </Card>
      ) : (
        <>
          <Grid columns={2}>
            <Card
              title="Latest pipeline run"
              subtitle="Quick check that ingestion and processing are flowing."
              action={<Badge tone="neutral">Run {data.latestRun.id}</Badge>}
            >
              <div className="stack">
                <Stat label="Created" value={formatDate(data.latestRun.createdAt)} />
                <Stat label="Processed ingest files" value={data.latestRun.processedIngestCount ?? "—"} />
              </div>
            </Card>

            <Card
              title="Goal tracking"
              subtitle="Compares the plan to current trend so we can adjust early."
              action={
                onTrack ? (
                  <Badge tone={onTrack.onTrack ? "positive" : "negative"}>
                    {onTrack.onTrack ? "On track" : "Off track"}
                  </Badge>
                ) : (
                  <Badge tone="neutral">No goal set</Badge>
                )
              }
            >
              {onTrack ? (
                <div className="stack">
                  <Stat label="Target" value={`${onTrack.targetWeightKg} kg by ${onTrack.targetDate}`} />
                  <Stat
                    label="Required slope"
                    hint="Expected rate to hit the target"
                    value={`${onTrack.requiredSlopeKgPerDay.toFixed(3)} kg/day`}
                  />
                  <Stat
                    label="Observed slope (14d)"
                    hint="Current trend based on the last two weeks"
                    value={`${onTrack.observedSlopeKgPerDay14.toFixed(3)} kg/day`}
                  />
                </div>
              ) : (
                <p className="muted">
                  Goal not configured. Set <code>GOAL_TARGET_WEIGHT_KG</code> and <code>GOAL_TARGET_DATE</code> in the API
                  environment.
                </p>
              )}
            </Card>
          </Grid>

          <Card title="Score tiles" subtitle="High-level health inputs and readiness at a glance.">
            <div className="metric-grid">
              {scoreTiles.map((tile) => (
                <MetricTile key={tile.title} title={tile.title} items={tile.items} />
              ))}
            </div>
          </Card>

          <Card title="Key levers" subtitle="Actions that matter most right now.">
            {levers.length ? (
              <div className="list-inline">
                {levers.map((lever) => (
                  <span key={lever} className="pill">
                    {lever}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No levers were identified for this run.</p>
            )}
          </Card>

          <Card title="Diagnostics" subtitle="When you need to sanity-check the data or inspect raw outputs.">
            <div className="list-inline">
              <Link className="button" href="/data-quality">
                Data quality
              </Link>
              <Link className="button" href="/metrics">
                Raw metrics
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
