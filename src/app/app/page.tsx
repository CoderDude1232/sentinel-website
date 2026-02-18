"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DashboardSummary = {
  cards: Array<{ title: string; value: string; details: string }>;
  feed: Array<{ time: string; label: string; level: string }>;
  nextActions: Array<{ label: string; href: string }>;
};

const emptySummary: DashboardSummary = {
  cards: [],
  feed: [],
  nextActions: [],
};

const loadingCards: DashboardSummary["cards"] = [
  { title: "Moderation", value: "--", details: "Loading live summary" },
  { title: "Activity", value: "--", details: "Loading live summary" },
  { title: "Sessions", value: "--", details: "Loading live summary" },
  { title: "Infractions", value: "--", details: "Loading live summary" },
];

const coreRoutes: Array<{ href: string; label: string; hint: string }> = [
  { href: "/app/moderation", label: "Moderation", hint: "Cases and live actions" },
  { href: "/app/commands", label: "Commands", hint: "Run and review commands" },
  { href: "/app/activity", label: "Activity", hint: "Staff performance signals" },
  { href: "/app/logs", label: "Audit logs", hint: "Trace history and exports" },
];

function levelClass(level: string): string {
  const normalized = level.trim().toLowerCase();
  if (normalized === "warning") {
    return "dashboard-level dashboard-level-warning";
  }
  if (normalized === "error" || normalized === "critical") {
    return "dashboard-level dashboard-level-critical";
  }
  return "dashboard-level dashboard-level-info";
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

  return (
    <div className="space-y-4">
      <section className="dashboard-hero">
        <div className="dashboard-toolbar">
          <div>
            <span className="kicker">Overview</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Command Center</h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Real-time operational status, recent events, and direct action routes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadSummary()} className="button-secondary px-4 py-2 text-sm" type="button">
              Refresh data
            </button>
            <button onClick={() => void forceSync()} className="button-primary px-4 py-2 text-sm" type="button" disabled={syncing}>
              {syncing ? "Syncing..." : "Force Sync In-Game"}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="dashboard-status-pill">Auto refresh: 20s</span>
          <span className="dashboard-status-pill">Modules: live</span>
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(loading ? loadingCards : summary.cards).map((card) => (
          <article key={card.title} className="dashboard-metric-card p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{card.title}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{card.details}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="dashboard-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Recent activity</h2>
          <div className="mt-3 space-y-2.5">
            {(summary.feed.length ? summary.feed : [{ time: "-", label: "No alerts yet", level: "Info" }]).slice(0, 6).map((item) => (
              <div key={item.time + item.label} className="dashboard-feed-item rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--ink-strong)]">{item.label}</p>
                  <span className={levelClass(item.level)}>{item.level}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">{item.time}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-4">
          <article className="dashboard-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Next actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              {(summary.nextActions.length
                ? summary.nextActions
                : [{ label: "Open moderation panel", href: "/app/moderation" }]
              ).slice(0, 4).map((action) => (
                <Link key={action.href} href={action.href} className="dashboard-quiet-action">
                  {action.label}
                </Link>
              ))}
            </div>
          </article>
          <article className="dashboard-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Core routes</h2>
            <div className="mt-3 grid gap-2">
              {coreRoutes.map((route) => (
                <Link key={route.href} href={route.href} className="dashboard-action-link rounded-lg border border-[var(--line)] px-3 py-2">
                  <p className="text-sm font-semibold">{route.label}</p>
                  <p className="text-xs text-[var(--ink-soft)]">{route.hint}</p>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
