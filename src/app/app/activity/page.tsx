"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type ActivityResponse = {
  kpis: {
    staffActions24h: number;
    averageResponseSeconds: number | null;
    attendanceCompliancePct: number | null;
    activeStaffNow: number;
  };
  leaderboard: Array<{ name: string; sessions: number; actions: number; score: string }>;
  prc?: {
    connected: boolean;
    counts: { joins: number; kills: number; commands: number; vehicles: number };
    recent: {
      joins: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
      kills: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
      commands: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
    };
    vehicles: Array<{ owner: string; model: string | null }>;
    fetchedAt: string | null;
  };
  error?: string;
};

type PrcLogItem = {
  primary: string;
  secondary: string | null;
  detail: string | null;
  occurredAt: string | null;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "N/A";
  }
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "Timestamp unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function ActivityPage() {
  const LEADERBOARD_DISPLAY_LIMIT = 12;
  const PRC_FEED_DISPLAY_LIMIT = 6;

  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const response = await fetch("/api/panels/activity", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as ActivityResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load activity data");
      }
      setData(payload);
    } catch (fetchError) {
      if (!silent) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load activity data");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(
    () => load({ silent: true }),
    { intervalMs: 20000, runImmediately: false, onlyWhenVisible: true },
  );

  const kpis = data
    ? [
        { label: "Staff actions (24h)", value: String(data.kpis.staffActions24h) },
        { label: "Average response time", value: formatDuration(data.kpis.averageResponseSeconds) },
        {
          label: "Attendance compliance",
          value: data.kpis.attendanceCompliancePct !== null ? `${Math.round(data.kpis.attendanceCompliancePct)}%` : "N/A",
        },
        { label: "Active staff now", value: String(data.kpis.activeStaffNow) },
      ]
    : [
        { label: "Staff actions (24h)", value: "--" },
        { label: "Average response time", value: "--" },
        { label: "Attendance compliance", value: "--" },
        { label: "Active staff now", value: "--" },
      ];

  const prcFeeds: Array<{ title: string; items: PrcLogItem[]; emptyLabel: string }> = [
    {
      title: "Recent command logs",
      items: data?.prc?.recent.commands ?? [],
      emptyLabel: "No PRC command logs available.",
    },
    {
      title: "Recent join logs",
      items: data?.prc?.recent.joins ?? [],
      emptyLabel: "No PRC join logs available.",
    },
    {
      title: "Recent kill logs",
      items: data?.prc?.recent.kills ?? [],
      emptyLabel: "No PRC kill logs available.",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="kicker">Activity</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Staff Activity Intelligence</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Live staff metrics, leaderboard performance, and PRC telemetry in one view.
          </p>
          {data?.prc?.fetchedAt ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">PRC sync: {formatTimestamp(data.prc.fetchedAt)}</p>
          ) : null}
        </div>
        <button className="button-secondary px-4 py-2 text-sm" type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh now"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-[rgba(216,29,56,0.35)] bg-[rgba(216,29,56,0.12)] px-3 py-2 text-sm text-[#ffd4dc]">
          {error}
        </p>
      ) : null}

      <section className="mt-5 dashboard-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold tracking-tight">KPI Summary</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.09em] text-[var(--ink-soft)]">
              <tr className="border-b border-[var(--line)]">
                <th className="px-3 py-2.5">Metric</th>
                <th className="px-3 py-2.5">Value</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((item) => (
                <tr key={item.label} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-3 py-2.5 font-semibold">{item.label}</td>
                  <td className="px-3 py-2.5">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="dashboard-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold tracking-tight">Performance leaderboard</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Top staff by sessions, actions, and overall score.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                <tr>
                  <th className="py-2 pr-4">Staff</th>
                  <th className="py-2 pr-4">Sessions</th>
                  <th className="py-2 pr-4">Actions</th>
                  <th className="py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {(data?.leaderboard ?? []).slice(0, LEADERBOARD_DISPLAY_LIMIT).map((member) => (
                  <tr key={member.name} className="border-t border-[var(--line)]">
                    <td className="py-2 pr-4">{member.name}</td>
                    <td className="py-2 pr-4">{member.sessions}</td>
                    <td className="py-2 pr-4">{member.actions}</td>
                    <td className="py-2">{member.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.leaderboard?.length ?? 0) > LEADERBOARD_DISPLAY_LIMIT ? (
              <p className="pt-2 text-xs text-[var(--ink-soft)]">
                Showing {LEADERBOARD_DISPLAY_LIMIT} of {data?.leaderboard.length ?? 0} leaderboard entries.
              </p>
            ) : null}
            {!data?.leaderboard?.length ? (
              <p className="py-4 text-sm text-[var(--ink-soft)]">No activity entries yet.</p>
            ) : null}
          </div>
        </article>

        <article className="dashboard-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Live PRC telemetry</h2>
            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              {data?.prc?.connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {!data?.prc?.connected ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Connect ER:LC to view join, kill, command, and vehicle logs.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                  <tr className="border-b border-[var(--line)]">
                    <th className="px-3 py-2.5">Join logs</th>
                    <th className="px-3 py-2.5">Kill logs</th>
                    <th className="px-3 py-2.5">Command logs</th>
                    <th className="px-3 py-2.5">Active vehicles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2.5 font-semibold">{data.prc.counts.joins}</td>
                    <td className="px-3 py-2.5 font-semibold">{data.prc.counts.kills}</td>
                    <td className="px-3 py-2.5 font-semibold">{data.prc.counts.commands}</td>
                    <td className="px-3 py-2.5 font-semibold">{data.prc.counts.vehicles}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-3">
        {prcFeeds.map((feed) => (
          <article key={feed.title} className="dashboard-card p-4">
            <h2 className="text-base font-semibold tracking-tight">{feed.title}</h2>
            {feed.items.length > PRC_FEED_DISPLAY_LIMIT ? (
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Showing {PRC_FEED_DISPLAY_LIMIT} of {feed.items.length}
              </p>
            ) : null}
            <div className="mt-3 max-h-[340px] overflow-y-auto pr-1">
              <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                    <tr className="border-b border-[var(--line)]">
                      <th className="px-3 py-2.5">Primary</th>
                      <th className="px-3 py-2.5">Secondary</th>
                      <th className="px-3 py-2.5">Detail</th>
                      <th className="px-3 py-2.5">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feed.items.slice(0, PRC_FEED_DISPLAY_LIMIT).map((item, index) => (
                      <tr key={`${feed.title}-${item.primary}-${index}`} className="border-b border-[var(--line)] last:border-b-0">
                        <td className="px-3 py-2.5 font-semibold">{item.primary}</td>
                        <td className="px-3 py-2.5">{item.secondary ?? "-"}</td>
                        <td className="px-3 py-2.5">{item.detail ?? "-"}</td>
                        <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)]">{formatTimestamp(item.occurredAt)}</td>
                      </tr>
                    ))}
                    {!feed.items.length ? (
                      <tr>
                        <td className="px-3 py-3 text-[var(--ink-soft)]" colSpan={4}>
                          {feed.emptyLabel}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
