import { getServerSession } from "next-auth";
import { authOptions } from "../../auth";
import { requireSessionUserId } from "../../lib/auth-guard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = requireSessionUserId(session);
  if ("response" in auth) return auth.response;

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
  const internalKey = process.env.INTERNAL_API_KEY;
  const pipelineToken = process.env.PIPELINE_TOKEN;
  if (!internalKey) {
    return NextResponse.json({ error: "server_misconfigured_internal_api_key" }, { status: 500 });
  }

  const headers: Record<string, string> = {
    "x-user-id": auth.userId,
    "x-internal-api-key": internalKey
  };
  if (pipelineToken) headers["x-pipeline-token"] = pipelineToken;

  try {
    const res = await fetch(`${apiBaseUrl}/api/pipeline/run`, {
      method: "POST",
      headers
    });

    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed to run sync" }, { status: 500 });
  }
}
