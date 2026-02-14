"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { UiSelect } from "@/components/ui-select";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type CommandPolicy = {
  allowlist: string[];
  requiresApproval: boolean;
  cooldownSeconds: number;
};

type CommandExecutionRecord = {
  id: number;
  command: string;
  targetPlayer: string;
  actor: string;
  result: "Queued" | "Executed" | "Blocked";
  source: "dashboard" | "automation";
  notes: string | null;
  createdAt: string;
};

type CommandsResponse = {
  policy: CommandPolicy;
  executions: CommandExecutionRecord[];
  onlinePlayers: Array<{ id: number; username: string; displayName: string }>;
  live: {
    connected: boolean;
    serverName: string | null;
    playerCount: number | null;
    queueCount: number | null;
    fetchedAt?: string;
  };
  error?: string;
};

const defaultPolicy: CommandPolicy = {
  allowlist: [":announce", ":pm", ":warn", ":tp"],
  requiresApproval: true,
  cooldownSeconds: 15,
};

export default function CommandsPage() {
  const [policy, setPolicy] = useState<CommandPolicy>(defaultPolicy);
  const [executions, setExecutions] = useState<CommandExecutionRecord[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<CommandsResponse["onlinePlayers"]>([]);
  const [live, setLive] = useState<CommandsResponse["live"]>({
    connected: false,
    serverName: null,
    playerCount: null,
    queueCount: null,
  });

  const [allowlistInput, setAllowlistInput] = useState(defaultPolicy.allowlist.join(", "));
  const [command, setCommand] = useState(defaultPolicy.allowlist[0]);
  const [targetPlayer, setTargetPlayer] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const commandOptions = useMemo(
    () => policy.allowlist.map((entry) => ({ value: entry, label: entry })),
    [policy.allowlist],
  );

  const playerOptions = useMemo(
    () =>
      onlinePlayers.map((player) => ({
        value: player.username,
        label: `${player.username} (${player.displayName})`,
      })),
    [onlinePlayers],
  );

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/commands", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as CommandsResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load command panel");
    }

    setPolicy(payload.policy);
    setAllowlistInput(payload.policy.allowlist.join(", "));
    setExecutions(payload.executions ?? []);
    setOnlinePlayers(payload.onlinePlayers ?? []);
    setLive(payload.live);

    const nextCommand = payload.policy.allowlist[0] ?? "";
    setCommand((current) => (current && payload.policy.allowlist.includes(current) ? current : nextCommand));
    setTargetPlayer((current) =>
      current && payload.onlinePlayers?.some((player) => player.username === current)
        ? current
        : payload.onlinePlayers?.[0]?.username ?? "",
    );
  }, []);

  const refreshLiveOptions = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      const response = await fetch("/api/panels/commands", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as CommandsResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh live command options");
      }

      const players = payload.onlinePlayers ?? [];
      setOnlinePlayers(players);
      setLive(payload.live);
      setTargetPlayer((current) =>
        current && players.some((player) => player.username === current) ? current : players[0]?.username ?? "",
      );
    } catch (error) {
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "Failed to refresh live command options");
      }
    }
  }, []);

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load command panel");
    });
  }, [load]);

  useAutoRefresh(
    () => refreshLiveOptions({ silent: true }),
    { intervalMs: 12000, runImmediately: false, onlyWhenVisible: true },
  );

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const allowlist = allowlistInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/panels/commands", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowlist,
          requiresApproval: policy.requiresApproval,
          cooldownSeconds: policy.cooldownSeconds,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        policy?: CommandPolicy;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save policy");
      }
      if (payload.policy) {
        setPolicy(payload.policy);
        setAllowlistInput(payload.policy.allowlist.join(", "));
        setCommand(payload.policy.allowlist[0] ?? "");
      }
      setMessage("Command policy saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save policy");
    } finally {
      setLoading(false);
    }
  }

  async function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, targetPlayer, notes }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to run command");
      }
      setNotes("");
      setMessage("Command submission recorded.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to run command");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="kicker">Commands</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Safe ER:LC Command Controls</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        Execute allowlisted command actions against live ER:LC players with cooldown and approval policy controls.
      </p>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 space-y-3">
        <CollapsibleSection
          title="Live ER:LC state"
          subtitle="This command module is bound to current server and player telemetry."
          meta={live.connected ? "Connected" : "Disconnected"}
        >
          {live.connected ? (
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Server</p>
                <p className="mt-1 text-sm font-semibold">{live.serverName ?? "Unknown"}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Players</p>
                <p className="mt-1 text-sm font-semibold">{live.playerCount ?? "N/A"}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Queue</p>
                <p className="mt-1 text-sm font-semibold">{live.queueCount ?? "N/A"}</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Tracked players</p>
                <p className="mt-1 text-sm font-semibold">{onlinePlayers.length}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">
              Connect ER:LC in Integrations before using command execution.
            </p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Command policy"
          subtitle="Allowlist, approval mode, and cooldown gate for dashboard command submissions."
        >
          <form onSubmit={savePolicy} className="space-y-3">
            <label className="block text-sm text-[var(--ink-soft)]">
              Allowlist (comma separated)
              <input
                value={allowlistInput}
                onChange={(event) => setAllowlistInput(event.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                <input
                  type="checkbox"
                  className="ui-checkbox"
                  checked={policy.requiresApproval}
                  onChange={(event) =>
                    setPolicy((prev) => ({ ...prev, requiresApproval: event.target.checked }))
                  }
                />
                Require approval before execution
              </label>
              <label className="text-sm text-[var(--ink-soft)]">
                Cooldown (seconds)
                <input
                  type="number"
                  min={0}
                  value={policy.cooldownSeconds}
                  onChange={(event) =>
                    setPolicy((prev) => ({ ...prev, cooldownSeconds: Number(event.target.value) || 0 }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save policy"}
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection
          title="Submit command"
          subtitle="Target must be currently online in ER:LC and pass policy checks."
        >
          <form onSubmit={runCommand} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <UiSelect
                value={command}
                onChange={(value) => setCommand(value)}
                options={commandOptions.length ? commandOptions : [{ value: "", label: "No commands" }]}
                disabled={!commandOptions.length}
              />
              <UiSelect
                value={targetPlayer}
                onChange={(value) => setTargetPlayer(value)}
                options={playerOptions.length ? playerOptions : [{ value: "", label: "No online players" }]}
                disabled={!playerOptions.length}
              />
            </div>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note"
              className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            />
            <button
              className="button-primary px-4 py-2 text-sm"
              type="submit"
              disabled={loading || !command.trim() || !targetPlayer.trim()}
            >
              {loading ? "Submitting..." : "Submit command"}
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection
          title="Execution log"
          subtitle="Recent submissions with policy outcome and actor trace."
          meta={String(executions.length)}
        >
          <div className="space-y-2 text-sm">
            {executions.map((entry) => (
              <div key={entry.id.toString()} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{entry.command} ? {entry.targetPlayer}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {entry.result}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-soft)]">
                  {entry.actor} via {entry.source} • {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.notes ? <p className="mt-1 text-xs text-[var(--ink-soft)]">{entry.notes}</p> : null}
              </div>
            ))}
            {!executions.length ? <p className="text-[var(--ink-soft)]">No command submissions yet.</p> : null}
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}

