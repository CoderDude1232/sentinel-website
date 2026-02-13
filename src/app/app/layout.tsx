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
    <div className="min-h-screen bg-[#f7f7f3]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Sentinel
          </Link>
          <Link href="/login" className="text-sm hover:underline">
            Switch account
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-black/10 bg-white p-4">
          <nav className="flex flex-col gap-2 text-sm">
            {appLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-1.5 hover:bg-black/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="rounded-lg border border-black/10 bg-white p-5">
          {children}
        </section>
      </div>
    </div>
  );
}
