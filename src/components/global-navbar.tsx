import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { AccountMenu } from "@/components/account-menu";

export async function GlobalNavbar() {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  return (
    <header className="global-navbar w-full px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Sentinel logo"
            width={40}
            height={40}
            className="brand-logo"
            priority
          />
          <Link href="/" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            sentinel
          </Link>
          {session ? (
            <Link
              href="/app"
              className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]"
            >
              dashboard
            </Link>
          ) : null}
        </div>

        <nav className="flex w-full items-center justify-end gap-3 text-sm sm:w-auto sm:gap-4 sm:text-base">
          {session ? (
            <>
              <Link href="/app/integrations" className="nav-quiet-link">
                Integrations
              </Link>
              <Link href="/app/alerts" className="nav-quiet-link">
                Alerts
              </Link>
              <Link href="/app/settings" className="nav-quiet-link">
                Settings
              </Link>
              <AccountMenu user={session.user} />
            </>
          ) : (
            <>
              <Link href="/features" className="nav-quiet-link">
                Features
              </Link>
              <Link href="/login" className="nav-quiet-link">
                Login
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
