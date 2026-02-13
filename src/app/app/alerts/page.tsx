const alertFeed = [
  { level: "Critical", event: "Server command endpoint returned 429", time: "2m ago", source: "ER:LC Integration" },
  { level: "Warning", event: "Mod call queue above threshold", time: "8m ago", source: "Moderation" },
  { level: "Info", event: "Session attendance report finalized", time: "21m ago", source: "Sessions" },
  { level: "Info", event: "Webhook delivery successful", time: "32m ago", source: "Notifications" },
];

const webhookStatus = [
  { name: "Discord - Main Ops", status: "Healthy", retries: "0" },
  { name: "Discord - Staff Leads", status: "Healthy", retries: "1" },
];

export default function AlertsPage() {
  return (
    <div>
      <span className="kicker">Alerts</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Alert Center</h1>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Live alert feed</h2>
          <div className="mt-3 space-y-2 text-sm">
            {alertFeed.map((item) => (
              <div key={`${item.event}-${item.time}`} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.event}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {item.level}
                  </span>
                </div>
                <p className="text-[var(--ink-soft)]">{item.source}</p>
                <p className="text-xs text-[var(--ink-soft)]">{item.time}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Webhook health</h2>
          <div className="mt-3 space-y-2 text-sm">
            {webhookStatus.map((item) => (
              <div key={item.name} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-[var(--ink-soft)]">Status: {item.status}</p>
                <p className="text-xs text-[var(--ink-soft)]">Recent retries: {item.retries}</p>
              </div>
            ))}
          </div>
          <button className="button-secondary mt-4 px-3 py-2 text-sm">Send test alert</button>
        </article>
      </section>
    </div>
  );
}
