"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UiSelect } from "@/components/ui-select";
import { CollapsibleSection } from "@/components/collapsible-section";

type ModerationCase = {
  id: number;
  caseRef: string;
  type: string;
  player: string;
  status: string;
  owner: string;
  createdAt: string;
};

type OnlinePlayersResponse = {
  onlinePlayers?: Array<{ id: number; username: string; displayName: string }>;
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

export default function ModerationPage() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [type, setType] = useState("Mod Call");
  const [playerSource, setPlayerSource] = useState<"online" | "offline">("online");
  const [onlinePlayers, setOnlinePlayers] = useState<Array<{ id: number; username: string; displayName: string }>>([]);
  const [selectedOnlinePlayer, setSelectedOnlinePlayer] = useState("");
  const [offlinePlayer, setOfflinePlayer] = useState("");
  const [playersLoading, setPlayersLoading] = useState(false);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("Queued");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadCases = useCallback(async () => {
    const response = await fetch("/api/panels/moderation", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { cases?: ModerationCase[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load moderation cases");
    }
    setCases(payload.cases ?? []);
  }, []);

  const loadOnlinePlayers = useCallback(async () => {
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
      setMessage(error instanceof Error ? error.message : "Failed to load online players");
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCases(), loadOnlinePlayers()]).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load moderation panel");
    });
  }, [loadCases, loadOnlinePlayers]);

  const openCount = useMemo(
    () => cases.filter((item) => !["resolved", "closed"].includes(item.status.toLowerCase())).length,
    [cases],
  );
  const resolvedPlayer = playerSource === "online" ? selectedOnlinePlayer.trim() : offlinePlayer.trim();

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

  async function moveToResolved(id: number) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Resolved", owner: owner || "System" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update case");
      }
      await loadCases();
      setMessage("Case marked as resolved.");
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
          title="Open moderation queue"
          subtitle="Review active cases and resolve when complete."
          meta={`${openCount} open`}
        >
          <div className="space-y-2 text-sm">
            {cases.map((item) => (
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
                {!["resolved", "closed"].includes(item.status.toLowerCase()) ? (
                  <button
                    type="button"
                    onClick={() => void moveToResolved(item.id)}
                    className="button-secondary mt-2 px-3 py-1 text-xs"
                    disabled={loading}
                  >
                    Mark resolved
                  </button>
                ) : null}
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
                        label: `${playerEntry.username} (${playerEntry.displayName})`,
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
