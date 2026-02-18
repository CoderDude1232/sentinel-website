"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UiSelect } from "@/components/ui-select";
import { CollapsibleSection } from "@/components/collapsible-section";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

type ModerationCase = {
  id: number;
  caseRef: string;
  type: string;
  player: string;
  status: string;
  owner: string;
  createdAt: string;
};

type RobloxProfileSummary = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string;
};

type ModCallIdentity = {
  raw: string | null;
  username: string | null;
  robloxId: number | null;
  profile: RobloxProfileSummary | null;
};

type LiveModCall = {
  primary: string;
  secondary: string | null;
  detail: string | null;
  occurredAt: string | null;
  reporter?: ModCallIdentity;
  target?: ModCallIdentity;
};

type OnlinePlayersResponse = {
  onlinePlayers?: Array<{ id: number; username: string; displayName: string; avatarUrl: string | null }>;
  error?: string;
};

const safeguards = [
  "Command allowlist enforced by role",
  "All command submissions logged with actor and timestamp",
  "Evidence links required for escalated actions",
  "Webhook notifications for critical moderation events",
];

const playerSourceOptions: Array<{ value: "online" | "offline"; label: string }> = [
  { value: "online", label: "Online players" },
  { value: "offline", label: "Offline player" },
];

const caseTypeOptions: Array<{ value: string; label: string }> = [
  { value: "RDM Case", label: "RDM Case" },
  { value: "Mod Call", label: "Mod Call" },
  { value: "Traffic Stop", label: "Traffic Stop" },
  { value: "Fail RP", label: "Fail RP" },
  { value: "Exploit Review", label: "Exploit Review" },
];

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "Queued", label: "Queued" },
  { value: "Investigating", label: "Investigating" },
  { value: "Escalated", label: "Escalated" },
  { value: "Resolved", label: "Resolved" },
];

const MOD_CALL_DISPLAY_LIMIT = 12;
const CASE_DISPLAY_LIMIT = 20;
const QUICK_ACTIONS: Array<{
  command: string;
  label: string;
  tone: "warn" | "kick" | "ban" | "tban" | "pm" | "unban";
}> = [
  { command: ":warn", label: "Warn", tone: "warn" },
  { command: ":kick", label: "Kick", tone: "kick" },
  { command: ":ban", label: "Ban", tone: "ban" },
  { command: ":tban", label: "Temp Ban", tone: "tban" },
  { command: ":pm", label: "Message", tone: "pm" },
  { command: ":unban", label: "Unban", tone: "unban" },
];
const MOD_CALL_ACTION_COMMANDS = new Set([":warn", ":kick", ":ban", ":tban", ":pm"]);
const MOD_CALL_QUICK_ACTIONS = QUICK_ACTIONS.filter((entry) => MOD_CALL_ACTION_COMMANDS.has(entry.command));

type CommandExecutionState = "Queued" | "Executed" | "Blocked";

const ROBLOX_USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

function extractUsernameCandidate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const colonMatch = trimmed.match(/^([A-Za-z0-9_]{3,20})\s*:\s*(\d+)$/);
  if (colonMatch) {
    return colonMatch[1];
  }

  const bracketMatch = trimmed.match(/^([A-Za-z0-9_]{3,20})\s*\(\s*(\d+)\s*\)$/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  if (ROBLOX_USERNAME_REGEX.test(trimmed)) {
    return trimmed;
  }

  const head = trimmed.split(":")[0]?.trim();
  if (head && ROBLOX_USERNAME_REGEX.test(head)) {
    return head;
  }

  return "";
}

function resolveModActionTarget(call: LiveModCall): string {
  const secondary = call.target?.profile?.username ?? call.target?.username ?? extractUsernameCandidate(call.secondary);
  if (ROBLOX_USERNAME_REGEX.test(secondary)) {
    return secondary;
  }
  const primary = call.reporter?.profile?.username ?? call.reporter?.username ?? extractUsernameCandidate(call.primary);
  if (ROBLOX_USERNAME_REGEX.test(primary)) {
    return primary;
  }
  return "";
}

function getQuickActionButtonClass(tone: "warn" | "kick" | "ban" | "tban" | "pm" | "unban"): string {
  return `moderation-action-button moderation-action-${tone}`;
}

export default function ModerationPage() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [type, setType] = useState("Mod Call");
  const [playerSource, setPlayerSource] = useState<"online" | "offline">("online");
  const [onlinePlayers, setOnlinePlayers] = useState<Array<{ id: number; username: string; displayName: string; avatarUrl: string | null }>>([]);
  const [selectedOnlinePlayer, setSelectedOnlinePlayer] = useState("");
  const [offlinePlayer, setOfflinePlayer] = useState("");
  const [playersLoading, setPlayersLoading] = useState(false);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("Queued");
  const [loading, setLoading] = useState(false);
  const [quickReason, setQuickReason] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [caseActionLoading, setCaseActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [prc, setPrc] = useState<{
    connected: boolean;
    modCalls: LiveModCall[];
    openModCalls: number;
    fetchedAt: string | null;
  }>({
    connected: false,
    modCalls: [],
    openModCalls: 0,
    fetchedAt: null,
  });

  const loadCases = useCallback(async () => {
    const response = await fetch("/api/panels/moderation", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      cases?: ModerationCase[];
      prc?: {
        connected: boolean;
        modCalls: LiveModCall[];
        openModCalls: number;
        fetchedAt: string | null;
      };
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load moderation cases");
    }
    setCases(payload.cases ?? []);
    setPrc(
      payload.prc ?? {
        connected: false,
        modCalls: [],
        openModCalls: 0,
        fetchedAt: null,
      },
    );
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
      setSelectedOnlinePlayer((current) => {
        if (current && players.some((item) => item.username === current)) {
          return current;
        }
        return players[0]?.username ?? "";
      });
    } catch (error) {
      setOnlinePlayers([]);
      setSelectedOnlinePlayer("");
      if (!silent) {
        setMessage(error instanceof Error ? error.message : "Failed to load online players");
      }
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCases(), loadOnlinePlayers()]).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load moderation panel");
    });
  }, [loadCases, loadOnlinePlayers]);

  useAutoRefresh(
    () => loadOnlinePlayers({ silent: true }),
    { intervalMs: 12000, runImmediately: false, onlyWhenVisible: true },
  );

  const openCount = useMemo(
    () => cases.filter((item) => !["resolved", "closed"].includes(item.status.toLowerCase())).length,
    [cases],
  );
  const resolvedPlayer = playerSource === "online" ? selectedOnlinePlayer.trim() : offlinePlayer.trim();

  async function runQuickAction(command: string, target: string, reason?: string) {
    const resolvedTarget = target.trim();
    if (!resolvedTarget) {
      setMessage("Select or enter a player first.");
      return;
    }
    setQuickLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          targetPlayer: resolvedTarget,
          notes: (reason ?? quickReason).trim(),
          quickAction: true,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        queuedByCooldown?: boolean;
        cooldownRemaining?: number;
        execution?: { result?: CommandExecutionState };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to run ${command}`);
      }
      const result = payload.execution?.result ?? "Queued";
      if (result === "Executed") {
        setMessage(`Quick action executed in ER:LC: ${command} ${resolvedTarget}.`);
      } else if (result === "Queued") {
        if (payload.queuedByCooldown) {
          const remainingText =
            typeof payload.cooldownRemaining === "number" ? ` (${payload.cooldownRemaining}s)` : "";
          setMessage(`Quick action queued due to cooldown${remainingText}: ${command} ${resolvedTarget}.`);
        } else {
          setMessage(`Quick action queued by command policy: ${command} ${resolvedTarget}.`);
        }
      } else {
        setMessage(`Quick action was blocked: ${command} ${resolvedTarget}.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Failed to run ${command}`);
    } finally {
      setQuickLoading(false);
    }
  }

  async function createCaseFromModCall(targetPlayer: string, caseType: string) {
    const resolvedTarget = targetPlayer.trim();
    if (!resolvedTarget) {
      setMessage("No valid Roblox target found for this mod call.");
      return;
    }

    setCaseActionLoading(true);
    setMessage("");
    try {
      const isOnline = onlinePlayers.some(
        (entry) => entry.username.toLowerCase() === resolvedTarget.toLowerCase(),
      );
      const response = await fetch("/api/panels/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: caseType,
          player: resolvedTarget,
          playerSource: isOnline ? "online" : "offline",
          owner,
          status: "Investigating",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create moderation case");
      }
      await loadCases();
      setMessage(`${caseType} created for ${resolvedTarget}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create moderation case");
    } finally {
      setCaseActionLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, player: resolvedPlayer, playerSource, owner, status }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create moderation case");
      }
      if (playerSource === "offline") {
        setOfflinePlayer("");
      }
      await loadCases();
      setMessage("Moderation case created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create moderation case");
    } finally {
      setLoading(false);
    }
  }

  async function setCaseStatus(id: number, nextStatus: "Resolved" | "Investigating") {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus, owner: owner || "System" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update case");
      }
      await loadCases();
      setMessage(nextStatus === "Resolved" ? "Case marked as resolved." : "Case reopened.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update case");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="kicker">Moderation</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operational Moderation Panel</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">Open queue items: {openCount}</p>
      {message ? <p className="mt-3 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 space-y-3">
        <CollapsibleSection
          title="Live PRC mod calls"
          subtitle="Incoming in-game player reports from ER:LC."
          meta={prc.connected ? `${prc.openModCalls} active` : "Not connected"}
        >
          {!prc.connected ? (
            <p className="text-sm text-[var(--ink-soft)]">Connect ER:LC to view live mod calls.</p>
          ) : (
            <>
              {prc.modCalls.length > MOD_CALL_DISPLAY_LIMIT ? (
                <p className="mb-2 text-xs text-[var(--ink-soft)]">
                  Showing {MOD_CALL_DISPLAY_LIMIT} of {prc.modCalls.length} mod calls.
                </p>
              ) : null}
            <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1 text-sm">
              {prc.modCalls.slice(0, MOD_CALL_DISPLAY_LIMIT).map((call, index) => {
                const reporterNameCandidate =
                  call.reporter?.profile?.username ??
                  call.reporter?.username ??
                  extractUsernameCandidate(call.primary);
                const reporterName = reporterNameCandidate.trim() ? reporterNameCandidate : "Unknown";
                const reporterDisplay = call.reporter?.profile?.displayName ?? null;
                const reporterAvatar = call.reporter?.profile?.avatarUrl ?? null;
                const reporterRobloxId = call.reporter?.profile?.id ?? call.reporter?.robloxId ?? null;
                const reporterProfileUrl =
                  call.reporter?.profile?.profileUrl ??
                  (reporterRobloxId ? `https://www.roblox.com/users/${reporterRobloxId}/profile` : null);

                const targetNameCandidate =
                  call.target?.profile?.username ??
                  call.target?.username ??
                  extractUsernameCandidate(call.secondary);
                const targetName = targetNameCandidate.trim() ? targetNameCandidate : null;
                const targetRobloxId = call.target?.profile?.id ?? call.target?.robloxId ?? null;
                const targetProfileUrl =
                  call.target?.profile?.profileUrl ??
                  (targetRobloxId ? `https://www.roblox.com/users/${targetRobloxId}/profile` : null);

                const quickActionTarget = resolveModActionTarget(call);
                const modCallReason =
                  call.detail?.trim() ? `PRC mod call: ${call.detail.trim()}` : `PRC mod call from ${reporterName}`;

                return (
                  <div
                    key={`${call.primary}-${call.secondary ?? "none"}-${call.occurredAt ?? index}`}
                    className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.04)]">
                          {reporterAvatar ? (
                            <img src={reporterAvatar} alt={reporterName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold text-[var(--ink-soft)]">
                              {reporterName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{reporterName}</p>
                          <p className="truncate text-xs text-[var(--ink-soft)]">
                            {reporterDisplay ?? "Roblox profile unavailable"}
                          </p>
                        </div>
                      </div>
                      {call.occurredAt ? (
                        <p className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                          {call.occurredAt}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-2 grid gap-1 text-xs text-[var(--ink-soft)] sm:grid-cols-2">
                      <p>
                        Reporter ID:{" "}
                        <span className="font-medium text-[var(--ink)]">
                          {reporterRobloxId ? reporterRobloxId : "Unavailable"}
                        </span>
                      </p>
                      <p>
                        Target:{" "}
                        <span className="font-medium text-[var(--ink)]">
                          {targetName ?? "Not provided"}
                        </span>
                      </p>
                      <p>
                        Target ID:{" "}
                        <span className="font-medium text-[var(--ink)]">
                          {targetRobloxId ? targetRobloxId : "Unavailable"}
                        </span>
                      </p>
                      <p>
                        Report:{" "}
                        <span className="text-[var(--ink)]">
                          {call.detail?.trim() || "No reason included in mod call."}
                        </span>
                      </p>
                    </div>

                    {(reporterProfileUrl || targetProfileUrl) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {reporterProfileUrl ? (
                          <a
                            href={reporterProfileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="button-secondary px-2.5 py-1 text-xs"
                          >
                            Reporter Profile
                          </a>
                        ) : null}
                        {targetProfileUrl ? (
                          <a
                            href={targetProfileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="button-secondary px-2.5 py-1 text-xs"
                          >
                            Target Profile
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {quickActionTarget ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {MOD_CALL_QUICK_ACTIONS.map((action) => (
                          <button
                            key={`${call.primary}-${call.secondary ?? "none"}-${action.command}`}
                            type="button"
                            className={`${getQuickActionButtonClass(action.tone)} px-2.5 py-1 text-xs`}
                            disabled={quickLoading}
                            onClick={() => void runQuickAction(action.command, quickActionTarget, modCallReason)}
                          >
                            {action.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="button-primary px-2.5 py-1 text-xs"
                          disabled={caseActionLoading}
                          onClick={() => void createCaseFromModCall(quickActionTarget, "RDM Case")}
                        >
                          {caseActionLoading ? "Creating..." : "Create RDM Case"}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[var(--ink-soft)]">
                        No valid Roblox target detected for quick actions.
                      </p>
                    )}
                  </div>
                );
              })}
              {!prc.modCalls.length ? <p className="text-[var(--ink-soft)]">No active mod calls right now.</p> : null}
            </div>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Open moderation queue"
          subtitle="Review active cases and resolve when complete."
          meta={`${openCount} open`}
        >
          {cases.length > CASE_DISPLAY_LIMIT ? (
            <p className="mb-2 text-xs text-[var(--ink-soft)]">
              Showing {CASE_DISPLAY_LIMIT} of {cases.length} cases.
            </p>
          ) : null}
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1 text-sm">
            {cases.slice(0, CASE_DISPLAY_LIMIT).map((item) => (
              <div
                key={item.id.toString()}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.caseRef}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {item.status}
                  </span>
                </div>
                <p className="text-[var(--ink-soft)]">{item.type} - {item.player}</p>
                <p className="text-xs text-[var(--ink-soft)]">Owner: {item.owner}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={`${item.id}-${action.command}`}
                      type="button"
                      className={`${getQuickActionButtonClass(action.tone)} px-2.5 py-1 text-xs`}
                      disabled={quickLoading}
                      onClick={() =>
                        void runQuickAction(
                          action.command,
                          item.player,
                          `${item.caseRef}: ${item.type}`,
                        )
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                  {!["resolved", "closed"].includes(item.status.toLowerCase()) ? (
                    <button
                      type="button"
                      onClick={() => void setCaseStatus(item.id, "Resolved")}
                      className="button-secondary px-3 py-1 text-xs"
                      disabled={loading}
                    >
                      Resolve Case
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void setCaseStatus(item.id, "Investigating")}
                      className="button-secondary px-3 py-1 text-xs"
                      disabled={loading}
                    >
                      Reopen Case
                    </button>
                  )}
                  </div>
              </div>
            ))}
            {!cases.length ? <p className="text-[var(--ink-soft)]">No moderation cases yet.</p> : null}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Create moderation case"
          subtitle="Select target player source and submit a new case."
        >
          <form onSubmit={handleCreate} className="space-y-2">
            <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,220px)_auto]">
                <UiSelect
                  value={playerSource}
                  onChange={(value) => setPlayerSource(value)}
                  options={playerSourceOptions}
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

              {playerSource === "online" ? (
                <div className="mt-2">
                  {onlinePlayers.length ? (
                    <UiSelect
                      value={selectedOnlinePlayer || onlinePlayers[0].username}
                      onChange={(value) => setSelectedOnlinePlayer(value)}
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
                  value={offlinePlayer}
                  onChange={(event) => setOfflinePlayer(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                  placeholder="Offline Roblox username"
                />
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <UiSelect value={type} onChange={(value) => setType(value)} options={caseTypeOptions} />
              <UiSelect value={status} onChange={(value) => setStatus(value)} options={statusOptions} />
            </div>
            <div className="space-y-2 rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-2">
              <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Quick actions</p>
              <input
                value={quickReason}
                onChange={(event) => setQuickReason(event.target.value)}
                className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                placeholder="Action reason/message (for warn, kick, ban, tban, pm)"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.command}
                    type="button"
                    className={`${getQuickActionButtonClass(action.tone)} px-2.5 py-1 text-xs`}
                    disabled={quickLoading || !resolvedPlayer}
                    onClick={() => void runQuickAction(action.command, resolvedPlayer)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              placeholder="Owner (optional)"
            />
            <button className="button-primary mt-1 px-3 py-2 text-sm" type="submit" disabled={loading || !resolvedPlayer}>
              {loading ? "Saving..." : "Create case"}
            </button>
          </form>
        </CollapsibleSection>

        <CollapsibleSection
          title="Command safeguards"
          subtitle="Current operational guardrails for moderation actions."
          meta={String(safeguards.length)}
        >
          <ul className="space-y-1.5 text-sm text-[var(--ink-soft)]">
            {safeguards.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </CollapsibleSection>
      </section>
    </div>
  );
}
