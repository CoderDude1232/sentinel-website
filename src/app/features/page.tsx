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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <section className="glass-card p-6 sm:p-8">
        <span className="kicker">Product Capabilities</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Core features built for ER:LC operations.
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-[var(--ink-soft)] sm:text-base">
          Sentinel is structured around six operational modules used by active
          communities to run moderation, staffing, and session workflows with
          consistent accountability.
        </p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
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

      <section className="mt-5 grid gap-4 md:grid-cols-2">
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
