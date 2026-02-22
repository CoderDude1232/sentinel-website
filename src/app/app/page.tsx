"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardSummary = {
  cards: Array<{ title: string; value: string; details: string }>;
  feed: Array<{ time: string; label: string; level: string }>;
  nextActions: Array<{ label: string; href: string }>;
  erlc?: {
    keyConfigured: boolean;
    connected: boolean;
    serverName: string | null;
    playerCount: number | null;
    queueCount: number | null;
    modCallCount: number | null;
    commandLogCount: number | null;
    endpoints: Record<string, { ok: boolean; status: number; latencyMs: number }> | null;
    fetchedAt: string | null;
  };
};

const emptySummary: DashboardSummary = {
  cards: [],
  feed: [],
  nextActions: [],
};

const loadingCards: DashboardSummary["cards"] = [
  { title: "Moderation", value: "--", details: "" },
  { title: "Activity", value: "--", details: "" },
  { title: "Sessions", value: "--", details: "" },
  { title: "Infractions", value: "--", details: "" },
];

const shortcutLinks: Array<{ href: string; label: string; caption: string }> = [
  { href: "/app/moderation", label: "Moderation", caption: "Manage live incidents and cases" },
  { href: "/app/commands", label: "Commands", caption: "Run in-game actions quickly" },
  { href: "/app/activity", label: "Activity", caption: "Review staff performance" },
  { href: "/app/logs", label: "Audit logs", caption: "Trace historical actions" },
];

function levelTone(level: string): string {
  const normalized = level.trim().toLowerCase();
  if (normalized === "warning") {
    return "text-[#f2cb8f]";
  }
  if (normalized === "error" || normalized === "critical") {
    return "text-[#ffb3bf]";
  }
  return "text-[#b5c9fa]";
}

export default function AppOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as DashboardSummary & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load dashboard data");
      }
      setSummary(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    const interval = window.setInterval(() => {
      void loadSummary();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [loadSummary]);

  async function forceSync() {
    setSyncing(true);
    setSyncMessage("");
    setError("");
    try {
      const response = await fetch("/api/dashboard/refresh", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh in-game state");
      }
      await loadSummary();
      setSyncMessage(payload.message ?? "In-game refresh complete.");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh in-game state");
    } finally {
      setSyncing(false);
    }
  }

  const statusLabel = summary.erlc?.connected ? "Connected" : "Disconnected";
  const endpointHealth = useMemo(() => {
    if (!summary.erlc?.endpoints) {
      return null;
    }
    const total = Object.keys(summary.erlc.endpoints).length;
    const healthy = Object.values(summary.erlc.endpoints).filter((item) => item.ok).length;
    return `${healthy}/${total} healthy endpoints`;
  }, [summary.erlc?.endpoints]);

  const onboardingAction = !summary.erlc?.keyConfigured
    ? {
        title: "Connect your ER:LC server",
        description: "Start in Integrations by adding your server key. This unlocks live players, mod calls, and command routing.",
        href: "/app/integrations",
        cta: "Open Integrations",
      }
    : !summary.erlc.connected
      ? {
          title: "Recheck server connection",
          description: "Your key is saved but live checks are not healthy yet. Run a sync or verify your private server is online.",
          href: "/app/integrations",
          cta: "Review connection",
        }
      : {
          title: "System is live",
          description: "You can moderate, send commands, and monitor logs in real time from this dashboard.",
          href: "/app/moderation",
          cta: "Open Moderation",
        };

  return (
    <div className="space-y-4">
      <section className="dashboard-hero">
        <div className="dashboard-toolbar">
          <div>
            <span className="kicker">Overview</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Command Center</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
              A cleaner view of your server health, current activity, and the next best actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadSummary()} className="button-secondary px-4 py-2 text-sm" type="button">
              Refresh data
            </button>
            <button onClick={() => void forceSync()} className="button-primary px-4 py-2 text-sm" type="button" disabled={syncing}>
              {syncing ? "Syncing..." : "Sync In-Game"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(loading ? loadingCards : summary.cards).map((card) => (
            <article key={card.title} className="dashboard-metric-card p-3">
              <p className="text-xs tracking-[0.08em] text-[var(--ink-soft)]">{card.title}</p>
              <p className="mt-1 text-[1.9rem] font-semibold tracking-tight leading-none">{card.value}</p>
              {card.details ? <p className="mt-1 text-xs text-[var(--ink-soft)]">{card.details}</p> : null}
            </article>
          ))}
        </div>
      </section>

      {syncMessage ? (
        <p className="rounded-lg border border-[rgba(82,196,122,0.35)] bg-[rgba(82,196,122,0.12)] px-3 py-2 text-sm">
          {syncMessage}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-[rgba(216,29,56,0.35)] bg-[rgba(216,29,56,0.12)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <section className="dashboard-card dashboard-erlc-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">ER:LC snapshot</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Connection state and live server counters from your configured key.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/integrations" className="button-secondary px-3 py-2 text-sm">
              Integrations
            </Link>
            <Link href="/app/commands" className="button-secondary px-3 py-2 text-sm">
              Commands
            </Link>
          </div>
        </div>

        {!summary.erlc?.keyConfigured ? (
          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
            <p className="text-sm text-[var(--ink-soft)]">
              No server key connected yet. Add your ER:LC key in Integrations to activate live telemetry.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
              <article className="dashboard-card p-3">
                <p className="text-xs tracking-[0.08em] text-[var(--ink-soft)]">Server</p>
                <p className="mt-1 text-sm font-semibold">{summary.erlc.serverName ?? "Unknown server"}</p>
                <p className={`mt-1 text-xs ${summary.erlc.connected ? "text-[#b9ffe9]" : "text-[#ffd2da]"}`}>{statusLabel}</p>
              </article>
              <article className="dashboard-card p-3">
                <p className="text-xs tracking-[0.08em] text-[var(--ink-soft)]">Players</p>
                <p className="mt-1 text-lg font-semibold">{summary.erlc.playerCount ?? "N/A"}</p>
              </article>
              <article className="dashboard-card p-3">
                <p className="text-xs tracking-[0.08em] text-[var(--ink-soft)]">Queue</p>
                <p className="mt-1 text-lg font-semibold">{summary.erlc.queueCount ?? "N/A"}</p>
              </article>
              <article className="dashboard-card p-3">
                <p className="text-xs tracking-[0.08em] text-[var(--ink-soft)]">Mod calls</p>
                <p className="mt-1 text-lg font-semibold">{summary.erlc.modCallCount ?? "N/A"}</p>
              </article>
              <article className="dashboard-card p-3">
                <p className="text-xs tracking-[0.08em] text-[var(--ink-soft)]">Command logs</p>
                <p className="mt-1 text-lg font-semibold">{summary.erlc.commandLogCount ?? "N/A"}</p>
              </article>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
              {endpointHealth ? <span>{endpointHealth}</span> : null}
              {summary.erlc.fetchedAt ? <span>Synced {new Date(summary.erlc.fetchedAt).toLocaleTimeString()}</span> : null}
            </div>
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="dashboard-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Recent activity</h2>
            <span className="text-xs text-[var(--ink-soft)]">Latest events</span>
          </div>
          <div className="mt-3 space-y-2">
            {(summary.feed.length ? summary.feed : [{ time: "-", label: "No alerts yet", level: "Info" }]).slice(0, 5).map((item) => (
              <div key={`${item.time}-${item.label}`} className="dashboard-feed-item rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--ink-strong)]">{item.label}</p>
                  <span className={`text-[10px] uppercase tracking-[0.08em] ${levelTone(item.level)}`}>
                    {item.level}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">{item.time}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-4">
          <article className="dashboard-card p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">Start here</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{onboardingAction.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={onboardingAction.href} className="button-primary px-4 py-2 text-sm">
                {onboardingAction.cta}
              </Link>
              {summary.nextActions.slice(0, 1).map((action) => (
                <Link key={action.href} href={action.href} className="button-secondary px-4 py-2 text-sm">
                  {action.label}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--ink-soft)]">{onboardingAction.title}</p>
          </article>

          <article className="dashboard-card p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">Shortcuts</h2>
            <div className="mt-3 grid gap-2">
              {shortcutLinks.map((route) => (
                <Link key={route.href} href={route.href} className="dashboard-action-link rounded-md border border-[var(--line)] px-3 py-2">
                  <p className="text-sm font-semibold">{route.label}</p>
                  <p className="text-xs text-[var(--ink-soft)]">{route.caption}</p>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}