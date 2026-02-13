const privacySections = [
  {
    title: "Information We Collect",
    body: "Sentinel stores account identifiers, workspace configuration, module records, and audit logs required to deliver ER:LC operations tooling.",
  },
  {
    title: "How Data Is Used",
    body: "Data is processed for authentication, access control, feature operation, incident response, and service quality improvements.",
  },
  {
    title: "Retention Controls",
    body: "Workspace owners and admins choose 30 or 90 day retention windows for operational module data. System logs may be retained longer for security.",
  },
  {
    title: "Sharing and Disclosure",
    body: "Sentinel does not sell workspace data. Data may be disclosed only for legal compliance, abuse investigations, or requested service integrations.",
  },
  {
    title: "Security Practices",
    body: "Sensitive credentials are encrypted at rest, role checks are enforced for workspace actions, and access events are logged for review.",
  },
  {
    title: "User Rights and Requests",
    body: "Administrators may request data export or deletion for their workspace subject to legal or security retention constraints.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <section className="glass-card p-6 sm:p-8">
        <span className="kicker">Legal</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">Last updated: February 13, 2026</p>
      </section>

      <section className="mt-5 space-y-4">
        {privacySections.map((section) => (
          <article key={section.title} className="glass-card p-5">
            <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{section.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
