import Link from "next/link";

export default function Home() {
  const publicLinks = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/docs", label: "Docs" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <header className="flex items-center justify-between border-b border-black/10 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sentinel</h1>
        <nav className="flex items-center gap-4 text-sm">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-md border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/5"
          >
            Login
          </Link>
        </nav>
      </header>

      <section className="grid flex-1 gap-8 py-12 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/60">
            ER:LC Operations Platform
          </p>
          <h2 className="text-4xl font-semibold leading-tight md:text-5xl">
            Manage moderation, staff activity, and sessions from one dashboard.
          </h2>
          <p className="text-base text-black/70">
            Sentinel is built for ER:LC communities with real-time monitoring,
            infractions tracking, and team-based control.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Continue with Discord
            </Link>
            <Link
              href="/app/onboarding"
              className="rounded-md border border-black/20 px-4 py-2 text-sm font-semibold"
            >
              View Onboarding
            </Link>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-black/10 p-6">
          <h3 className="text-lg font-semibold">v1 Modules</h3>
          <ul className="space-y-2 text-sm text-black/75">
            <li>Moderation Panel for ER:LC logs and command actions</li>
            <li>Activity Panel for staff analytics and performance</li>
            <li>Infractions Panel for warnings to terminations</li>
            <li>Sessions for planning, attendance, and outcome metrics</li>
            <li>Departments with custom permissions and organization</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
