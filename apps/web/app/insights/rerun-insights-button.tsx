"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function RerunInsightsButton() {
  const router = useRouter();
  const { data } = useSession();
  const isAuthed = !!data;
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function rerunInsights() {
    setStatus("running");
    setMessage(null);
    try {
      const res = await fetch("/api/insights/rerun", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        docId?: string;
        pipelineRunId?: string;
      };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? `Re-run failed (${res.status})`);
      }
      setStatus("done");
      const label = body.docId ? `Doc ${body.docId}` : body.pipelineRunId ? `Run ${body.pipelineRunId}` : "review";
      setMessage(`Updated ${label}`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Re-run failed");
    } finally {
      setTimeout(() => setStatus("idle"), 3500);
    }
  }

  return (
    <div className="sync">
      <button className="button" type="button" onClick={rerunInsights} disabled={!isAuthed || status === "running"}>
        {status === "running" ? "Re-running…" : isAuthed ? "Re-run review" : "Sign in to run"}
      </button>
      {message ? <span className={`sync-message ${status}`}>{message}</span> : null}
    </div>
  );
}
