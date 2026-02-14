import Link from "next/link";

const cards = [
  {
    title: "Server status",
    value: "Operational",
    details: "Realtime stream active with no endpoint lockouts",
  },
  {
    title: "Staff activity",
    value: "Tracked",
    details: "Command logs, mod calls, and attendance events flowing",
  },
  {
    title: "Session monitor",
    value: "Standby",
    details: "Performance analytics layer waiting for first live session",
  },
  {
    title: "Infractions queue",
    value: "Empty",
    details: "No pending approvals in current workspace",
  },
];

const feedItems = [
  { time: "2m ago", label: "ER:LC endpoint heartbeat successful", level: "Healthy" },
  { time: "8m ago", label: "Session announcement published to team", level: "Update" },
  { time: "14m ago", label: "Moderation case CMD-2194 updated", level: "Attention" },
];

const nextActions = [
  { label: "Review moderation queue", href: "/app/moderation" },
  { label: "Open staff activity panel", href: "/app/activity" },
  { label: "Manage session board", href: "/app/sessions" },
];

export default function AppOverviewPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Workspace Command View</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Live status, active workloads, and team operations in one surface.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="button-primary px-4 py-2 text-sm">Refresh data</button>
          <Link href="/app/onboarding" className="button-secondary px-4 py-2 text-sm">
            Add Server
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.title} className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              {card.title}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{card.details}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="dashboard-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            Live activity feed
          </h2>
          <div className="mt-3 space-y-2.5">
            {feedItems.map((item) => (
              <div key={item.time + item.label} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--ink-strong)]">{item.label}</p>
                  <span className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                    {item.level}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">{item.time}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            Next actions
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {nextActions.map((action) => (
              <Link key={action.href} href={action.href} className="button-secondary w-full px-3 py-2 text-sm">
                {action.label}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            Use modules for full detail. This overview stays focused on high-level control.
          </p>
        </article>
      </section>
    </div>
  );
}
