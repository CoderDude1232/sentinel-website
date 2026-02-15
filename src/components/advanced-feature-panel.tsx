"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UiSelect } from "@/components/ui-select";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type FeatureItem = {
  id: number;
  feature: string;
  title: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type AdvancedFeaturePanelProps = {
  kicker: string;
  title: string;
  description: string;
  featureKey:
    | "rbac"
    | "teams"
    | "workflows"
    | "appeals"
    | "automation"
    | "profiles"
    | "logs"
    | "realtime"
    | "commands"
    | "backups"
    | "api_keys"
    | "observability"
    | "billing";
  payloadHint: string;
  entryPlaceholder: string;
};

type ErlcSnapshot = {
  connected: boolean;
  serverName: string | null;
  playerCount: number | null;
  queueCount: number | null;
  serverRegion?: string | null;
  uptime?: string | null;
  fetchedAt: string;
};

type OnlinePlayersResponse = {
  onlinePlayers?: Array<{ id: number; username: string; displayName: string; avatarUrl: string | null }>;
  error?: string;
};

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "In Review", label: "In Review" },
  { value: "Planned", label: "Planned" },
  { value: "Paused", label: "Paused" },
  { value: "Complete", label: "Complete" },
] as const;

const SUBJECT_SOURCE_OPTIONS = [
  { value: "online", label: "Online player" },
  { value: "offline", label: "Offline player" },
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildFeatureTemplate(
  featureKey: AdvancedFeaturePanelProps["featureKey"],
  subject: string,
  snapshot: ErlcSnapshot | null,
): Record<string, unknown> {
  const baseContext: Record<string, unknown> = {
    subject: subject || undefined,
    liveContext: snapshot
      ? {
          connected: snapshot.connected,
          serverName: snapshot.serverName,
          playerCount: snapshot.playerCount,
          queueCount: snapshot.queueCount,
          serverRegion: snapshot.serverRegion ?? null,
          uptime: snapshot.uptime ?? null,
          fetchedAt: snapshot.fetchedAt,
        }
      : { connected: false, note: "ER:LC snapshot unavailable" },
  };

  switch (featureKey) {
    case "commands":
      return {
        ...baseContext,
        action: "warn",
        command: ":warn",
        reason: "Operational policy enforcement",
      };
    case "workflows":
      return {
        ...baseContext,
        trigger: "moderation_case_opened",
        steps: ["triage", "assign", "resolve"],
        slaMinutes: 20,
      };
    case "automation":
      return {
        ...baseContext,
        trigger: "session_created",
        actions: ["announce", "staff_ping"],
        channel: "staff-ops",
      };
    case "realtime":
      return {
        ...baseContext,
        stream: "operations",
        health: snapshot?.connected ? "healthy" : "degraded",
        transport: "websocket",
      };
    case "logs":
      return {
        ...baseContext,
        filter: "moderation",
        retentionDays: 90,
        includePlayerContext: true,
      };
    case "profiles":
      return {
        ...baseContext,
        score: "A-",
        trend: "stable",
        review: "Linked with current ER:LC operational state.",
      };
    default:
      return baseContext;
  }
}

export function AdvancedFeaturePanel({
  kicker,
  title,
  description,
  featureKey,
  payloadHint,
  entryPlaceholder,
}: AdvancedFeaturePanelProps) {
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("Active");
  const [newPayload, setNewPayload] = useState("{}");
  const [subjectSource, setSubjectSource] = useState<"online" | "offline">("online");
  const [selectedOnlinePlayer, setSelectedOnlinePlayer] = useState("");
  const [offlineSubject, setOfflineSubject] = useState("");
  const [includeLiveContext, setIncludeLiveContext] = useState(true);
  const [erlcSnapshot, setErlcSnapshot] = useState<ErlcSnapshot | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Array<{ id: number; username: string; displayName: string; avatarUrl: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [message, setMessage] = useState("");

  const resolvedSubject = subjectSource === "online" ? selectedOnlinePlayer.trim() : offlineSubject.trim();

  const load = useCallback(async () => {
    const response = await fetch(`/api/panels/advanced?feature=${featureKey}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      items?: FeatureItem[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load panel data");
    }
    setItems(payload.items ?? []);
  }, [featureKey]);

  const loadLiveContext = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setLoadingLive(true);
    try {
      const [serverResponse, playersResponse] = await Promise.all([
        fetch("/api/integrations/erlc/server", { cache: "no-store" }),
        fetch("/api/integrations/erlc/players", { cache: "no-store" }),
      ]);

      if (serverResponse.ok) {
        const serverPayload = (await serverResponse.json()) as ErlcSnapshot;
        setErlcSnapshot(serverPayload);
      } else if (serverResponse.status === 404) {
        setErlcSnapshot(null);
      } else {
        const errorPayload = (await serverResponse.json().catch(() => ({}))) as { error?: string };
        if (!silent) {
          setMessage(errorPayload.error ?? "Failed to load ER:LC server snapshot.");
        }
      }

      if (playersResponse.ok) {
        const playersPayload = (await playersResponse.json()) as OnlinePlayersResponse;
        const players = playersPayload.onlinePlayers ?? [];
        setOnlinePlayers(players);
        setSelectedOnlinePlayer((current) => {
          if (current && players.some((player) => player.username === current)) {
            return current;
          }
          return players[0]?.username ?? "";
        });
      } else if (playersResponse.status === 404) {
        setOnlinePlayers([]);
        setSelectedOnlinePlayer("");
      } else {
        const errorPayload = (await playersResponse.json().catch(() => ({}))) as { error?: string };
        if (!silent) {
          setMessage(errorPayload.error ?? "Failed to load ER:LC online players.");
        }
      }
    } catch (error) {
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "Failed to load ER:LC live context");
      }
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([load(), loadLiveContext()]).catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to load panel data");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, loadLiveContext]);

  useAutoRefresh(
    () => loadLiveContext({ silent: true }),
    { intervalMs: 12000, runImmediately: false, onlyWhenVisible: true },
  );

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = newPayload.trim() ? (JSON.parse(newPayload) as Record<string, unknown>) : {};
    } catch {
      setLoading(false);
      setMessage("Payload must be valid JSON.");
      return;
    }

    const payloadToSave: Record<string, unknown> = {
      ...parsedPayload,
    };

    if (resolvedSubject) {
      payloadToSave.subject = resolvedSubject;
    }

    if (includeLiveContext) {
      payloadToSave.liveContext = erlcSnapshot
        ? {
            connected: erlcSnapshot.connected,
            serverName: erlcSnapshot.serverName,
            playerCount: erlcSnapshot.playerCount,
            queueCount: erlcSnapshot.queueCount,
            serverRegion: erlcSnapshot.serverRegion ?? null,
            uptime: erlcSnapshot.uptime ?? null,
            fetchedAt: erlcSnapshot.fetchedAt,
          }
        : {
            connected: false,
            note: "ER:LC not connected or snapshot unavailable during creation",
          };
    }

    try {
      const response = await fetch("/api/panels/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: featureKey,
          title: newTitle,
          status: newStatus,
          payload: payloadToSave,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create record");
      }
      setNewTitle("");
      await load();
      setMessage("ER:LC-linked entry created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create record");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(item: FeatureItem, status: string) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/advanced", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update record");
      }
      await load();
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update record");
    } finally {
      setLoading(false);
    }
  }

  function applyTemplatePayload() {
    const template = buildFeatureTemplate(featureKey, resolvedSubject, erlcSnapshot);
    setNewPayload(JSON.stringify(template, null, 2));
    setMessage("Template payload generated from ER:LC context.");
  }

  const statusOptions = useMemo(() => STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })), []);

  return (
    <div>
      <span className="kicker">{kicker}</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{description}</p>
      {message ? <p className="mt-3 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">ER:LC Live Context</h2>
          <button
            type="button"
            onClick={() => void loadLiveContext()}
            className="button-secondary px-3 py-2 text-sm"
            disabled={loadingLive}
          >
            {loadingLive ? "Refreshing..." : "Refresh Live Data"}
          </button>
        </div>

        {erlcSnapshot ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Server</p>
              <p className="mt-1 text-sm font-semibold">{erlcSnapshot.serverName ?? "Unknown"}</p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Players</p>
              <p className="mt-1 text-sm font-semibold">{erlcSnapshot.playerCount ?? "N/A"}</p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Queue</p>
              <p className="mt-1 text-sm font-semibold">{erlcSnapshot.queueCount ?? "N/A"}</p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Status</p>
              <p className="mt-1 text-sm font-semibold">{erlcSnapshot.connected ? "Connected" : "Disconnected"}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            ER:LC is not connected for this workspace. Connect it in{" "}
            <Link href="/app/integrations" className="text-[var(--ink-strong)] hover:underline">
              Integrations
            </Link>
            .
          </p>
        )}
      </section>

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">Create ER:LC-linked record</h2>
        <form onSubmit={createItem} className="mt-3 space-y-2">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder={entryPlaceholder}
            className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
          />

          <div className="grid gap-2 sm:grid-cols-3">
            <UiSelect value={newStatus} onChange={(value) => setNewStatus(value)} options={statusOptions} />
            <UiSelect
              value={subjectSource}
              onChange={(value) => setSubjectSource(value === "offline" ? "offline" : "online")}
              options={SUBJECT_SOURCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
            {subjectSource === "online" ? (
              <UiSelect
                value={selectedOnlinePlayer}
                onChange={(value) => setSelectedOnlinePlayer(value)}
                options={
                  onlinePlayers.length
                    ? onlinePlayers.map((player) => ({
                        value: player.username,
                        label: player.username,
                        description: player.displayName,
                        avatarUrl: player.avatarUrl,
                      }))
                    : [{ value: "", label: "No online players" }]
                }
                disabled={!onlinePlayers.length}
              />
            ) : (
              <input
                value={offlineSubject}
                onChange={(event) => setOfflineSubject(event.target.value)}
                className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                placeholder="Offline Roblox username"
              />
            )}
          </div>

          <textarea
            value={newPayload}
            onChange={(event) => setNewPayload(event.target.value)}
            rows={6}
            className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm font-mono"
            placeholder={payloadHint}
          />

          <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              className="ui-checkbox"
              checked={includeLiveContext}
              onChange={(event) => setIncludeLiveContext(event.target.checked)}
            />
            Attach current ER:LC context to payload
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="button-primary px-4 py-2 text-sm"
              type="submit"
              disabled={loading || !newTitle.trim()}
            >
              {loading ? "Saving..." : "Add record"}
            </button>
            <button
              className="button-secondary px-4 py-2 text-sm"
              type="button"
              onClick={applyTemplatePayload}
            >
              Generate ER:LC Template
            </button>
          </div>
        </form>
      </section>

      <section className="mt-5 space-y-2">
        {items.map((item) => {
          const subject = asString(item.payload.subject);
          const liveContext = asRecord(item.payload.liveContext);
          const linkedServer = asString(liveContext?.serverName);
          const linkedPlayers = asNumber(liveContext?.playerCount);

          return (
            <article key={item.id.toString()} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-[var(--ink-soft)]">
                    {subject ? (
                      <span className="rounded-full border border-[var(--line)] px-2 py-0.5">Subject: {subject}</span>
                    ) : null}
                    {linkedServer ? (
                      <span className="rounded-full border border-[var(--line)] px-2 py-0.5">Server: {linkedServer}</span>
                    ) : null}
                    {linkedPlayers !== null ? (
                      <span className="rounded-full border border-[var(--line)] px-2 py-0.5">Players: {linkedPlayers}</span>
                    ) : null}
                  </div>
                </div>
                <div className="w-full sm:w-[170px]">
                  <UiSelect
                    value={item.status}
                    onChange={(value) => void updateStatus(item, value)}
                    options={statusOptions}
                    disabled={loading}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-soft)]">Updated {new Date(item.updatedAt).toLocaleString()}</p>
              <pre className="mt-2 overflow-x-auto rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-2 text-xs text-[var(--ink-soft)]">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            </article>
          );
        })}
        {!items.length ? (
          <p className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[var(--ink-soft)]">
            No records yet for this module.
          </p>
        ) : null}
      </section>
    </div>
  );
}

