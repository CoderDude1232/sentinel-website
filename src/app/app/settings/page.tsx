"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type SettingsState = {
  retentionDays: 30 | 90;
  webhookUrl: string | null;
  timezone: string;
  sessionVisibility: string;
  infractionEvidenceRequired: boolean;
  modulePreferences: {
    enableModeration: boolean;
    enableActivity: boolean;
    enableInfractions: boolean;
    enableSessions: boolean;
    enableDepartments: boolean;
    enableAlerts: boolean;
    enableRbac: boolean;
    enableTeams: boolean;
    enableWorkflows: boolean;
    enableAppeals: boolean;
    enableAutomation: boolean;
    enableProfiles: boolean;
    enableLogs: boolean;
    enableRealtime: boolean;
    enableCommands: boolean;
    enableBackups: boolean;
    enableApiKeys: boolean;
    enableObservability: boolean;
    enableBilling: boolean;
  };
  error?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    retentionDays: 90,
    webhookUrl: "",
    timezone: "UTC",
    sessionVisibility: "Team",
    infractionEvidenceRequired: true,
    modulePreferences: {
      enableModeration: true,
      enableActivity: true,
      enableInfractions: true,
      enableSessions: true,
      enableDepartments: true,
      enableAlerts: true,
      enableRbac: true,
      enableTeams: true,
      enableWorkflows: true,
      enableAppeals: true,
      enableAutomation: true,
      enableProfiles: true,
      enableLogs: true,
      enableRealtime: true,
      enableCommands: true,
      enableBackups: true,
      enableApiKeys: true,
      enableObservability: true,
      enableBilling: false,
    },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/settings", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as SettingsState;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load settings");
    }
    setSettings(payload);
  }, []);

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load settings");
    });
  }, [load]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json().catch(() => ({}))) as SettingsState;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save settings");
      }
      setSettings(payload);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  function toggleModulePreference(key: keyof SettingsState["modulePreferences"]) {
    setSettings((prev) => ({
      ...prev,
      modulePreferences: {
        ...prev.modulePreferences,
        [key]: !prev.modulePreferences[key],
      },
    }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Settings</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace Configuration</h1>
        </div>
      </div>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <form onSubmit={saveSettings} className="mt-5 space-y-4">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Workspace Defaults</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-[var(--ink-soft)]">
              Timezone
              <input
                value={settings.timezone}
                onChange={(event) => setSettings((prev) => ({ ...prev, timezone: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-[var(--ink-soft)]">
              Session visibility
              <input
                value={settings.sessionVisibility}
                onChange={(event) => setSettings((prev) => ({ ...prev, sessionVisibility: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              />
            </label>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Retention and Notifications</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-[var(--ink-soft)]">
              Retention period
              <select
                value={settings.retentionDays}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, retentionDays: Number(event.target.value) === 30 ? 30 : 90 }))
                }
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <label className="text-sm text-[var(--ink-soft)]">
              Discord webhook URL
              <input
                value={settings.webhookUrl ?? ""}
                onChange={(event) => setSettings((prev) => ({ ...prev, webhookUrl: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              checked={settings.infractionEvidenceRequired}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, infractionEvidenceRequired: event.target.checked }))
              }
            />
            Require evidence attachments for infractions
          </label>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Enabled Modules</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Turn modules on/off for your workspace while keeping data saved.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["enableModeration", "Moderation"],
              ["enableActivity", "Activity"],
              ["enableInfractions", "Infractions"],
              ["enableSessions", "Sessions"],
              ["enableDepartments", "Departments"],
              ["enableAlerts", "Alerts"],
              ["enableRbac", "RBAC"],
              ["enableTeams", "Teams"],
              ["enableWorkflows", "Workflows"],
              ["enableAppeals", "Appeals"],
              ["enableAutomation", "Automation"],
              ["enableProfiles", "Profiles"],
              ["enableLogs", "Logs"],
              ["enableRealtime", "Realtime"],
              ["enableCommands", "Commands"],
              ["enableBackups", "Backups"],
              ["enableApiKeys", "API Keys"],
              ["enableObservability", "Observability"],
              ["enableBilling", "Billing (Optional)"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.modulePreferences[key as keyof SettingsState["modulePreferences"]]}
                  onChange={() => toggleModulePreference(key as keyof SettingsState["modulePreferences"])}
                />
                {label}
              </label>
            ))}
          </div>
        </article>

        <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
