import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured_internal_api_key" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    const res = await fetch(`${apiBaseUrl}/api/insights/rerun`, {
      method: "POST",
      headers: {
        "x-user-id": session.user.id,
        "x-internal-api-key": internalKey
      }
    });

    const body = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(body), { status: res.status, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "failed to rerun" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
