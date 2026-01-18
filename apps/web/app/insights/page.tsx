import Link from "next/link";
import { Badge, Card, PageHeader } from "../components/ui";
import { demoInsightsHistory, demoInsightsLatest } from "../demo-data";
import { formatDateTime } from "../lib/format";
import { getSessionOrNull } from "../lib/session";

type InsightsLatestResponse = {
  latest:
    | {
        id: string;
        createdAt: string;
        markdown: string;
        diffFromPrev: string | null;
        pipelineRunId: string | null;
      }
    | null;
};

type InsightsHistoryResponse = {
  docs: Array<{
    id: string;
    createdAt: string;
    diffFromPrev: string | null;
    pipelineRunId: string | null;
  }>;
};

type DiffItem = { text: string; tone: "positive" | "attention" | "warn" | "neutral" };

export const dynamic = "force-dynamic";

function InsightMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n").map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => line.startsWith("#"));
  const bullets = lines.filter((line) => line.startsWith("-"));
  const paragraphs = lines.filter((line) => !line.startsWith("#") && !line.startsWith("-"));

  return (
    <div className="stack">
      {heading ? <div className="stat-value">{heading.replace(/^#+\s*/, "")}</div> : null}
      {paragraphs.length ? (
        paragraphs.map((p, index) => (
          <p key={index} className="muted">
            {p}
          </p>
        ))
      ) : null}
      {bullets.length ? (
        <ul className="list">
          {bullets.map((item) => (
            <li key={item}>{item.replace(/^-+\s*/, "")}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function parseDiff(diff: string | null | undefined): DiffItem[] {
  if (!diff) return [];
  return diff
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (line.startsWith("+++")) return false;
      if (line.startsWith("---")) return false;
      if (line.startsWith("@@")) return false;
      return line.startsWith("+") || line.startsWith("-");
    })
    .map((line) => {
      const tone: DiffItem["tone"] = line.startsWith("-") ? "attention" : line.startsWith("+") ? "positive" : "neutral";
      return { text: line.replace(/^[-+]\s*/, ""), tone };
    });
}

function toneClassName(tone: DiffItem["tone"]) {
  if (tone === "positive") return "good";
  if (tone === "attention") return "attention";
  if (tone === "warn") return "warn";
  return "";
}

export default async function InsightsPage() {
  const session = await getSessionOrNull();
  const isDemo = !session;

  let latest: InsightsLatestResponse;
  let history: InsightsHistoryResponse;

  if (isDemo) {
    latest = demoInsightsLatest as InsightsLatestResponse;
    history = demoInsightsHistory as InsightsHistoryResponse;
  } else {
    const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

    const [latestRes, historyRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/insights/latest`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/insights/history`, { cache: "no-store" })
    ]);

    if (!latestRes.ok || !historyRes.ok) {
      return (
        <div className="section">
          <PageHeader title="Review" description="Weekly synthesis of what changed, why, and what to do next." />
          <Card title="API unavailable">
            <p className="muted">Failed to load insights from API.</p>
          </Card>
        </div>
      );
    }

    latest = (await latestRes.json()) as InsightsLatestResponse;
    history = (await historyRes.json()) as InsightsHistoryResponse;
  }

  const diffItems = parseDiff(latest.latest?.diffFromPrev);

  return (
    <div className="section">
      <PageHeader
        title="Review"
        description={isDemo ? "Demo view: sign in to see your own weekly synthesis." : "Narrative first: claim → evidence → lever."}
        meta={
          latest.latest
            ? [{ label: "Last updated", value: formatDateTime(latest.latest.createdAt) }]
            : [{ label: "Status", value: "No documents yet" }]
        }
      />

      {!latest.latest ? (
        <Card title="No insights yet" subtitle="Run the pipeline to generate a first synthesis.">
          <div className="stack">
            <p className="muted">Once the pipeline runs, you will see synthesized notes and comparisons here.</p>
            <Link className="button" href="/">
              Go to Status
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card
            title="Weekly synthesis"
            subtitle="Lead with the narrative; numbers back it up."
            action={<Badge tone="neutral">Doc {latest.latest.id}</Badge>}
          >
            <div className="stack">
              <div className="summary-strip">
                <span className="chip">Pipeline run: {latest.latest.pipelineRunId ?? "n/a"}</span>
                <span className="chip">Updated: {formatDateTime(latest.latest.createdAt)}</span>
              </div>
              <InsightMarkdown markdown={latest.latest.markdown} />
              <Link className="chip" href="/trends">
                See supporting charts →
              </Link>
            </div>
          </Card>

          <Card title="What changed vs last week" subtitle="Diffs are brief and traceable.">
            <div className="stack">
              {diffItems.length ? (
                <ul className="change-list">
                  {diffItems.map((item) => (
                    <li key={item.text} className="change-item">
                      <div className="change-meta">
                        <span className={`chip ${toneClassName(item.tone)}`.trim()}>{item.tone === "positive" ? "Improved" : item.tone === "attention" ? "Regressed" : "Changed"}</span>
                        <Link className="chip" href="/trends">
                          Evidence
                        </Link>
                      </div>
                      <div className="stat-value">{item.text}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No diff provided.</p>
              )}
              {latest.latest.diffFromPrev ? (
                <details className="raw-toggle">
                  <summary>View raw diff</summary>
                  <pre className="code-block">{latest.latest.diffFromPrev}</pre>
                </details>
              ) : null}
            </div>
          </Card>
        </>
      )}

      <Card title="History" subtitle="Chronological list of documents and their sources.">
        {history.docs.length === 0 ? (
          <p className="muted">No history to show yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Document</th>
                  <th>Pipeline run</th>
                </tr>
              </thead>
              <tbody>
                {history.docs.map((doc) => (
                  <tr key={doc.id}>
                    <td>{formatDateTime(doc.createdAt)}</td>
                    <td>{doc.id}</td>
                    <td>{doc.pipelineRunId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
