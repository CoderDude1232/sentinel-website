import { PublicHero } from "@/components/public-hero";

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
      <PublicHero
        kicker="Legal"
        title="Terms of Service"
        description="Effective date: February 13, 2026"
      />

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
