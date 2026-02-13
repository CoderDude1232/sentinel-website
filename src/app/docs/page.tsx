import Link from "next/link";

const quickStart = [
  "Sign in with Discord and create your workspace.",
  "Invite staff members and set roles/departments.",
  "Connect ER:LC server key in Integrations.",
  "Configure alert events and Discord webhook target.",
  "Review moderation/activity modules and start operations.",
];

const docSections = [
  {
    title: "Authentication",
    summary:
      "Discord OAuth flow, account linking behavior, and role access checks.",
  },
  {
    title: "ER:LC Integration",
    summary:
      "Server-key connection, endpoint ingestion map, and command safety policy.",
  },
  {
    title: "Operational Modules",
    summary:
      "Guides for moderation, activity analytics, infractions, sessions, and departments.",
  },
  {
    title: "Notifications",
    summary:
      "Alert event catalog, webhook payload shape, and retry handling behavior.",
  },
  {
    title: "Security",
    summary:
      "Audit logging model, encryption boundaries, and permission enforcement rules.",
  },
  {
    title: "Retention and Compliance",
    summary:
      "Workspace retention options, data cleanup schedule, and legal process notes.",
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <section className="glass-card p-6 sm:p-8">
        <span className="kicker">Documentation</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Operational guides and integration references.
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-[var(--ink-soft)] sm:text-base">
          Use this documentation hub to onboard your workspace, configure ER:LC
          integration safely, and standardize how staff use Sentinel modules.
        </p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <article className="glass-card p-5">
          <h2 className="text-lg font-semibold tracking-tight">Quick Start</h2>
          <ol className="mt-3 space-y-1.5 text-sm text-[var(--ink-soft)]">
            {quickStart.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </article>
        <article className="glass-card p-5">
          <h2 className="text-lg font-semibold tracking-tight">Need API detail?</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Sentinel integration aligns with official PRC API v1 behavior,
            especially around endpoint buckets, rate-limit headers, and 429
            recovery timing.
          </p>
          <Link href="/features" className="button-secondary mt-4 px-3 py-2 text-sm">
            View feature mapping
          </Link>
        </article>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        {docSections.map((section) => (
          <article key={section.title} className="glass-card p-5">
            <h3 className="text-lg font-semibold tracking-tight">{section.title}</h3>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{section.summary}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
