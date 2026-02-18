"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { UiSelect } from "@/components/ui-select";
import { CollapsibleSection } from "@/components/collapsible-section";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type InfractionPolicy = {
  warningPoints: number;
  strikePoints: number;
  suspensionPoints: number;
  terminationPoints: number;
  autoSuspendThreshold: number;
  autoTerminationThreshold: number;
};

type InfractionData = {
  stats: Array<{ type: string; count: number }>;
  cases: Array<{
    id: number;
    caseRef: string;
    target: string;
    level: string;
    issuer: string;
    appealStatus: string;
    createdAt: string;
  }>;
  policy: InfractionPolicy;
  totals: { cases: number; points: number };
  prc?: {
    connected: boolean;
    activeBans: number;
    bans: Array<{ primary: string; secondary: string | null; detail: string | null; occurredAt: string | null }>;
    fetchedAt: string | null;
  };
  error?: string;
};

type OnlinePlayersResponse = {
  onlinePlayers?: Array<{ id: number; username: string; displayName: string; avatarUrl: string | null }>;
  error?: string;
};

const targetSourceOptions: Array<{ value: "online" | "offline"; label: string }> = [
  { value: "online", label: "Online players" },
  { value: "offline", label: "Offline player" },
];

const defaultPolicy: InfractionPolicy = {
  warningPoints: 1,
  strikePoints: 3,
  suspensionPoints: 5,
  terminationPoints: 8,
  autoSuspendThreshold: 8,
  autoTerminationThreshold: 12,
};

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export default function InfractionsPage() {
  const PRC_BANS_DISPLAY_LIMIT = 12;
  const CASE_DISPLAY_LIMIT = 20;

  const [data, setData] = useState<InfractionData>({
    stats: [],
    cases: [],
    policy: defaultPolicy,
    totals: { cases: 0, points: 0 },
  });
  const [targetSource, setTargetSource] = useState<"online" | "offline">("online");
  const [onlinePlayers, setOnlinePlayers] = useState<Array<{ id: number; username: string; displayName: string; avatarUrl: string | null }>>([]);
  const [selectedOnlineTarget, setSelectedOnlineTarget] = useState("");
  const [offlineTarget, setOfflineTarget] = useState("");
  const [playersLoading, setPlayersLoading] = useState(false);
  const [level, setLevel] = useState("Warning");
  const [issuer, setIssuer] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/infractions", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as InfractionData;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load infractions");
    }
    setData(payload);
  }, []);

  const loadOnlinePlayers = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setPlayersLoading(true);
    try {
      const response = await fetch("/api/integrations/erlc/players", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as OnlinePlayersResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load online players");
      }
      const players = payload.onlinePlayers ?? [];
      setOnlinePlayers(players);
      setSelectedOnlineTarget((current) => {
        if (current && players.some((item) => item.username === current)) {
          return current;
        }
        return players[0]?.username ?? "";
      });
    } catch (error) {
      setOnlinePlayers([]);
      setSelectedOnlineTarget("");
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "Failed to load online players");
      }
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([load(), loadOnlinePlayers()]).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load infractions");
    });
  }, [load, loadOnlinePlayers]);

  useAutoRefresh(
    () => loadOnlinePlayers({ silent: true }),
    { intervalMs: 12000, runImmediately: false, onlyWhenVisible: true },
  );

  const resolvedTarget = targetSource === "online" ? selectedOnlineTarget.trim() : offlineTarget.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/infractions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: resolvedTarget, targetSource, level, issuer }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        pointsAwarded?: number;
        totalPoints?: number;
        thresholdAction?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create infraction");
      }
      if (targetSource === "offline") {
        setOfflineTarget("");
      }
      await load();
      if (payload.thresholdAction && payload.thresholdAction !== "none") {
        setMessage(`Infraction logged. Threshold triggered: ${payload.thresholdAction}.`);
      } else {
        setMessage(
          `Infraction logged. +${payload.pointsAwarded ?? 0} points (total ${payload.totalPoints ?? data.totals.points}).`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create infraction");
    } finally {
      setLoading(false);
    }
  }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPolicy(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/infractions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.policy),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        policy?: InfractionPolicy;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save infraction policy");
      }
      if (payload.policy) {
        setData((prev) => ({ ...prev, policy: payload.policy as InfractionPolicy }));
      }
      setMessage("Infraction policy saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save infraction policy");
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <div>
      <span className="kicker">Infractions</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Disciplinary Workflow</h1>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 space-y-3">
        <CollapsibleSection
          title="Points and thresholds"
          subtitle="Automated suspension/termination threshold controls."
          meta={`${data.totals.points} pts`}
        >
          <form onSubmit={savePolicy} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-[var(--ink-soft)]">
                Warning points
                <input
                  type="number"
                  min={0}
                  value={data.policy.warningPoints}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      policy: { ...prev.policy, warningPoints: Number(event.target.value) || 0 },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--ink-soft)]">
                Strike points
                <input
                  type="number"
                  min={0}
                  value={data.policy.strikePoints}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      policy: { ...prev.policy, strikePoints: Number(event.target.value) || 0 },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--ink-soft)]">
                Suspension points
                <input
                  type="number"
                  min={0}
                  value={data.policy.suspensionPoints}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      policy: { ...prev.policy, suspensionPoints: Number(event.target.value) || 0 },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-[var(--ink-soft)]">
                Termination points
                <input
                  type="number"
                  min={0}
                  value={data.policy.terminationPoints}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      policy: { ...prev.policy, terminationPoints: Number(event.target.value) || 0 },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--ink-soft)]">
                Auto suspend threshold
                <input
                  type="number"
                  min={1}
                  value={data.policy.autoSuspendThreshold}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      policy: { ...prev.policy, autoSuspendThreshold: Number(event.target.value) || 1 },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--ink-soft)]">
                Auto termination threshold
                <input
                  type="number"
                  min={1}
                  value={data.policy.autoTerminationThreshold}
                  onChange={(event) =>
                    setData((prev) => ({
                      ...prev,
                      policy: { ...prev.policy, autoTerminationThreshold: Number(event.target.value) || 1 },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={savingPolicy}>
              {savingPolicy ? "Saving..." : "Save policy"}
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection
          title="Infraction stats"
          subtitle="Current counts by disciplinary level."
          meta={`${data.totals.cases} cases`}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.stats.map((item) => (
              <article key={item.type} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.type}</p>
                <p className="mt-1 text-2xl font-semibold">{item.count}</p>
              </article>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Live PRC bans"
          subtitle="Active in-game bans returned by ER:LC API."
          meta={data.prc?.connected ? `${data.prc.activeBans} active` : "Not connected"}
        >
          {!data.prc?.connected ? (
            <p className="text-sm text-[var(--ink-soft)]">Connect ER:LC to sync live ban records.</p>
          ) : (
            <>
              {data.prc.bans.length > PRC_BANS_DISPLAY_LIMIT ? (
                <p className="mb-2 text-xs text-[var(--ink-soft)]">
                  Showing {PRC_BANS_DISPLAY_LIMIT} of {data.prc.bans.length} bans.
                </p>
              ) : null}
            <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1 text-sm">
              {data.prc.bans.slice(0, PRC_BANS_DISPLAY_LIMIT).map((item, index) => (
                <div key={`${item.primary}-${index}`} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                  <p className="font-semibold">{item.primary}</p>
                  {item.detail ? <p className="text-[var(--ink-soft)]">{item.detail}</p> : null}
                  {item.occurredAt ? (
                    <p className="text-xs text-[var(--ink-soft)]">
                      Recorded: {formatTimestamp(item.occurredAt) ?? item.occurredAt}
                    </p>
                  ) : null}
                </div>
              ))}
              {!data.prc.bans.length ? <p className="text-[var(--ink-soft)]">No active bans returned by PRC.</p> : null}
            </div>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Log new infraction"
          subtitle="Choose online/offline target and submit discipline level."
        >
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
            <div className="w-full rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-2 sm:min-w-[280px] sm:w-auto">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,220px)_auto]">
                <UiSelect
                  value={targetSource}
                  onChange={(value) => setTargetSource(value)}
                  options={targetSourceOptions}
                />
                <button
                  type="button"
                  onClick={() => void loadOnlinePlayers()}
                  className="button-secondary px-3 py-2 text-sm"
                  disabled={playersLoading}
                >
                  {playersLoading ? "Refreshing..." : "Refresh online"}
                </button>
              </div>

              {targetSource === "online" ? (
                <div className="mt-2 w-full sm:min-w-[260px]">
                  {onlinePlayers.length ? (
                    <UiSelect
                      value={selectedOnlineTarget || onlinePlayers[0].username}
                      onChange={(value) => setSelectedOnlineTarget(value)}
                      options={onlinePlayers.map((playerEntry) => ({
                        value: playerEntry.username,
                        label: playerEntry.username,
                        description: playerEntry.displayName,
                        avatarUrl: playerEntry.avatarUrl,
                      }))}
                    />
                  ) : (
                    <p className="text-sm text-[var(--ink-soft)]">
                      No verified online players found. Switch source to Offline player.
                    </p>
                  )}
                </div>
              ) : (
                <input
                  value={offlineTarget}
                  onChange={(event) => setOfflineTarget(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                  placeholder="Offline Roblox username"
                />
              )}
            </div>
            <UiSelect
              value={level}
              onChange={(value) => setLevel(value)}
              className="w-full sm:min-w-[170px] sm:w-auto"
              options={[
                { value: "Warning", label: "Warning" },
                { value: "Strike", label: "Strike" },
                { value: "Suspension", label: "Suspension" },
                { value: "Termination", label: "Termination" },
              ]}
            />
            <input
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm sm:w-auto"
              placeholder="Issuer (optional)"
            />
            <button className="button-primary w-full px-3 py-2 text-sm sm:w-auto" type="submit" disabled={loading || !resolvedTarget}>
              {loading ? "Saving..." : "Log infraction"}
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection
          title="Recent cases"
          subtitle="Latest disciplinary events in your workspace."
          meta={String(data.cases.length)}
        >
          {data.cases.length > CASE_DISPLAY_LIMIT ? (
            <p className="mb-2 text-xs text-[var(--ink-soft)]">
              Showing {CASE_DISPLAY_LIMIT} of {data.cases.length} cases.
            </p>
          ) : null}
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1 text-sm">
            {data.cases.slice(0, CASE_DISPLAY_LIMIT).map((item) => (
              <div
                key={item.id.toString()}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.caseRef} - {item.level}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    Appeal: {item.appealStatus}
                  </span>
                </div>
                <p className="text-[var(--ink-soft)]">Target: {item.target}</p>
                <p className="text-xs text-[var(--ink-soft)]">Issued by: {item.issuer}</p>
                <p className="text-xs text-[var(--ink-soft)]">
                  Logged: {formatTimestamp(item.createdAt) ?? item.createdAt}
                </p>
              </div>
            ))}
            {!data.cases.length ? <p className="text-[var(--ink-soft)]">No infractions logged yet.</p> : null}
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}

