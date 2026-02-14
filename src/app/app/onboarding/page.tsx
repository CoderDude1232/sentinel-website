"use client";

import { useCallback, useEffect, useState } from "react";
import { UiSelect } from "@/components/ui-select";

type OnboardingResponse = {
  steps: Array<{ step: string; status: "Complete" | "In progress" | "Pending"; detail: string }>;
  preferences: {
    enableModeration: boolean;
    enableActivity: boolean;
    enableInfractions: boolean;
    enableSessions: boolean;
    enableDepartments: boolean;
    enableAlerts: boolean;
  };
  settings?: {
    retentionDays: 30 | 90;
    webhookUrl: string | null;
    infractionEvidenceRequired: boolean;
  };
  erlcConnected: boolean;
  onboardingComplete?: boolean;
  error?: string;
};

export default function OnboardingPage() {
  const [steps, setSteps] = useState<OnboardingResponse["steps"]>([]);
  const [preferences, setPreferences] = useState<OnboardingResponse["preferences"]>({
    enableModeration: true,
    enableActivity: true,
    enableInfractions: true,
    enableSessions: true,
    enableDepartments: true,
    enableAlerts: true,
  });
  const [retentionDays, setRetentionDays] = useState<30 | 90>(90);
  const [infractionEvidenceRequired, setInfractionEvidenceRequired] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [erlcConnected, setErlcConnected] = useState(false);
  const [serverKeyInput, setServerKeyInput] = useState("");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectingKey, setConnectingKey] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/onboarding", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as OnboardingResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load onboarding flow");
    }
    setSteps(payload.steps ?? []);
    if (payload.preferences) {
      setPreferences(payload.preferences);
    }
    if (payload.settings) {
      setRetentionDays(payload.settings.retentionDays === 30 ? 30 : 90);
      setWebhookUrl(payload.settings.webhookUrl ?? "");
      setInfractionEvidenceRequired(Boolean(payload.settings.infractionEvidenceRequired));
    }
    setErlcConnected(Boolean(payload.erlcConnected));
    setOnboardingComplete(Boolean(payload.onboardingComplete));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to load onboarding flow");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveOnboarding() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences,
          retentionDays,
          webhookUrl,
          infractionEvidenceRequired,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as OnboardingResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save onboarding preferences");
      }
      setSteps(payload.steps ?? []);
      setErlcConnected(Boolean(payload.erlcConnected));
      setMessage("Onboarding preferences saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save onboarding preferences");
    } finally {
      setSaving(false);
    }
  }

  async function connectServerKey() {
    if (!serverKeyInput.trim()) {
      setMessage("Enter your ER:LC Server-Key first.");
      return;
    }

    setConnectingKey(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/erlc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverKey: serverKeyInput }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to connect ER:LC key");
      }
      setServerKeyInput("");
      await load();
      setMessage("ER:LC key connected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to connect ER:LC key");
    } finally {
      setConnectingKey(false);
    }
  }

  function togglePreference(key: keyof OnboardingResponse["preferences"]) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Onboarding</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace Setup Flow</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Start with base configuration, choose enabled modules, then connect ER:LC.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} className="button-secondary px-4 py-2 text-sm" type="button">
            Refresh setup
          </button>
          <button onClick={() => void saveOnboarding()} className="button-primary px-4 py-2 text-sm" type="button" disabled={saving}>
            {saving ? "Saving..." : "Save onboarding"}
          </button>
        </div>
      </div>
      {onboardingComplete ? (
        <p className="mt-2 rounded-lg border border-[rgba(82,196,122,0.45)] bg-[rgba(82,196,122,0.12)] px-3 py-2 text-sm text-[var(--ink-strong)]">
          Onboarding is complete. You now have full workspace access.
        </p>
      ) : null}
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">1. Enable modules</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["enableModeration", "Moderation"],
            ["enableActivity", "Activity"],
            ["enableInfractions", "Infractions"],
            ["enableSessions", "Sessions"],
            ["enableDepartments", "Departments"],
            ["enableAlerts", "Alerts"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="ui-checkbox"
                checked={preferences[key as keyof OnboardingResponse["preferences"]]}
                onChange={() => togglePreference(key as keyof OnboardingResponse["preferences"])}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">2. Base settings</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[var(--ink-soft)]">
            Retention period
            <UiSelect
              value={retentionDays}
              onChange={(value) => setRetentionDays(value === 30 ? 30 : 90)}
              className="mt-1"
              options={[
                { value: 30, label: "30 days" },
                { value: 90, label: "90 days" },
              ]}
            />
          </label>
          <label className="text-sm text-[var(--ink-soft)]">
            Discord webhook URL (optional)
            <input
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-[var(--ink-soft)]">Optional; used for external alert delivery.</span>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
          <input
            type="checkbox"
            className="ui-checkbox"
            checked={infractionEvidenceRequired}
            onChange={(event) => setInfractionEvidenceRequired(event.target.checked)}
          />
          Require evidence attachments for infractions
        </label>
      </section>

      <section className="mt-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">3. Connect ER:LC</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Status: <span className="text-[var(--ink-strong)]">{erlcConnected ? "Connected" : "Not connected"}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Paste your ER:LC <span className="text-[var(--ink-strong)]">Server-Key</span> below. Global API keys are not accepted here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="password"
            value={serverKeyInput}
            onChange={(event) => setServerKeyInput(event.target.value)}
            className="w-full min-w-[240px] flex-1 rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm sm:max-w-[420px]"
          />
          <button
            className="button-secondary px-4 py-2 text-sm"
            type="button"
            onClick={() => void connectServerKey()}
            disabled={connectingKey || !serverKeyInput.trim()}
          >
            {connectingKey ? "Connecting..." : "Connect Key"}
          </button>
        </div>
      </section>

      <div className="mt-5 space-y-3">
        {steps.map((item, index) => (
          <article
            key={item.step}
            className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {index + 1}. {item.step}
              </h2>
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
