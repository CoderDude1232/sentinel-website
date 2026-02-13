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

export default function AppOverviewPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Workspace Command View</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Primary workspace summary for ER:LC operations.
          </p>
        </div>
        <button className="button-primary px-4 py-2 text-sm">Refresh widgets</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              {card.title}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{card.details}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--bg-panel-strong)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
          Operational Notes
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Use this view for live status checks, action visibility, and alert
          handoff before deeper investigation in module pages.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
          System status
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Monitoring surface online. Data and event channels can be reviewed
          from this workspace view.
        </p>
      </div>
    </div>
  );
}
