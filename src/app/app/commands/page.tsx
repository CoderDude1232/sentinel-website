"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { UiSelect } from "@/components/ui-select";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { createTrustedHeaders } from "@/lib/client-security";

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

type RobloxPlayer = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type CommandsResponse = {
  policy: CommandPolicy;
  executions: CommandExecutionRecord[];
  onlinePlayers: RobloxPlayer[];
  loggedPlayers?: RobloxPlayer[];
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
  allowlist: [":announce", ":pm", ":warn", ":kick", ":ban", ":tban", ":unban", ":tp"],
  requiresApproval: true,
  cooldownSeconds: 15,
};

const EXECUTION_DISPLAY_LIMIT = 24;
const COMMAND_PRESETS = [":warn", ":kick", ":ban", ":tban", ":unban"];
const REQUIRES_REASON = new Set([":announce", ":pm", ":warn", ":kick", ":ban", ":tban"]);

export default function CommandsPage() {
  const [policy, setPolicy] = useState<CommandPolicy>(defaultPolicy);
  const [executions, setExecutions] = useState<CommandExecutionRecord[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<CommandsResponse["onlinePlayers"]>([]);
  const [loggedPlayers, setLoggedPlayers] = useState<RobloxPlayer[]>([]);
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
    () => [
      { value: "", label: "Global command (no player target)" },
      ...onlinePlayers.map((player) => ({
        value: player.username,
        label: player.username,
        description: player.displayName,
        avatarUrl: player.avatarUrl,
      })),
    ],
    [onlinePlayers],
  );

  const playerDirectory = useMemo(() => {
    const combined = [...onlinePlayers, ...loggedPlayers];
    const map = new Map<string, RobloxPlayer>();
    for (const player of combined) {
      map.set(player.username.toLowerCase(), player);
    }
    return map;
  }, [loggedPlayers, onlinePlayers]);

  const visibleExecutions = useMemo(
    () => executions.slice(0, EXECUTION_DISPLAY_LIMIT),
    [executions],
  );

  const reasonRequired = useMemo(
    () => REQUIRES_REASON.has(command.toLowerCase()),
    [command],
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
    setLoggedPlayers(payload.loggedPlayers ?? []);
    setLive(payload.live);

    const nextCommand = payload.policy.allowlist[0] ?? "";
    setCommand((current) => (current && payload.policy.allowlist.includes(current) ? current : nextCommand));
    setTargetPlayer((current) =>
      current && payload.onlinePlayers?.some((player) => player.username === current)
        ? current
        : "",
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
      setLoggedPlayers(payload.loggedPlayers ?? []);
      setLive(payload.live);
      setTargetPlayer((current) =>
        current && players.some((player) => player.username === current) ? current : "",
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
        headers: createTrustedHeaders({ "Content-Type": "application/json" }),
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
        headers: createTrustedHeaders({ "Content-Type": "application/json" }),
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
            <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.09em] text-[var(--ink-soft)]">
                  <tr className="border-b border-[var(--line)]">
                    <th className="px-3 py-2.5">Server</th>
                    <th className="px-3 py-2.5">Players</th>
                    <th className="px-3 py-2.5">Queue</th>
                    <th className="px-3 py-2.5">Tracked players</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2.5 font-semibold">{live.serverName ?? "Unknown"}</td>
                    <td className="px-3 py-2.5">{live.playerCount ?? "N/A"}</td>
                    <td className="px-3 py-2.5">{live.queueCount ?? "N/A"}</td>
                    <td className="px-3 py-2.5">{onlinePlayers.length}</td>
                  </tr>
                </tbody>
              </table>
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
          subtitle="Choose an online target or leave Global selected to submit without a specific player target."
        >
          <form onSubmit={runCommand} className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {COMMAND_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCommand(preset)}
                  className={`rounded-md border px-2.5 py-1 text-xs ${
                    command === preset
                      ? "border-[rgba(216,29,56,0.45)] bg-[rgba(216,29,56,0.16)] text-[var(--ink-strong)]"
                      : "border-[var(--line)] bg-[rgba(255,255,255,0.02)] text-[var(--ink-soft)]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
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
                options={playerOptions}
                disabled={loading}
              />
            </div>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={reasonRequired ? "Reason/message (required)" : "Optional note"}
              className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            />
            <button
              className="button-primary px-4 py-2 text-sm"
              type="submit"
              disabled={loading || !command.trim() || (reasonRequired && !notes.trim())}
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
          {executions.length > visibleExecutions.length ? (
            <p className="mb-2 text-xs text-[var(--ink-soft)]">
              Showing {visibleExecutions.length} of {executions.length} submissions.
            </p>
          ) : null}
          <div className="max-h-[620px] overflow-y-auto pr-1">
            <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                  <tr className="border-b border-[var(--line)]">
                    <th className="px-3 py-2.5">Command</th>
                    <th className="px-3 py-2.5">Target</th>
                    <th className="px-3 py-2.5">Result</th>
                    <th className="px-3 py-2.5">Actor / Source</th>
                    <th className="px-3 py-2.5">Created</th>
                    <th className="px-3 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExecutions.map((entry) => {
                    const isGlobal = entry.targetPlayer === "GLOBAL";
                    const target = isGlobal ? null : playerDirectory.get(entry.targetPlayer.toLowerCase()) ?? null;
                    return (
                      <tr key={entry.id.toString()} className="border-b border-[var(--line)] last:border-b-0">
                        <td className="px-3 py-2.5 font-semibold">{entry.command}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {!isGlobal && target?.avatarUrl ? (
                              <img src={target.avatarUrl} alt="" className="h-5 w-5 rounded-full border border-[var(--line)]" />
                            ) : null}
                            <span>{isGlobal ? "Global" : target?.username ?? entry.targetPlayer}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 uppercase tracking-[0.08em]">{entry.result}</td>
                        <td className="px-3 py-2.5">{entry.actor} / {entry.source}</td>
                        <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)]">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--ink-soft)]">{entry.notes ?? "-"}</td>
                      </tr>
                    );
                  })}
                  {!executions.length ? (
                    <tr>
                      <td className="px-3 py-3 text-[var(--ink-soft)]" colSpan={6}>
                        No command submissions yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}

