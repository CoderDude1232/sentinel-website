"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";

type SessionAutomation = {
  announcementTemplate: string;
  announceChannel: string | null;
  pollEnabled: boolean;
  autoEndWhenEmpty: boolean;
};

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
  automation: SessionAutomation;
  live: {
    connected: boolean;
    serverName: string | null;
    playerCount: number | null;
    queueCount: number | null;
    fetchedAt: string | null;
  };
  error?: string;
};

const defaultAutomation: SessionAutomation = {
  announcementTemplate:
    "Session {title} starts at {startsAt}. Current players: {playerCount}. Queue: {queueCount}.",
  announceChannel: null,
  pollEnabled: false,
  autoEndWhenEmpty: false,
};

export default function SessionsPage() {
  const [data, setData] = useState<SessionsResponse>({
    upcoming: [],
    performance: [],
    automation: defaultAutomation,
    live: {
      connected: false,
      serverName: null,
      playerCount: null,
      queueCount: null,
      fetchedAt: null,
    },
  });
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [host, setHost] = useState("");
  const [staffingTarget, setStaffingTarget] = useState(10);
  const [loading, setLoading] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
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
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        announcement?: {
          attempted?: boolean;
          delivered?: boolean;
          status?: number | null;
          error?: string | null;
        };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create session");
      }
      setTitle("");
      setStartsAt("");
      await load();
      if (payload.announcement?.delivered) {
        setMessage("Session created and announcement sent to ER:LC.");
      } else if (payload.announcement?.attempted) {
        const details = payload.announcement.error ?? (payload.announcement.status ? `HTTP ${payload.announcement.status}` : "unknown error");
        setMessage(`Session created, but ER:LC announcement failed: ${details}`);
      } else {
        setMessage("Session created. ER:LC announcement skipped because ER:LC is not connected.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  async function saveAutomation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAutomation(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.automation),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        automation?: SessionAutomation;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save session automation");
      }
      if (payload.automation) {
        setData((prev) => ({ ...prev, automation: payload.automation as SessionAutomation }));
      }
      setMessage("Session automation saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save session automation");
    } finally {
      setSavingAutomation(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Sessions</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Session Control Center</h1>
        </div>
      </div>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 space-y-3">
        <CollapsibleSection
          title="Live ER:LC state"
          subtitle="Session planning references current server activity and queue."
          meta={data.live.connected ? "Connected" : "Disconnected"}
        >
          {data.live.connected ? (
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Server</p>
                <p className="mt-1 text-sm font-semibold">{data.live.serverName ?? "Unknown"}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Players</p>
                <p className="mt-1 text-sm font-semibold">{data.live.playerCount ?? "N/A"}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Queue</p>
                <p className="mt-1 text-sm font-semibold">{data.live.queueCount ?? "N/A"}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Fetched</p>
                <p className="mt-1 text-sm font-semibold">
                  {data.live.fetchedAt ? new Date(data.live.fetchedAt).toLocaleTimeString() : "Now"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Connect ER:LC in Integrations for live session context.</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Automation and announcements"
          subtitle="Template placeholders: {title}, {startsAt}, {playerCount}, {queueCount}, {serverName}."
        >
          <form onSubmit={saveAutomation} className="space-y-3">
            <label className="block text-sm text-[var(--ink-soft)]">
              Announcement template
              <textarea
                rows={4}
                value={data.automation.announcementTemplate}
                onChange={(event) =>
                  setData((prev) => ({
                    ...prev,
                    automation: { ...prev.automation, announcementTemplate: event.target.value },
                  }))
                }
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-[var(--ink-soft)]">
                Announce channel label (optional)
                <input
                  value={data.automation.announceChannel ?? ""}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      automation: {
                        ...prev.automation,
                        announceChannel: event.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                  placeholder="#session-announcements"
                />
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                  <input
                    type="checkbox"
                    className="ui-checkbox"
                    checked={data.automation.pollEnabled}
                    onChange={(event) =>
                      setData((prev) => ({
                        ...prev,
                        automation: { ...prev.automation, pollEnabled: event.target.checked },
                      }))
                    }
                  />
                  Enable Discord poll intent flag
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                  <input
                    type="checkbox"
                    className="ui-checkbox"
                    checked={data.automation.autoEndWhenEmpty}
                    onChange={(event) =>
                      setData((prev) => ({
                        ...prev,
                        automation: { ...prev.automation, autoEndWhenEmpty: event.target.checked },
                      }))
                    }
                  />
                  Auto-end session when server empties
                </label>
              </div>
            </div>
            <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={savingAutomation}>
              {savingAutomation ? "Saving..." : "Save automation"}
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection title="Create session" subtitle="Creates schedule entry, logs an alert, and sends an ER:LC announcement command.">
          <form onSubmit={handleCreate} className="grid gap-2 sm:grid-cols-5">
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
              className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            />
            <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={loading || !title.trim() || !startsAt}>
              {loading ? "Saving..." : "Create"}
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection title="Upcoming schedule" subtitle="Planned sessions and staffing targets." meta={String(data.upcoming.length)}>
          <div className="space-y-2 text-sm">
            {data.upcoming.map((session) => (
              <div
                key={session.id.toString()}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <p className="font-semibold">{session.title}</p>
                <p className="text-[var(--ink-soft)]">
                  Starts {new Date(session.startsAt).toLocaleString()} • Host: {session.host}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  Staffing: {session.staffingCurrent}/{session.staffingTarget} • {session.status}
                </p>
              </div>
            ))}
            {!data.upcoming.length ? <p className="text-[var(--ink-soft)]">No sessions scheduled yet.</p> : null}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Performance snapshot" subtitle="Attendance and moderation load trends.">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.performance.map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.label}</p>
                <p className="mt-1 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}

