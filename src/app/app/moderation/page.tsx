const openCases = [
  { id: "MC-4821", type: "Mod Call", player: "Driver_091", status: "Queued", owner: "Unassigned" },
  { id: "CMD-2194", type: "Command Review", player: "UnitEcho", status: "Under review", owner: "Lt. Hayes" },
  { id: "MC-4820", type: "Mod Call", player: "RuralPatrol", status: "Escalated", owner: "Admin Team" },
];

const safeguards = [
  "Command allowlist enforced by role",
  "All command submissions logged with actor and timestamp",
  "Evidence links required for escalated actions",
  "Webhook notifications for critical moderation events",
];

export default function ModerationPage() {
  return (
    <div>
      <span className="kicker">Moderation</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operational Moderation Panel</h1>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Open moderation queue</h2>
          <div className="mt-3 space-y-2 text-sm">
            {openCases.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.id}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {item.status}
                  </span>
                </div>
                <p className="text-[var(--ink-soft)]">{item.type} - {item.player}</p>
                <p className="text-xs text-[var(--ink-soft)]">Owner: {item.owner}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Command safeguards</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--ink-soft)]">
            {safeguards.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
          <button className="button-secondary mt-4 px-3 py-2 text-sm">Open command console</button>
        </article>
      </section>
    </div>
  );
}
