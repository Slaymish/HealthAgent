type PipelineLatestResponse = {
  latestRun:
    | {
        id: string;
        createdAt: string;
        processedIngestCount: number;
        metricsPack: unknown;
      }
    | null;
};

export default async function MetricsPage() {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
  const res = await fetch(`${apiBaseUrl}/api/pipeline/latest`);

  if (!res.ok) {
    return (
      <main>
        <h1>Latest metrics</h1>
        <p>Failed to load from API: {res.status}</p>
      </main>
    );
  }

  const data = (await res.json()) as PipelineLatestResponse;

  return (
    <main>
      <h1>Latest metrics</h1>
      {data.latestRun ? (
        <>
          <p>
            Run: {data.latestRun.id} (processed {data.latestRun.processedIngestCount} ingest files)
          </p>
          <pre>{JSON.stringify(data.latestRun.metricsPack, null, 2)}</pre>
        </>
      ) : (
        <p>No pipeline runs yet.</p>
      )}
    </main>
  );
}
