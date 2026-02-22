const featureSections = [
  {
    title: "Moderation Panel",
    description:
      "Monitor ER:LC command usage, mod calls, and intervention history from a single oversight view.",
    points: ["Command audit timeline", "Mod call triage queue", "Evidence-linked actions"],
  },
  {
    title: "ER:LC Integration",
    description:
      "Connect server keys securely and monitor endpoint health with adaptive rate-limit handling.",
    points: ["Server status and queue", "Join, command, and kill logs", "Integration health checks"],
  },
  {
    title: "Activity Panel",
    description:
      "Track how staff are performing with operational metrics across moderation and attendance behavior.",
    points: ["Staff action summaries", "Attendance and response trend", "Performance comparison windows"],
  },
  {
    title: "Infractions Panel",
    description:
      "Run disciplinary workflows consistently with reason capture, evidence records, and appeal visibility.",
    points: ["Warning to termination pipeline", "Case ownership records", "Audit-ready infraction history"],
  },
  {
    title: "Sessions",
    description:
      "Plan sessions with attendance expectations and evaluate outcomes after each event window closes.",
    points: ["Session announcements", "Attendance checkpointing", "Outcome and trend reports"],
  },
  {
    title: "Departments",
    description:
      "Organize teams into departments and bind responsibilities to permission-scoped access control.",
    points: ["Custom department structure", "Permission matrices", "Member assignment visibility"],
  },
];

const highlights = [
  { label: "Core Modules", value: "6" },
  { label: "Live Panels", value: "Real-time" },
  { label: "Team Modes", value: "Solo + Team" },
  { label: "Auth", value: "Discord" },
];

export default function FeaturesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 sm:px-8">
      <section className="features-shell mt-8">
        <div className="features-grid">
          <div className="stagger-rise">
            <span className="kicker">Feature Suite</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Command tooling designed for ER:LC teams.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-[var(--ink-soft)] sm:text-base">
              Every Sentinel module is built for fast operational decisions: moderation,
              staffing insight, infraction workflows, session control, and direct ER:LC data.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <form action="/login" method="GET" className="w-full sm:w-auto">
                <button type="submit" className="button-primary w-full px-6 py-3 text-base sm:w-auto">
                  Continue with Discord
                </button>
              </form>
              <form action="/app/onboarding" method="GET" className="w-full sm:w-auto">
                <button type="submit" className="button-secondary w-full px-6 py-3 text-base sm:w-auto">
                  Link ER:LC Server
                </button>
              </form>
            </div>
          </div>
          <div className="features-highlights stagger-rise delay-1">
            {highlights.map((item) => (
              <article key={item.label} className="feature-highlight-card">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mb-4 mt-6 grid w-full max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureSections.map((feature, index) => (
          <article key={feature.title} className="feature-module-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Module {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">{feature.title}</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{feature.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-[var(--ink-soft)]">
              {feature.points.map((point) => (
                <li key={point}>- {point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mx-auto mb-16 mt-5 grid w-full max-w-6xl gap-4 md:grid-cols-2">
        <article className="feature-module-card p-5">
          <h3 className="text-sm uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Designed for control
          </h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Every module is built around action traceability, role-scoped access,
            and operational clarity under load.
          </p>
        </article>
        <article className="feature-module-card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-[var(--ink-soft)]">
            Ready to configure your first workspace and connect ER:LC?
          </p>
          <div className="flex gap-2">
            <form action="/login" method="GET">
              <button type="submit" className="button-primary px-3 py-2 text-sm">
                Open Sentinel
              </button>
            </form>
            <form action="/app/onboarding" method="GET">
              <button type="submit" className="button-secondary px-3 py-2 text-sm">
                Setup server
              </button>
            </form>
          </div>
        </article>
      </section>
    </main>
  );
}
