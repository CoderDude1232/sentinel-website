import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <header className="dashboard-topbar mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Sentinel Command Console</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/app/integrations" className="nav-quiet-link">
              Integrations
            </Link>
            <Link href="/app/alerts" className="nav-quiet-link">
              Alerts
            </Link>
            <Link href="/app/settings" className="nav-quiet-link">
              Settings
            </Link>
          </div>
        </header>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-5 pb-6 sm:px-8 md:grid-cols-[240px_1fr]">
        <aside className="glass-card h-fit p-4 md:sticky md:top-4">
          <DashboardNav />
        </aside>
        <section className="dashboard-content p-5 sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
