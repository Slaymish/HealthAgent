import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ListChecks, PlugZap } from "lucide-react";
import { Card, Grid, PageHeader } from "../components/ui";
import { getSessionOrNull } from "../lib/session";
import { prisma } from "../lib/prisma";
import TokenManager from "./token-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect Apple Health exports",
  description:
    "Generate an ingest token and configure your exporter to send Apple Health Auto Export JSON files to HealthAgent.",
  alternates: {
    canonical: "/connect"
  },
  openGraph: {
    title: "Connect Apple Health exports",
    description:
      "Generate an ingest token and configure your exporter to send Apple Health Auto Export JSON files to HealthAgent.",
    url: "/connect"
  },
  twitter: {
    title: "Connect Apple Health exports",
    description:
      "Generate an ingest token and configure your exporter to send Apple Health Auto Export JSON files to HealthAgent."
  }
};

export default async function ConnectPage() {
  const session = await getSessionOrNull();
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
  const ingestUrl = `${apiBaseUrl}/api/ingest/apple-health`;

  if (!session?.user?.id) {
    return (
      <div className="section">
        <PageHeader title="Connect Apple Health" description="Sign in to generate an ingest token." />
        <Card title="Sign in to connect" icon={<PlugZap aria-hidden="true" />}>
          <p className="muted">Create a GitHub session to generate your ingest token.</p>
          <Link className="button" href="/api/auth/signin">
            Sign in with GitHub
          </Link>
        </Card>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ingestTokenPreview: true, email: true, name: true }
  });

  return (
    <div className="section">
      <PageHeader
        title="Connect Apple Health"
        description="Generate a token and point your exporter at the endpoint."
        meta={[
          { label: "Endpoint", value: ingestUrl },
          { label: "User ID", value: session.user.id },
          ...(user?.email ? [{ label: "Email", value: user.email }] : [])
        ]}
      />

      <Grid columns={2}>
        <Card title="Your ingest token" subtitle="Generate a token for exports." icon={<KeyRound aria-hidden="true" />}>
          <TokenManager initialPreview={user?.ingestTokenPreview ?? null} ingestUrl={ingestUrl} />
        </Card>

        <Card title="Setup steps" subtitle="Point your exporter at the ingest endpoint." icon={<ListChecks aria-hidden="true" />}>
          <ol className="list">
            <li>Open your exporter (e.g., Health Auto Export) and add a REST target.</li>
            <li>Set the URL to <code>{ingestUrl}</code>.</li>
            <li>Set header <code>X-INGEST-TOKEN</code> to the token above.</li>
            <li>Send daily exports (JSON) to keep the pipeline fresh.</li>
          </ol>
          <p className="muted">Tip: run a manual export to confirm a recent ingest appears in Data.</p>
        </Card>
      </Grid>
    </div>
  );
}
