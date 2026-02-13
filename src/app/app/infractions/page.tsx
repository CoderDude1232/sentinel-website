const infractionStats = [
  { type: "Warnings", count: 12 },
  { type: "Strikes", count: 5 },
  { type: "Suspensions", count: 2 },
  { type: "Terminations", count: 1 },
];

const recentCases = [
  { id: "INF-301", target: "UnitEcho", level: "Strike", issuer: "Lt. Hayes", appeal: "Open" },
  { id: "INF-300", target: "RoadLead", level: "Warning", issuer: "Sgt. Morrow", appeal: "Closed" },
  { id: "INF-299", target: "PatrolSix", level: "Suspension", issuer: "Admin Team", appeal: "Pending" },
];

export default function InfractionsPage() {
  return (
    <div>
      <span className="kicker">Infractions</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Disciplinary Workflow</h1>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {infractionStats.map((item) => (
          <article key={item.type} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.type}</p>
            <p className="mt-1 text-2xl font-semibold">{item.count}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Recent cases</h2>
          <button className="button-primary px-3 py-2 text-sm">Log new infraction</button>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {recentCases.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{item.id} - {item.level}</p>
                <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                  Appeal: {item.appeal}
                </span>
              </div>
              <p className="text-[var(--ink-soft)]">Target: {item.target}</p>
              <p className="text-xs text-[var(--ink-soft)]">Issued by: {item.issuer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
