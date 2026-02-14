import Link from "next/link";

const appLinks = [
  { href: "/app", label: "Overview" },
  { href: "/app/onboarding", label: "Onboarding" },
  { href: "/app/moderation", label: "Moderation" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/infractions", label: "Infractions" },
  { href: "/app/sessions", label: "Sessions" },
  { href: "/app/departments", label: "Departments" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/team", label: "Team" },
  { href: "/app/integrations", label: "Integrations" },
  { href: "/app/settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <section className="public-hero mb-5">
          <span className="kicker">Workspace</span>
          <h1 className="public-hero-title mt-4">Sentinel Command Console</h1>
          <p className="public-hero-description mt-3">
            Monitor ER:LC moderation, staff activity, and operational workflows from one secured dashboard.
          </p>
        </section>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-5 pb-6 sm:px-8 md:grid-cols-[230px_1fr]">
        <aside className="glass-card h-fit p-4 md:sticky md:top-4">
          <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              Ops Console
            </p>
            <p className="mt-1 text-sm font-semibold">Primary workspace</p>
          </div>
          <nav className="mt-3 flex flex-col gap-1.5 text-sm">
            {appLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-1.5 text-[var(--ink-soft)] transition-colors hover:bg-[rgba(216,29,56,0.15)] hover:text-[var(--ink-strong)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="glass-card p-5 sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
