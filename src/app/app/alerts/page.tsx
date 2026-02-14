"use client";

import { useCallback, useEffect, useState } from "react";

type AlertsResponse = {
  feed: Array<{ id: number; level: string; event: string; source: string; createdAt: string }>;
  webhookStatus: Array<{ name: string; status: string; retries: string }>;
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
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send alert");
      }
      await load();
      if (!payload.webhookConfigured) {
        setMessage("Test alert created in-app. Configure webhook URL in settings to push to Discord.");
      } else if (payload.webhookDelivered) {
        setMessage("Test alert sent and delivered to Discord webhook.");
      } else {
        setMessage("Alert saved, but webhook delivery failed.");
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
    </div>
  );
}
