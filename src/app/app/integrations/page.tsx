const serverConnections = [
  { server: "Primary ER:LC", status: "Connected", sync: "5s ago", health: "Healthy" },
  { server: "Team ER:LC 2", status: "Disconnected", sync: "Never", health: "Not configured" },
];

const endpointHealth = [
  { endpoint: "/server", latency: "184ms", state: "OK" },
  { endpoint: "/server/players", latency: "212ms", state: "OK" },
  { endpoint: "/server/modcalls", latency: "231ms", state: "OK" },
  { endpoint: "/server/command", latency: "N/A", state: "Rate-limited window active" },
];

export default function IntegrationsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Integrations</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">ER:LC and Webhook Integrations</h1>
        </div>
        <button className="button-primary px-4 py-2 text-sm">Connect server key</button>
      </div>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Server connections</h2>
          <div className="mt-3 space-y-2 text-sm">
            {serverConnections.map((item) => (
              <div key={item.server} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.server}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.status}</span>
                </div>
                <p className="text-[var(--ink-soft)]">Last sync: {item.sync}</p>
                <p className="text-xs text-[var(--ink-soft)]">Health: {item.health}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Endpoint health</h2>
          <div className="mt-3 space-y-2 text-sm">
            {endpointHealth.map((item) => (
              <div key={item.endpoint} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{item.endpoint}</p>
                <p className="text-[var(--ink-soft)]">Latency: {item.latency}</p>
                <p className="text-xs text-[var(--ink-soft)]">State: {item.state}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
