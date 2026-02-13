const termsSections = [
  {
    title: "Service Scope",
    body: "Sentinel provides ER:LC-focused operational dashboards for moderation, staffing analytics, infractions, sessions, and department controls.",
  },
  {
    title: "Account Responsibilities",
    body: "Workspace owners are responsible for member access management, credential handling, and policy-compliant platform use.",
  },
  {
    title: "Acceptable Use",
    body: "Users may not abuse integrations, bypass rate limits, attempt unauthorized access, or use Sentinel features for harassment or harmful conduct.",
  },
  {
    title: "Third-Party Dependencies",
    body: "Sentinel relies on Discord authentication and ER:LC API availability. Service behavior may be affected by upstream platform outages or policy changes.",
  },
  {
    title: "Limitation of Liability",
    body: "Sentinel is provided as-is. Liability is limited to the maximum extent permitted by applicable law and service agreements.",
  },
  {
    title: "Changes to Terms",
    body: "Terms may be updated to reflect service changes, legal requirements, or security obligations. Material changes will be published with an updated date.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <section className="glass-card p-6 sm:p-8">
        <span className="kicker">Legal</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">Effective date: February 13, 2026</p>
      </section>

      <section className="mt-5 space-y-4">
        {termsSections.map((section) => (
          <article key={section.title} className="glass-card p-5">
            <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
