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
        <section className="dashboard-hero mb-5">
          <div>
            <span className="kicker">Workspace</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Sentinel Command Console
            </h1>
            <p className="hero-subtle mt-3 max-w-3xl text-sm sm:text-base">
              Monitor ER:LC moderation, staff activity, and operational workflows from one unified dashboard.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/app/onboarding" className="button-primary px-4 py-2 text-sm">
              Connect Server
            </Link>
            <Link href="/app/alerts" className="button-secondary px-4 py-2 text-sm">
              View Alerts
            </Link>
            <Link href="/app/integrations" className="button-secondary px-4 py-2 text-sm">
              Integrations
            </Link>
          </div>
        </section>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-5 pb-6 sm:px-8 md:grid-cols-[240px_1fr]">
        <aside className="glass-card h-fit p-4 md:sticky md:top-4">
          <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              Ops Console
            </p>
            <p className="mt-1 text-sm font-semibold">Primary workspace</p>
          </div>
          <DashboardNav />
        </aside>
        <section className="dashboard-content p-5 sm:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}
