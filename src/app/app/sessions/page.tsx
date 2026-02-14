"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type SessionsResponse = {
  upcoming: Array<{
    id: number;
    title: string;
    startsAt: string;
    host: string;
    staffingCurrent: number;
    staffingTarget: number;
    status: string;
  }>;
  performance: Array<{ label: string; value: string }>;
  error?: string;
};

export default function SessionsPage() {
  const [data, setData] = useState<SessionsResponse>({ upcoming: [], performance: [] });
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [host, setHost] = useState("");
  const [staffingTarget, setStaffingTarget] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/sessions", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as SessionsResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load sessions");
    }
    setData(payload);
  }, []);

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load sessions");
    });
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, startsAt, host, staffingTarget }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create session");
      }
      setTitle("");
      setStartsAt("");
      await load();
      setMessage("Session created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Sessions</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Session Control Center</h1>
        </div>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            placeholder="Session title"
          />
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
          />
          <input
            value={host}
            onChange={(event) => setHost(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            placeholder="Host (optional)"
          />
          <input
            type="number"
            value={staffingTarget}
            min={1}
            onChange={(event) => setStaffingTarget(Number(event.target.value))}
            className="w-20 rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
          />
          <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={loading || !title.trim() || !startsAt}>
            {loading ? "Saving..." : "Create session"}
          </button>
        </form>
      </div>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Upcoming schedule</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data.upcoming.map((session) => (
              <div
                key={session.id.toString()}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <p className="font-semibold">{session.title}</p>
                <p className="text-[var(--ink-soft)]">
                  Starts {new Date(session.startsAt).toLocaleString()} - Host: {session.host}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  Staffing: {session.staffingCurrent}/{session.staffingTarget} - {session.status}
                </p>
              </div>
            ))}
            {!data.upcoming.length ? <p className="text-[var(--ink-soft)]">No sessions scheduled yet.</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Performance snapshot</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.performance.map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.label}</p>
                <p className="mt-1 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
