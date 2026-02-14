"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type FeatureItem = {
  id: number;
  feature: string;
  title: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type AdvancedFeaturePanelProps = {
  kicker: string;
  title: string;
  description: string;
  featureKey:
    | "rbac"
    | "teams"
    | "workflows"
    | "appeals"
    | "automation"
    | "profiles"
    | "logs"
    | "realtime"
    | "commands"
    | "backups"
    | "api_keys"
    | "observability"
    | "billing";
  payloadHint: string;
  entryPlaceholder: string;
};

export function AdvancedFeaturePanel({
  kicker,
  title,
  description,
  featureKey,
  payloadHint,
  entryPlaceholder,
}: AdvancedFeaturePanelProps) {
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("Active");
  const [newPayload, setNewPayload] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/panels/advanced?feature=${featureKey}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      items?: FeatureItem[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load panel data");
    }
    setItems(payload.items ?? []);
  }, [featureKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to load panel data");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = newPayload.trim() ? (JSON.parse(newPayload) as Record<string, unknown>) : {};
    } catch {
      setLoading(false);
      setMessage("Payload must be valid JSON.");
      return;
    }

    try {
      const response = await fetch("/api/panels/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: featureKey,
          title: newTitle,
          status: newStatus,
          payload: parsedPayload,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create record");
      }
      setNewTitle("");
      await load();
      setMessage("Entry created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create record");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(item: FeatureItem, status: string) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/advanced", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update record");
      }
      await load();
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update record");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="kicker">{kicker}</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{description}</p>
      {message ? <p className="mt-3 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">Create Record</h2>
        <form onSubmit={createItem} className="mt-3 space-y-2">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder={entryPlaceholder}
            className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <select
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value)}
              className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            >
              <option>Active</option>
              <option>In Review</option>
              <option>Planned</option>
              <option>Paused</option>
              <option>Complete</option>
            </select>
            <textarea
              value={newPayload}
              onChange={(event) => setNewPayload(event.target.value)}
              rows={4}
              className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-mono"
              placeholder={payloadHint}
            />
          </div>
          <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={loading || !newTitle.trim()}>
            {loading ? "Saving..." : "Add record"}
          </button>
        </form>
      </section>

      <section className="mt-5 space-y-2">
        {items.map((item) => (
          <article key={item.id.toString()} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{item.title}</p>
              <div className="flex items-center gap-2">
                <select
                  value={item.status}
                  onChange={(event) => void updateStatus(item, event.target.value)}
                  className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs"
                  disabled={loading}
                >
                  <option>Active</option>
                  <option>In Review</option>
                  <option>Planned</option>
                  <option>Paused</option>
                  <option>Complete</option>
                </select>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">Updated {new Date(item.updatedAt).toLocaleString()}</p>
            <pre className="mt-2 overflow-x-auto rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-2 text-xs text-[var(--ink-soft)]">
              {JSON.stringify(item.payload, null, 2)}
            </pre>
          </article>
        ))}
        {!items.length ? (
          <p className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[var(--ink-soft)]">
            No records yet for this module.
          </p>
        ) : null}
      </section>
    </div>
  );
}
