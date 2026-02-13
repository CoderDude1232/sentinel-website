const upcomingSessions = [
  { title: "Evening Patrol Session", starts: "19:00", host: "Lt. Hayes", staffing: "12/15" },
  { title: "Weekend Training", starts: "20:30", host: "Sgt. Morrow", staffing: "9/12" },
  { title: "Night Ops Review", starts: "22:00", host: "Admin Team", staffing: "6/8" },
];

const performance = [
  { label: "Average attendance", value: "88%" },
  { label: "Peak concurrent players", value: "43" },
  { label: "Moderation load/session", value: "17 events" },
  { label: "Average session rating", value: "4.6/5" },
];

export default function SessionsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Sessions</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Session Control Center</h1>
        </div>
        <button className="button-primary px-4 py-2 text-sm">Create session</button>
      </div>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Upcoming schedule</h2>
          <div className="mt-3 space-y-2 text-sm">
            {upcomingSessions.map((session) => (
              <div
                key={session.title}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <p className="font-semibold">{session.title}</p>
                <p className="text-[var(--ink-soft)]">Starts {session.starts} - Host: {session.host}</p>
                <p className="text-xs text-[var(--ink-soft)]">Staffing: {session.staffing}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Performance snapshot</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {performance.map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.label}</p>
                <p className="mt-1 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
