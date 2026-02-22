"use client";

import { useCallback, useEffect, useState } from "react";

type AlertsResponse = {
  feed: Array<{ id: number; level: string; event: string; source: string; createdAt: string }>;
  webhookStatus: Array<{ name: string; status: string; retries: string }>;
  prcSignals?: {
    connected: boolean;
    activeModCalls: number;
    activeBans: number;
    modCalls: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
    bans: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
    fetchedAt: string | null;
  };
  error?: string;
};

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse>({ feed: [], webhookStatus: [] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/alerts", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as AlertsResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load alerts");
    }
    setData(payload);
  }, []);

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load alerts");
    });
  }, [load]);

  async function sendTestAlert() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "Info",
          source: "Alerts",
          event: "Manual test alert sent from dashboard",
          sendWebhook: true,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        webhookConfigured?: boolean;
        webhookDelivered?: boolean;
        botConfigured?: boolean;
        botDelivered?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send alert");
      }
      await load();
      const transports: string[] = [];
      if (payload.webhookConfigured) {
        transports.push(payload.webhookDelivered ? "Webhook delivered" : "Webhook failed");
      }
      if (payload.botConfigured) {
        transports.push(payload.botDelivered ? "Bot delivered" : "Bot failed");
      }

      if (!transports.length) {
        setMessage("Test alert created in-app. Configure webhook or bot delivery in integrations.");
      } else if (transports.every((state) => state.includes("delivered"))) {
        setMessage(`Test alert sent. ${transports.join(" | ")}.`);
      } else {
        setMessage(`Alert saved. ${transports.join(" | ")}.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send alert");
    } finally {
      setLoading(false);
    }
  }

  const visibleFeed = data.feed.slice(0, 18);
  const visibleWebhookStatus = data.webhookStatus.slice(0, 6);
  const visibleModCalls = data.prcSignals?.modCalls.slice(0, 8) ?? [];
  const visibleBans = data.prcSignals?.bans.slice(0, 8) ?? [];

  return (
    <div>
      <span className="kicker">Alerts</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Alert Center</h1>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Live alert feed</h2>
          {data.feed.length > visibleFeed.length ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Showing {visibleFeed.length} of {data.feed.length} alerts.
            </p>
          ) : null}
          <div className="mt-3 max-h-[640px] overflow-y-auto pr-1">
            <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.09em] text-[var(--ink-soft)]">
                  <tr className="border-b border-[var(--line)]">
                    <th className="px-3 py-2.5">Event</th>
                    <th className="px-3 py-2.5">Level</th>
                    <th className="px-3 py-2.5">Source</th>
                    <th className="px-3 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFeed.map((item) => (
                    <tr key={item.id.toString()} className="border-b border-[var(--line)] last:border-b-0">
                      <td className="px-3 py-2.5 font-semibold">{item.event}</td>
                      <td className="px-3 py-2.5 uppercase tracking-[0.08em]">{item.level}</td>
                      <td className="px-3 py-2.5">{item.source}</td>
                      <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {!data.feed.length ? (
                    <tr>
                      <td className="px-3 py-3 text-[var(--ink-soft)]" colSpan={4}>
                        No alerts yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Webhook health</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.09em] text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--line)]">
                  <th className="px-3 py-2.5">Webhook</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Retries</th>
                </tr>
              </thead>
              <tbody>
                {visibleWebhookStatus.map((item) => (
                  <tr key={item.name} className="border-b border-[var(--line)] last:border-b-0">
                    <td className="px-3 py-2.5 font-semibold">{item.name}</td>
                    <td className="px-3 py-2.5">{item.status}</td>
                    <td className="px-3 py-2.5">{item.retries}</td>
                  </tr>
                ))}
                {!visibleWebhookStatus.length ? (
                  <tr>
                    <td className="px-3 py-3 text-[var(--ink-soft)]" colSpan={3}>
                      No webhook statuses available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {data.webhookStatus.length > visibleWebhookStatus.length ? (
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Showing {visibleWebhookStatus.length} of {data.webhookStatus.length} webhook entries.
            </p>
          ) : null}
          <button
            onClick={() => void sendTestAlert()}
            className="button-secondary mt-4 px-3 py-2 text-sm"
            type="button"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send test alert"}
          </button>
        </article>
      </section>

      <section className="mt-4 dashboard-card p-4">
        <h2 className="text-lg font-semibold tracking-tight">Live PRC risk signals</h2>
        {!data.prcSignals?.connected ? (
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Connect ER:LC to stream mod-call and ban pressure into alerts.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {data.prcSignals.fetchedAt ? (
              <p className="md:col-span-2 text-xs text-[var(--ink-soft)]">
                Synced: {formatTimestamp(data.prcSignals.fetchedAt) ?? data.prcSignals.fetchedAt}
              </p>
            ) : null}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                Open mod calls ({data.prcSignals.activeModCalls})
              </p>
              <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                    <tr className="border-b border-[var(--line)]">
                      <th className="px-3 py-2.5">Primary</th>
                      <th className="px-3 py-2.5">Target</th>
                      <th className="px-3 py-2.5">Detail</th>
                      <th className="px-3 py-2.5">Reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleModCalls.map((entry, index) => (
                      <tr key={`${entry.primary}-${index}`} className="border-b border-[var(--line)] last:border-b-0">
                        <td className="px-3 py-2.5 font-semibold">{entry.primary}</td>
                        <td className="px-3 py-2.5">{entry.secondary ?? "-"}</td>
                        <td className="px-3 py-2.5">{entry.detail ?? "-"}</td>
                        <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)]">
                          {entry.occurredAt ? formatTimestamp(entry.occurredAt) ?? entry.occurredAt : "-"}
                        </td>
                      </tr>
                    ))}
                    {!visibleModCalls.length ? (
                      <tr>
                        <td className="px-3 py-3 text-[var(--ink-soft)]" colSpan={4}>
                          No open mod calls.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {data.prcSignals.modCalls.length > visibleModCalls.length ? (
                <p className="text-xs text-[var(--ink-soft)]">
                  Showing {visibleModCalls.length} of {data.prcSignals.modCalls.length} mod calls.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                Active bans ({data.prcSignals.activeBans})
              </p>
              <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                    <tr className="border-b border-[var(--line)]">
                      <th className="px-3 py-2.5">Primary</th>
                      <th className="px-3 py-2.5">Target</th>
                      <th className="px-3 py-2.5">Detail</th>
                      <th className="px-3 py-2.5">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBans.map((entry, index) => (
                      <tr key={`${entry.primary}-${index}`} className="border-b border-[var(--line)] last:border-b-0">
                        <td className="px-3 py-2.5 font-semibold">{entry.primary}</td>
                        <td className="px-3 py-2.5">{entry.secondary ?? "-"}</td>
                        <td className="px-3 py-2.5">{entry.detail ?? "-"}</td>
                        <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)]">
                          {entry.occurredAt ? formatTimestamp(entry.occurredAt) ?? entry.occurredAt : "-"}
                        </td>
                      </tr>
                    ))}
                    {!visibleBans.length ? (
                      <tr>
                        <td className="px-3 py-3 text-[var(--ink-soft)]" colSpan={4}>
                          No active bans.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {data.prcSignals.bans.length > visibleBans.length ? (
                <p className="text-xs text-[var(--ink-soft)]">
                  Showing {visibleBans.length} of {data.prcSignals.bans.length} bans.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
