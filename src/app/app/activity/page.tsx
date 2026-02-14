"use client";

import { useCallback, useEffect, useState } from "react";

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

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "N/A";
  }
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/activity", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as ActivityResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load activity data");
    }
    setData(payload);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load activity data");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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

  return (
    <div>
      <span className="kicker">Activity</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Staff Activity Intelligence</h1>

      {error ? (
        <p className="mt-4 rounded-lg border border-[rgba(216,29,56,0.35)] bg-[rgba(216,29,56,0.12)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <article key={item.label} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">Performance leaderboard</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              <tr>
                <th className="py-2 pr-4">Staff</th>
                <th className="py-2 pr-4">Sessions hosted</th>
                <th className="py-2 pr-4">Actions</th>
                <th className="py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {(data?.leaderboard ?? []).map((member) => (
                <tr key={member.name} className="border-t border-[var(--line)]">
                  <td className="py-2 pr-4">{member.name}</td>
                  <td className="py-2 pr-4">{member.sessions}</td>
                  <td className="py-2 pr-4">{member.actions}</td>
                  <td className="py-2">{member.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.leaderboard?.length ? (
            <p className="py-4 text-sm text-[var(--ink-soft)]">No activity entries yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Live PRC telemetry</h2>
          {!data?.prc?.connected ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Connect ER:LC to view join/kill/command/vehicle logs.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">Join logs</p>
                <p className="mt-1 text-xl font-semibold">{data.prc.counts.joins}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">Kill logs</p>
                <p className="mt-1 text-xl font-semibold">{data.prc.counts.kills}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">Command logs</p>
                <p className="mt-1 text-xl font-semibold">{data.prc.counts.commands}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">Active vehicles</p>
                <p className="mt-1 text-xl font-semibold">{data.prc.counts.vehicles}</p>
              </div>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent command logs</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(data?.prc?.recent.commands ?? []).map((item, index) => (
              <div key={`${item.primary}-${index}`} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{item.primary}</p>
                {item.detail ? <p className="text-[var(--ink-soft)]">{item.detail}</p> : null}
                {item.occurredAt ? <p className="text-xs text-[var(--ink-soft)]">{item.occurredAt}</p> : null}
              </div>
            ))}
            {!(data?.prc?.recent.commands.length) ? (
              <p className="text-[var(--ink-soft)]">No PRC command logs available.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
