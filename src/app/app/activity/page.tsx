const kpis = [
  { label: "Staff actions (24h)", value: "184" },
  { label: "Average response time", value: "2m 14s" },
  { label: "Attendance compliance", value: "92%" },
  { label: "Active staff now", value: "17" },
];

const leaderboard = [
  { name: "Lt. Hayes", sessions: 4, actions: 33, score: "A" },
  { name: "Sgt. Morrow", sessions: 3, actions: 29, score: "A-" },
  { name: "Officer Lane", sessions: 2, actions: 24, score: "B+" },
  { name: "Officer Vega", sessions: 2, actions: 18, score: "B" },
];

export default function ActivityPage() {
  return (
    <div>
      <span className="kicker">Activity</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Staff Activity Intelligence</h1>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <article key={item.label} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">Performance leaderboard</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              <tr>
                <th className="py-2 pr-4">Staff</th>
                <th className="py-2 pr-4">Sessions hosted</th>
                <th className="py-2 pr-4">Actions</th>
                <th className="py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((member) => (
                <tr key={member.name} className="border-t border-[var(--line)]">
                  <td className="py-2 pr-4">{member.name}</td>
                  <td className="py-2 pr-4">{member.sessions}</td>
                  <td className="py-2 pr-4">{member.actions}</td>
                  <td className="py-2">{member.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
