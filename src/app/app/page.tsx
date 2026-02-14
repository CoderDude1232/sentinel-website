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

export default function AppOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Overview</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operations Snapshot</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            High-signal metrics and recent events.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void loadSummary()} className="button-secondary px-4 py-2 text-sm" type="button">
            Refresh data
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-[rgba(216,29,56,0.35)] bg-[rgba(216,29,56,0.12)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(loading ? [{ title: "Loading...", value: "--", details: "Fetching dashboard data" }] : summary.cards).map((card) => (
          <article key={card.title} className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{card.title}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{card.details}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="dashboard-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Recent activity</h2>
          <div className="mt-3 space-y-2.5">
            {(summary.feed.length ? summary.feed : [{ time: "-", label: "No alerts yet", level: "Info" }]).slice(0, 6).map((item) => (
              <div key={item.time + item.label} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--ink-strong)]">{item.label}</p>
                  <span className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">{item.level}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">{item.time}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Quick actions</h2>
          <div className="mt-3 flex flex-col gap-2">
            {(summary.nextActions.length
              ? summary.nextActions
              : [{ label: "Open moderation panel", href: "/app/moderation" }]
            ).slice(0, 5).map((action) => (
              <Link key={action.href} href={action.href} className="dashboard-quiet-action">
                {action.label}
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
