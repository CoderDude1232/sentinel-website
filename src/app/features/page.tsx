import Link from "next/link";

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

export default function FeaturesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 sm:px-8">
      <section className="hero-shell min-h-[62vh]">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="hero-subtle stagger-rise">Product capabilities for ER:LC operations</p>
          <h1 className="public-hero-title stagger-rise delay-1 mt-4">
            Core features built for active command teams.
          </h1>
          <p className="hero-subtle stagger-rise delay-2 mx-auto mt-6 max-w-3xl">
            Sentinel is structured around six operational modules used by
            communities to run moderation, staffing, and session workflows with
            consistent accountability.
          </p>

          <div className="stagger-rise delay-3 mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/app" className="button-primary px-6 py-3 text-base">
              Launch Dashboard
            </Link>
            <Link href="/app/onboarding" className="button-secondary px-6 py-3 text-base">
              Connect ER:LC Server
            </Link>
            <Link href="/login" className="button-secondary px-6 py-3 text-base">
              Sign In with Discord
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-4 mt-2 grid w-full max-w-6xl gap-4 sm:grid-cols-2">
        {featureSections.map((feature) => (
          <article key={feature.title} className="glass-card p-5">
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
        <article className="glass-card p-5">
          <h3 className="text-sm uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Designed for control
          </h3>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Every module is built around action traceability, role-scoped access,
            and operational clarity under load.
          </p>
        </article>
        <article className="glass-card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-[var(--ink-soft)]">
            Ready to move from overview to workspace setup?
          </p>
          <div className="flex gap-2">
            <Link href="/login" className="button-primary px-3 py-2 text-sm">
              Open Sentinel
            </Link>
            <Link href="/docs" className="button-secondary px-3 py-2 text-sm">
              Read docs
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
