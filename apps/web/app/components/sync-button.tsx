"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function runSync() {
    setStatus("running");
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error ?? `Sync failed (${res.status})`);
      }
      setStatus("done");
      setMessage(`Run ${body.runId ?? "completed"}`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setTimeout(() => setStatus("idle"), 3500);
    }
  }

  return (
    <div className="sync">
      <button className="button" onClick={runSync} disabled={status === "running"}>
        {status === "running" ? "Syncing…" : "Run sync"}
      </button>
      {message ? <span className={`sync-message ${status}`}>{message}</span> : null}
    </div>
  );
}
