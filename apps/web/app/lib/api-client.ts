import type { Session } from "next-auth";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
const pipelineToken = process.env.PIPELINE_TOKEN;

function getInternalApiKey(): string {
  const value = process.env.INTERNAL_API_KEY;
  if (!value) {
    throw new Error("Missing required environment variable: INTERNAL_API_KEY");
  }
  return value;
}

export async function fetchUserApi<T>(
  session: Session | null,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T }> {
  if (!session?.user?.id) return { ok: false, status: 401 };

  const headers = new Headers(init?.headers ?? {});
  headers.set("x-user-id", session.user.id);
  headers.set("x-internal-api-key", getInternalApiKey());
  if (pipelineToken) headers.set("x-pipeline-token", pipelineToken);

  const res = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers
  });

  const data = await res
    .json()
    .catch(() => undefined);

  return { ok: res.ok, status: res.status, data: data as T };
}
