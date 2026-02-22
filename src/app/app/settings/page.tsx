"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { UiSelect } from "@/components/ui-select";

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
  const [resetting, setResetting] = useState(false);
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

  async function resetWorkspace() {
    const confirmed = window.confirm(
      "Reset all workspace data, module settings, logs, and panel records? Your ER:LC API key will be kept.",
    );
    if (!confirmed) {
      return;
    }

    setResetting(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmReset: true }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to reset workspace");
      }
      setMessage("Workspace reset complete. Redirecting to onboarding...");
      window.location.href = "/onboarding";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to reset workspace");
    } finally {
      setResetting(false);
    }
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
        <article className="dashboard-card p-4">
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

        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Retention and Notifications</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-[var(--ink-soft)]">
              Retention period
              <UiSelect
                value={settings.retentionDays}
                onChange={(value) => setSettings((prev) => ({ ...prev, retentionDays: value === 30 ? 30 : 90 }))}
                className="mt-1"
                options={[
                  { value: 30, label: "30 days" },
                  { value: 90, label: "90 days" },
                ]}
              />
            </label>
            <label className="text-sm text-[var(--ink-soft)]">
              Discord webhook URL
              <input
                value={settings.webhookUrl ?? ""}
                onChange={(event) => setSettings((prev) => ({ ...prev, webhookUrl: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              className="ui-checkbox"
              checked={settings.infractionEvidenceRequired}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, infractionEvidenceRequired: event.target.checked }))
              }
            />
            Require evidence attachments for infractions
          </label>
        </article>

        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Enabled Modules</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Turn modules on/off for your workspace while keeping data saved.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)]">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.09em] text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--line)]">
                  <th className="px-3 py-2.5">Module</th>
                  <th className="px-3 py-2.5">Enabled</th>
                </tr>
              </thead>
              <tbody>
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
                <tr key={key} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-3 py-2.5 font-semibold">{label}</td>
                  <td className="px-3 py-2.5">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="ui-checkbox"
                        checked={settings.modulePreferences[key as keyof SettingsState["modulePreferences"]]}
                        onChange={() => toggleModulePreference(key as keyof SettingsState["modulePreferences"])}
                      />
                      <span className="text-xs text-[var(--ink-soft)]">
                        {settings.modulePreferences[key as keyof SettingsState["modulePreferences"]] ? "On" : "Off"}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </article>

        <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </button>
        <button
          className="button-secondary ml-2 px-4 py-2 text-sm"
          type="button"
          disabled={resetting}
          onClick={() => void resetWorkspace()}
        >
          {resetting ? "Resetting..." : "Reset Workspace Data"}
        </button>
      </form>
    </div>
  );
}
