import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
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
      <style>{`.global-navbar { display: none !important; }`}</style>
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <header className="dashboard-topbar dashboard-glass mb-5">
          <div className="w-full space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Sentinel logo"
                  width={34}
                  height={34}
                  className="brand-logo"
                  priority
                />
                <Link href="/" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  sentinel
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link href="/features" className="nav-quiet-link">
                  Features
                </Link>
                <Link href="/app" className="nav-quiet-link">
                  Workspace
                </Link>
                <AccountMenu user={session.user} />
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[var(--line)] pt-3">
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
            </div>
          </div>
        </header>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-5 pb-6 sm:px-8 md:grid-cols-[240px_1fr]">
        <aside className="dashboard-nav-shell h-fit p-4 md:sticky md:top-4">
          <DashboardNav />
        </aside>
        <section className="dashboard-content dashboard-glass p-5 sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
