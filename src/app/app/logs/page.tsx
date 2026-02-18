"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UiSelect } from "@/components/ui-select";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type AuditEvent = {
  id: number;
  module: string;
  action: string;
  actor: string;
  subject: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AuditResponse = {
  events: AuditEvent[];
  prcLogs?: {
    connected: boolean;
    joinLogs: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
    killLogs: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
    commandLogs: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
    fetchedAt: string | null;
  };
  error?: string;
};

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "Timestamp unavailable";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export default function LogsPage() {
  const DISPLAY_LIMITS = {
    events: 40,
    prcColumn: 6,
  } as const;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [prcLogs, setPrcLogs] = useState<NonNullable<AuditResponse["prcLogs"]>>({
    connected: false,
    joinLogs: [],
    killLogs: [],
    commandLogs: [],
    fetchedAt: null,
  });
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const modules = useMemo(() => {
    const unique = Array.from(new Set(events.map((item) => item.module)));
    return unique.sort();
  }, [events]);

  const actions = useMemo(() => {
    const unique = Array.from(new Set(events.map((item) => item.action)));
    return unique.sort();
  }, [events]);

  const actors = useMemo(() => {
    const unique = Array.from(new Set(events.map((item) => item.actor)));
    return unique.sort();
  }, [events]);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setMessage("");
    }
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set("module", moduleFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (actorFilter) params.set("actor", actorFilter);
      params.set("limit", "300");

      const response = await fetch(`/api/panels/audit?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as AuditResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load audit events");
      }
      setEvents(payload.events ?? []);
      setPrcLogs(
        payload.prcLogs ?? {
          connected: false,
          joinLogs: [],
          killLogs: [],
          commandLogs: [],
          fetchedAt: null,
        },
      );
    } catch (error) {
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "Failed to load audit events");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [moduleFilter, actionFilter, actorFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(
    () => load({ silent: true }),
    { intervalMs: 15000, runImmediately: false, onlyWhenVisible: true },
  );

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (moduleFilter) params.set("module", moduleFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (actorFilter) params.set("actor", actorFilter);
    params.set("limit", "1000");
    params.set("format", "csv");
    return `/api/panels/audit?${params.toString()}`;
  }, [moduleFilter, actionFilter, actorFilter]);

  const visibleEvents = useMemo(
    () => events.slice(0, DISPLAY_LIMITS.events),
    [events, DISPLAY_LIMITS.events],
  );

  const hasActiveFilters = Boolean(moduleFilter || actionFilter || actorFilter);

  return (
    <div>
      <span className="kicker">Audit</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Audit and Activity Logs</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        Filter audit history, inspect change payloads, and monitor live PRC logs without leaving the dashboard.
      </p>
      {message ? (
        <p className="mt-3 rounded-lg border border-[rgba(216,29,56,0.35)] bg-[rgba(216,29,56,0.12)] px-3 py-2 text-sm text-[#ffd4dc]">
          {message}
        </p>
      ) : null}

      <section className="mt-5 space-y-4">
        <article className="dashboard-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Filters</h2>
            <span className="text-xs text-[var(--ink-soft)]">{events.length} matching events</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <UiSelect
              value={moduleFilter}
              onChange={(value) => setModuleFilter(value)}
              options={[{ value: "", label: "All modules" }, ...modules.map((item) => ({ value: item, label: item }))]}
            />
            <UiSelect
              value={actionFilter}
              onChange={(value) => setActionFilter(value)}
              options={[{ value: "", label: "All actions" }, ...actions.map((item) => ({ value: item, label: item }))]}
            />
            <UiSelect
              value={actorFilter}
              onChange={(value) => setActorFilter(value)}
              options={[{ value: "", label: "All actors" }, ...actors.map((item) => ({ value: item, label: item }))]}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="button-secondary px-4 py-2 text-sm" type="button" onClick={() => void load()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="button-secondary px-4 py-2 text-sm"
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => {
                setModuleFilter("");
                setActionFilter("");
                setActorFilter("");
              }}
            >
              Clear filters
            </button>
            <a href={exportHref} className="button-secondary px-4 py-2 text-sm">
              Export CSV
            </a>
          </div>
        </article>

        <article className="dashboard-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Event stream</h2>
            <span className="text-xs text-[var(--ink-soft)]">
              Showing {Math.min(visibleEvents.length, events.length)} of {events.length}
            </span>
          </div>
          <div className="mt-3 max-h-[720px] space-y-2 overflow-y-auto pr-1 text-sm">
            {visibleEvents.map((event) => {
              const hasPayload = Boolean(event.beforeState || event.afterState || event.metadata);
              return (
                <article key={event.id.toString()} className="dashboard-feed-item rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.025)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{event.module} · {event.action}</p>
                    <span className="text-xs text-[var(--ink-soft)]">{formatTimestamp(event.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--ink-soft)]">
                      Actor: {event.actor}
                    </span>
                    {event.subject ? (
                      <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--ink-soft)]">
                        Subject: {event.subject}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--ink-soft)]">
                      Event #{event.id}
                    </span>
                  </div>
                  {hasPayload ? (
                    <details className="mt-2 rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
                      <summary className="cursor-pointer px-2 py-1.5 text-xs text-[var(--ink-soft)]">View payload</summary>
                      <pre className="max-h-[220px] overflow-auto border-t border-[var(--line)] px-2 py-2 text-xs text-[var(--ink-soft)]">
                        {JSON.stringify({ before: event.beforeState, after: event.afterState, metadata: event.metadata }, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </article>
              );
            })}
            {!events.length ? <p className="text-[var(--ink-soft)]">No audit events match current filters.</p> : null}
          </div>
        </article>

        <article className="dashboard-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">PRC log retrieval</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                {prcLogs.connected ? "Connected" : "Not connected"}
              </span>
              {prcLogs.fetchedAt ? (
                <span className="text-xs text-[var(--ink-soft)]">Synced {formatTimestamp(prcLogs.fetchedAt)}</span>
              ) : null}
            </div>
          </div>

          {!prcLogs.connected ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Connect ER:LC to retrieve live PRC logs here.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                { title: "Join logs", items: prcLogs.joinLogs },
                { title: "Kill logs", items: prcLogs.killLogs },
                { title: "Command logs", items: prcLogs.commandLogs },
              ].map((column) => (
                <div key={column.title} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{column.title}</p>
                  {column.items.length > DISPLAY_LIMITS.prcColumn ? (
                    <p className="mt-1 text-[10px] text-[var(--ink-soft)]">
                      Showing {DISPLAY_LIMITS.prcColumn} of {column.items.length}
                    </p>
                  ) : null}
                  <div className="mt-2 max-h-[300px] space-y-2 overflow-y-auto pr-1 text-xs">
                    {column.items.slice(0, DISPLAY_LIMITS.prcColumn).map((item, index) => (
                      <div key={`${column.title}-${item.primary}-${index}`} className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-2">
                        <p className="font-semibold text-sm">{item.primary}</p>
                        {item.secondary ? <p className="text-[var(--ink-soft)]">{item.secondary}</p> : null}
                        {item.detail ? <p className="text-[var(--ink-soft)]">{item.detail}</p> : null}
                        <p className="mt-1 text-[10px] text-[var(--ink-soft)]">{formatTimestamp(item.occurredAt)}</p>
                      </div>
                    ))}
                    {!column.items.length ? <p className="text-[var(--ink-soft)]">No entries.</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}