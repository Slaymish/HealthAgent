import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardList, FileClock, NotebookText } from "lucide-react";
import { Badge, Card, PageHeader } from "../components/ui";
import { demoInsightsHistory, demoInsightsLatest } from "../demo-data";
import { formatDateTime } from "../lib/format";
import { getSessionOrNull } from "../lib/session";
import { fetchUserApi } from "../lib/api-client";
import RerunInsightsButton from "./rerun-insights-button";
import ReactMarkdown from "react-markdown";

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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly insights review",
  description: "User-scoped weekly insight summaries generated from HealthAgent pipeline runs.",
  alternates: {
    canonical: "/insights"
  },
  robots: {
    index: false,
    follow: false
  }
};

function InsightMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        // Style headings
        h1: ({ children }) => <h1 className="stat-value">{children}</h1>,
        h2: ({ children }) => <h2 className="stat-value">{children}</h2>,
        h3: ({ children }) => <h3 className="stat-value">{children}</h3>,

        // Style paragraphs
        p: ({ children }) => <p className="muted">{children}</p>,

        // Style lists
        ul: ({ children }) => <ul className="list">{children}</ul>,
        ol: ({ children }) => <ol className="list">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,

        // Style bold text
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,

        // Style links
        a: ({ href, children }) => (
          <a href={href} className="link" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),

        // Style inline code
        code: ({ children }) => (
          <code className="chip">{children}</code>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
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
    const [latestRes, historyRes] = await Promise.all([
      fetchUserApi<InsightsLatestResponse>(session, "/api/insights/latest"),
      fetchUserApi<InsightsHistoryResponse>(session, "/api/insights/history")
    ]);

    if (!latestRes.ok || !latestRes.data || !historyRes.ok || !historyRes.data) {
      return (
        <div className="section">
          <PageHeader title="Review" description="Weekly synthesis of what changed, why, and what to do next." />
          <Card title="API unavailable">
            <p className="muted">Failed to load insights from API.</p>
          </Card>
        </div>
      );
    }

    latest = latestRes.data;
    history = historyRes.data;
  }

  return (
    <div className="section">
      <PageHeader
        title="Review"
        description={isDemo ? "Demo view: sign in for your weekly synthesis." : "Weekly changes and what to adjust."}
        meta={
          latest.latest
            ? [{ label: "Last updated", value: formatDateTime(latest.latest.createdAt) }]
            : [{ label: "Status", value: "No documents yet" }]
        }
      />

      {!latest.latest ? (
          <Card title="No insights yet" subtitle="Run the pipeline to generate a synthesis." icon={<ClipboardList aria-hidden="true" />}>
            <div className="stack">
              <p className="muted">After a run, you will see the weekly summary here.</p>
              <div className="summary-strip">
                <RerunInsightsButton />
                <Link className="button" href="/">
                  Go to Status
                </Link>
              </div>
            </div>
          </Card>
        ) : (
        <>
          <Card
            title="Weekly synthesis"
            subtitle="Summary with supporting signals."
            icon={<NotebookText aria-hidden="true" />}
            action={<Badge tone="neutral">Doc {latest.latest.id}</Badge>}
          >
            <div className="stack">
              <div className="summary-strip">
                <RerunInsightsButton />
                <span className="chip">Pipeline run: {latest.latest.pipelineRunId ?? "n/a"}</span>
                <span className="chip">Updated: {formatDateTime(latest.latest.createdAt)}</span>
              </div>
              <InsightMarkdown markdown={latest.latest.markdown} />
              <Link className="chip" href="/trends">
                Supporting charts →
              </Link>
            </div>
          </Card>
        </>
      )}

      <Card title="History" subtitle="Recent documents and sources." icon={<FileClock aria-hidden="true" />}>
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
