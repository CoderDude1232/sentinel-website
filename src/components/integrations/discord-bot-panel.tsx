"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UiSelect } from "@/components/ui-select";

type BotIntegrationResponse = {
  botConfigured: boolean;
  requiresRelogin: boolean;
  inviteUrl: string | null;
  selectedGuildId?: string | null;
  guilds: Array<{ id: string; name: string; iconUrl: string | null; permissions: string }>;
  channels: Array<{ id: string; name: string; type: number }>;
  integration: {
    enabled: boolean;
    guildId: string | null;
    guildName: string | null;
    alertsChannelId: string | null;
    alertsChannelName: string | null;
    updatedAt: string | null;
  };
  error?: string;
};

type StatusState = { kind: "idle" | "success" | "error"; message: string };

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

export function DiscordBotPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botConfigured, setBotConfigured] = useState(false);
  const [requiresRelogin, setRequiresRelogin] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [guilds, setGuilds] = useState<BotIntegrationResponse["guilds"]>([]);
  const [channels, setChannels] = useState<BotIntegrationResponse["channels"]>([]);
  const [enabled, setEnabled] = useState(false);
  const [guildId, setGuildId] = useState("");
  const [alertsChannelId, setAlertsChannelId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState>({ kind: "idle", message: "" });

  const selectedGuild = useMemo(() => guilds.find((guild) => guild.id === guildId) ?? null, [guilds, guildId]);
  const readyForTest = enabled && Boolean(guildId) && Boolean(alertsChannelId);

  const loadBase = useCallback(async () => {
    const response = await fetch("/api/integrations/discord-bot", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as BotIntegrationResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load Discord bot integration.");
    }

    setBotConfigured(payload.botConfigured);
    setRequiresRelogin(payload.requiresRelogin);
    setInviteUrl(payload.inviteUrl);
    setGuilds(payload.guilds ?? []);
    setChannels(payload.channels ?? []);
    setEnabled(Boolean(payload.integration?.enabled));
    setGuildId(payload.integration?.guildId ?? payload.guilds?.[0]?.id ?? "");
    setAlertsChannelId(payload.integration?.alertsChannelId ?? "");
    setLastUpdated(payload.integration?.updatedAt ?? null);
  }, []);

  const loadChannelsForGuild = useCallback(async (nextGuildId: string) => {
    if (!nextGuildId) {
      setChannels([]);
      return;
    }

    const response = await fetch(`/api/integrations/discord-bot?guildId=${encodeURIComponent(nextGuildId)}`, {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as BotIntegrationResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load Discord channels.");
    }
    setInviteUrl(payload.inviteUrl);
    setChannels(payload.channels ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        await loadBase();
      } catch (error) {
        if (active) {
          setStatus({
            kind: "error",
            message: error instanceof Error ? error.message : "Failed to load Discord bot integration",
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
  }, [loadBase]);

  async function handleSave() {
    if (!guildId) {
      setStatus({ kind: "error", message: "Select a Discord server first." });
      return;
    }

    setSaving(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/integrations/discord-bot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId,
          alertsChannelId: alertsChannelId || null,
          enabled,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        integration?: BotIntegrationResponse["integration"];
        inviteUrl?: string | null;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save Discord bot integration.");
      }
      setInviteUrl(payload.inviteUrl ?? null);
      setLastUpdated(payload.integration?.updatedAt ?? new Date().toISOString());
      setStatus({ kind: "success", message: "Discord bot integration saved." });
      await loadChannelsForGuild(guildId);
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save Discord bot integration.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/integrations/discord-bot", { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to disconnect bot integration.");
      }
      setEnabled(false);
      setAlertsChannelId("");
      setLastUpdated(new Date().toISOString());
      setStatus({ kind: "success", message: "Discord bot integration disconnected." });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to disconnect bot integration.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestMessage() {
    setSaving(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/integrations/discord-bot/test", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        delivered?: boolean;
        status?: number;
        integrationState?: {
          enabled?: boolean;
          hasGuild?: boolean;
          hasAlertsChannel?: boolean;
        };
      };
      if (!response.ok) {
        const missing = payload.integrationState
          ? [
              payload.integrationState.enabled ? null : "enable bot delivery",
              payload.integrationState.hasGuild ? null : "select a server",
              payload.integrationState.hasAlertsChannel ? null : "select an alerts channel",
            ]
              .filter((item): item is string => Boolean(item))
              .join(", ")
          : "";
        throw new Error(
          missing
            ? `${payload.error ?? "Failed to send bot test message."} Missing: ${missing}.`
            : payload.error ?? "Failed to send bot test message.",
        );
      }
      setStatus({
        kind: payload.delivered ? "success" : "error",
        message: payload.delivered
          ? "Test message sent through Discord bot."
          : `Bot delivery failed${payload.status ? ` (HTTP ${payload.status})` : ""}${payload.error ? `: ${payload.error}` : "."}`,
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to send bot test message.",
      });
    } finally {
      setSaving(false);
    }
  }

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
    <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
      <h2 className="text-lg font-semibold tracking-tight">Discord Bot Integration</h2>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        Upgrade from webhooks with managed channels, slash-command support readiness, and bot-driven alert delivery.
      </p>

      <div className="mt-4 rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
        <p className="text-[var(--ink-soft)]">
          Bot credentials: <span className="text-[var(--ink-strong)]">{botConfigured ? "Configured" : "Missing"}</span>
        </p>
        <p className="mt-1 text-[var(--ink-soft)]">
          Linked server: <span className="text-[var(--ink-strong)]">{selectedGuild?.name ?? "Not selected"}</span>
        </p>
        <p className="mt-1 text-[var(--ink-soft)]">
          Alerts channel: <span className="text-[var(--ink-strong)]">{alertsChannelId ? `#${channels.find((channel) => channel.id === alertsChannelId)?.name ?? "selected"}` : "Not selected"}</span>
        </p>
        <p className="mt-1 text-[var(--ink-soft)]">
          Last updated: <span className="text-[var(--ink-strong)]">{formatTimestamp(lastUpdated)}</span>
        </p>
        <p className="mt-1 text-[var(--ink-soft)]">
          Test readiness:{" "}
          <span className="text-[var(--ink-strong)]">
            {readyForTest ? "Ready" : "Incomplete (enable + server + channel + save)"}
          </span>
        </p>
      </div>

      {requiresRelogin ? (
        <div className="mt-3 rounded-lg border border-[rgba(216,29,56,0.45)] bg-[rgba(216,29,56,0.12)] p-3 text-sm text-[var(--ink-strong)]">
          Discord guild permission is missing or expired. Re-auth to grant "View your servers".
          <div className="mt-2">
            <form action="/api/auth/discord/start" method="POST">
              <button type="submit" className="button-secondary px-3 py-2 text-sm">
                Reconnect Discord OAuth
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Server</p>
          <UiSelect
            value={guildId}
            onChange={(value) => {
              setGuildId(value);
              setAlertsChannelId("");
              void loadChannelsForGuild(value).catch((error) =>
                setStatus({
                  kind: "error",
                  message: error instanceof Error ? error.message : "Failed to load channels.",
                }),
              );
            }}
            className="mt-1"
            options={
              guilds.length
                ? guilds.map((guild) => ({ value: guild.id, label: guild.name }))
                : [{ value: "", label: loading ? "Loading servers..." : "No manageable servers" }]
            }
            disabled={!guilds.length || loading}
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Alerts channel</p>
          <UiSelect
            value={alertsChannelId}
            onChange={(value) => setAlertsChannelId(value)}
            className="mt-1"
            options={[
              { value: "", label: "No channel selected" },
              ...channels.map((channel) => ({ value: channel.id, label: `#${channel.name}` })),
            ]}
            disabled={!channels.length || loading}
          />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
        <input
          type="checkbox"
          className="ui-checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          disabled={!botConfigured}
        />
        Enable bot delivery for Sentinel alerts
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="button-primary px-4 py-2 text-sm"
          onClick={() => void handleSave()}
          disabled={saving || loading || !guildId}
        >
          {saving ? "Saving..." : "Save Bot Integration"}
        </button>
        <button
          type="button"
          className="button-secondary px-4 py-2 text-sm"
          onClick={() => void sendTestMessage()}
          disabled={saving || !enabled || !alertsChannelId}
        >
          Send Bot Test
        </button>
        <button
          type="button"
          className="button-secondary px-4 py-2 text-sm"
          onClick={() => void handleDisconnect()}
          disabled={saving}
        >
          Disconnect
        </button>
        {inviteUrl ? (
          <a href={inviteUrl} target="_blank" rel="noreferrer" className="button-secondary px-4 py-2 text-sm">
            Invite Bot
          </a>
        ) : null}
      </div>

      {status.message ? (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${statusClassName}`}>{status.message}</div>
      ) : null}
    </article>
  );
}
