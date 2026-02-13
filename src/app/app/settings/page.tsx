const settingGroups = [
  {
    title: "Workspace Defaults",
    rows: [
      "Timezone: UTC-5 (Eastern)",
      "Session visibility: Team-wide",
      "Infraction evidence required: Enabled",
    ],
  },
  {
    title: "Retention and Logs",
    rows: [
      "Retention period: 90 days",
      "Command audit export: Weekly",
      "Auto-cleanup schedule: Daily at 03:00 UTC",
    ],
  },
  {
    title: "Notification Controls",
    rows: [
      "Critical alerts: In-app + webhook",
      "Warning alerts: In-app only",
      "Digest summary: Every 6 hours",
    ],
  },
];

export default function SettingsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Settings</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace Configuration</h1>
        </div>
        <button className="button-primary px-4 py-2 text-sm">Save changes</button>
      </div>

      <section className="mt-5 space-y-4">
        {settingGroups.map((group) => (
          <article key={group.title} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
            <h2 className="text-lg font-semibold tracking-tight">{group.title}</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--ink-soft)]">
              {group.rows.map((row) => (
                <li key={row}>- {row}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
