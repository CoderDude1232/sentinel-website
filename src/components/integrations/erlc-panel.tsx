"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createTrustedHeaders } from "@/lib/client-security";

type IntegrationState = {
  connected: boolean;
  maskedKey: string | null;
  updatedAt: string | null;
};

type ServerSnapshot = {
  connected: boolean;
  serverName: string | null;
  playerCount: number | null;
  maxPlayers: number | null;
  queueCount: number | null;
  serverOwner: string | null;
  joinCode: string | null;
  serverRegion: string | null;
  uptime: string | null;
  playersSample: string[];
  queueSample: string[];
  permissionBreakdown: Array<{ role: string; count: number }>;
  endpoints: {
    server: { ok: boolean; status: number; latencyMs?: number };
    players: { ok: boolean; status: number; latencyMs?: number };
    queue: { ok: boolean; status: number; latencyMs?: number };
  } | null;
  fetchedAt: string;
};

type StatusState = {
  kind: "idle" | "success" | "error";
  message: string;
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function endpointStateLabel(ok: boolean, status: number): string {
  if (ok) {
    return "Healthy";
  }
  if (status === 429) {
    return "Rate limited";
  }
  if (status === 401 || status === 403) {
    return "Unauthorized";
  }
  return "Error";
}

export function ErlcPanel() {
  const [integration, setIntegration] = useState<IntegrationState>({
    connected: false,
    maskedKey: null,
    updatedAt: null,
  });
  const [snapshot, setSnapshot] = useState<ServerSnapshot | null>(null);
  const [serverKeyInput, setServerKeyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState>({ kind: "idle", message: "" });

  const loadIntegrationState = useCallback(async () => {
    const response = await fetch("/api/integrations/erlc", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to load ER:LC integration.");
    }
    const payload = (await response.json()) as IntegrationState;
    setIntegration(payload);
    return payload;
  }, []);

  const loadSnapshot = useCallback(async () => {
    const response = await fetch("/api/integrations/erlc/server", { cache: "no-store" });
    if (response.status === 404) {
      setSnapshot(null);
      return null;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to load ER:LC server snapshot.");
    }
    const payload = (await response.json()) as ServerSnapshot;
    setSnapshot(payload);
    return payload;
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const state = await loadIntegrationState();
        if (state.connected) {
          await loadSnapshot();
        } else if (active) {
          setSnapshot(null);
        }
      } catch (error) {
        if (active) {
          setStatus({
            kind: "error",
            message: error instanceof Error ? error.message : "Failed to load integration",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadIntegrationState, loadSnapshot]);

  const handleSave = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitting(true);
      setStatus({ kind: "idle", message: "" });

      try {
        const response = await fetch("/api/integrations/erlc", {
          method: "POST",
          headers: createTrustedHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ serverKey: serverKeyInput }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          maskedKey?: string | null;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to save ER:LC key.");
        }

        await loadIntegrationState();
        await loadSnapshot();
        setServerKeyInput("");
        setStatus({
          kind: "success",
          message: `ER:LC key saved successfully (${payload.maskedKey ?? "configured"}).`,
        });
      } catch (error) {
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to save ER:LC key.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [serverKeyInput, loadIntegrationState, loadSnapshot],
  );

  const handleDelete = useCallback(async () => {
    setSubmitting(true);
    setStatus({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/integrations/erlc", {
        method: "DELETE",
        headers: createTrustedHeaders(),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to remove ER:LC key.");
      }

      setIntegration({ connected: false, maskedKey: null, updatedAt: null });
      setSnapshot(null);
      setStatus({ kind: "success", message: "ER:LC key removed." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to remove ER:LC key.",
      });
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setSubmitting(true);
    setStatus({ kind: "idle", message: "" });
    try {
      await loadSnapshot();
      setStatus({ kind: "success", message: "ER:LC snapshot refreshed." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to refresh snapshot.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [loadSnapshot]);

  const statusClassName = useMemo(() => {
    if (status.kind === "success") {
      return "border-[rgba(82,196,122,0.45)] bg-[rgba(82,196,122,0.12)]";
    }
    if (status.kind === "error") {
      return "border-[rgba(216,29,56,0.45)] bg-[rgba(216,29,56,0.12)]";
    }
    return "";
  }, [status.kind]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Integrations</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            ER:LC and Webhook Integrations
          </h1>
        </div>
      </div>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">ER:LC Server-Key</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Use your ER:LC Server-Key from in-game server settings. This key is encrypted and stored against your Discord account.
          </p>

          <form onSubmit={handleSave} className="mt-4 space-y-3">
            <div>
              <label className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                Server-Key
              </label>
              <input
                type="password"
                value={serverKeyInput}
                onChange={(event) => setServerKeyInput(event.target.value)}
                placeholder="Paste your ER:LC Server-Key"
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Do not paste PRC global authorization keys here.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="button-primary px-4 py-2 text-sm"
                disabled={submitting || !serverKeyInput.trim()}
              >
                {submitting ? "Saving..." : "Save and Test Key"}
              </button>
              {integration.connected ? (
                <>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="button-secondary px-4 py-2 text-sm"
                    disabled={submitting}
                  >
                    Refresh Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="button-secondary px-4 py-2 text-sm"
                    disabled={submitting}
                  >
                    Remove Key
                  </button>
                </>
              ) : null}
            </div>
          </form>

          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
            <p className="text-[var(--ink-soft)]">
              Status:{" "}
              <span className="text-[var(--ink-strong)]">
                {loading ? "Loading..." : integration.connected ? "Connected" : "Not connected"}
              </span>
            </p>
            <p className="mt-1 text-[var(--ink-soft)]">
              Saved key:{" "}
              <span className="text-[var(--ink-strong)]">
                {integration.maskedKey ?? "None"}
              </span>
            </p>
            <p className="mt-1 text-[var(--ink-soft)]">
              Last updated:{" "}
              <span className="text-[var(--ink-strong)]">
                {formatTimestamp(integration.updatedAt)}
              </span>
            </p>
          </div>

          {status.message ? (
            <div className={`mt-3 rounded-lg border p-3 text-sm ${statusClassName}`}>
              {status.message}
            </div>
          ) : null}
        </article>

        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Server Snapshot</h2>
          {!integration.connected ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              Connect your ER:LC key to load server status, players, and queue metrics.
            </p>
          ) : snapshot ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-[var(--ink-soft)]">Server</p>
                <p className="text-lg font-semibold">
                  {snapshot.serverName ?? "Unknown server name"}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  Updated {new Date(snapshot.fetchedAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Players</p>
                  <p className="mt-1 text-xl font-semibold">
                    {snapshot.playerCount ?? "N/A"}
                    {snapshot.maxPlayers ? ` / ${snapshot.maxPlayers}` : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Queue</p>
                  <p className="mt-1 text-xl font-semibold">{snapshot.queueCount ?? "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Owner</p>
                  <p className="mt-1 text-sm font-semibold">{snapshot.serverOwner ?? "N/A"}</p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Region</p>
                  <p className="mt-1 text-sm font-semibold">{snapshot.serverRegion ?? "N/A"}</p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Join Code</p>
                  <p className="mt-1 text-sm font-semibold">{snapshot.joinCode ?? "N/A"}</p>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Uptime</p>
                  <p className="mt-1 text-sm font-semibold">{snapshot.uptime ?? "N/A"}</p>
                </div>
              </div>

              {snapshot.playersSample.length ? (
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Players Sample</p>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">{snapshot.playersSample.join(", ")}</p>
                </div>
              ) : null}

              {snapshot.queueSample.length ? (
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Queue Sample</p>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">{snapshot.queueSample.join(", ")}</p>
                </div>
              ) : null}

              {snapshot.permissionBreakdown.length ? (
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Permission Breakdown</p>
                  <div className="mt-2 space-y-1 text-xs text-[var(--ink-soft)]">
                    {snapshot.permissionBreakdown.map((item) => (
                      <p key={item.role}>{item.role}: {item.count}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {snapshot.endpoints ? (
                <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    Endpoint Health
                  </p>
                  <div className="mt-2 space-y-1.5 text-xs text-[var(--ink-soft)]">
                    <p>
                      /server: {endpointStateLabel(snapshot.endpoints.server.ok, snapshot.endpoints.server.status)} ({snapshot.endpoints.server.status})
                      {typeof snapshot.endpoints.server.latencyMs === "number" ? ` - ${snapshot.endpoints.server.latencyMs}ms` : ""}
                    </p>
                    <p>
                      /server/players: {endpointStateLabel(snapshot.endpoints.players.ok, snapshot.endpoints.players.status)} ({snapshot.endpoints.players.status})
                      {typeof snapshot.endpoints.players.latencyMs === "number" ? ` - ${snapshot.endpoints.players.latencyMs}ms` : ""}
                    </p>
                    <p>
                      /server/queue: {endpointStateLabel(snapshot.endpoints.queue.ok, snapshot.endpoints.queue.status)} ({snapshot.endpoints.queue.status})
                      {typeof snapshot.endpoints.queue.latencyMs === "number" ? ` - ${snapshot.endpoints.queue.latencyMs}ms` : ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Loading snapshot...</p>
          )}
        </article>
      </section>
    </div>
  );
}
