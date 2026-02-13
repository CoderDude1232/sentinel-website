const channels = [
  { name: "Support Desk", detail: "support@sentinel.local", sla: "Response target: <24h" },
  { name: "Billing", detail: "billing@sentinel.local", sla: "Response target: <48h" },
  { name: "Security", detail: "security@sentinel.local", sla: "Priority route" },
];

const inquiryTypes = [
  "Technical support",
  "Feature request",
  "Workspace migration",
  "Billing question",
  "Legal request",
];

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <section className="glass-card p-6 sm:p-8">
        <span className="kicker">Contact</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Get support from the Sentinel team.</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--ink-soft)]">
          Route technical, operational, and account questions through the correct
          support channel for faster response.
        </p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="glass-card p-5">
          <h2 className="text-lg font-semibold tracking-tight">Support channels</h2>
          <div className="mt-3 space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.name}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <p className="text-sm font-semibold">{channel.name}</p>
                <p className="text-sm text-[var(--ink-soft)]">{channel.detail}</p>
                <p className="text-xs text-[var(--ink-soft)]">{channel.sla}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card p-5">
          <h2 className="text-lg font-semibold tracking-tight">New inquiry</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                Inquiry type
              </label>
              <select className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm">
                {inquiryTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                Message
              </label>
              <textarea
                rows={5}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm"
                placeholder="Describe your request with workspace and module context."
              />
            </div>
            <button className="button-primary w-full px-4 py-2 text-sm">Submit inquiry</button>
          </div>
        </article>
      </section>
    </main>
  );
}
