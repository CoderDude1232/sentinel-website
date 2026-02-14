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

  return (
    <div>
      <span className="kicker">Alerts</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Alert Center</h1>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Live alert feed</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data.feed.map((item) => (
              <div key={item.id.toString()} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.event}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {item.level}
                  </span>
                </div>
                <p className="text-[var(--ink-soft)]">{item.source}</p>
                <p className="text-xs text-[var(--ink-soft)]">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {!data.feed.length ? <p className="text-[var(--ink-soft)]">No alerts yet.</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Webhook health</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data.webhookStatus.map((item) => (
              <div key={item.name} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-[var(--ink-soft)]">Status: {item.status}</p>
                <p className="text-xs text-[var(--ink-soft)]">Recent retries: {item.retries}</p>
              </div>
            ))}
          </div>
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

      <section className="mt-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">Live PRC risk signals</h2>
        {!data.prcSignals?.connected ? (
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Connect ER:LC to stream mod-call and ban pressure into alerts.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                Open mod calls ({data.prcSignals.activeModCalls})
              </p>
              {data.prcSignals.modCalls.map((entry, index) => (
                <div key={`${entry.primary}-${index}`} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                  <p className="font-semibold">{entry.primary}</p>
                  {entry.detail ? <p className="text-[var(--ink-soft)]">{entry.detail}</p> : null}
                </div>
              ))}
              {!data.prcSignals.modCalls.length ? <p className="text-sm text-[var(--ink-soft)]">No open mod calls.</p> : null}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                Active bans ({data.prcSignals.activeBans})
              </p>
              {data.prcSignals.bans.map((entry, index) => (
                <div key={`${entry.primary}-${index}`} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                  <p className="font-semibold">{entry.primary}</p>
                  {entry.detail ? <p className="text-[var(--ink-soft)]">{entry.detail}</p> : null}
                </div>
              ))}
              {!data.prcSignals.bans.length ? <p className="text-sm text-[var(--ink-soft)]">No active bans.</p> : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
