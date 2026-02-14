import { cookies } from "next/headers";
import Link from "next/link";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { PublicHero } from "@/components/public-hero";

const securityItems = [
  "OAuth state validation on callback",
  "Signed session cookie handling",
  "Workspace role checks per action",
  "Full authentication audit logs",
];

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorLabels: Record<string, string> = {
  invalid_state: "Login request expired or was invalid. Please try again.",
  oauth_failed: "Discord login failed. Please retry.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorCode ? errorLabels[errorCode] ?? "Login failed." : null;

  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <PublicHero
        kicker="Authentication"
        title="Access Sentinel through Discord."
        description="Sign in with Discord to access your workspace and ER:LC integrations."
      />

      <section className="mt-5 grid w-full gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Discord Sign-in</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Login is handled directly through Discord OAuth with signed server
            sessions.
          </p>
          {session ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-[var(--ink-soft)]">
                Signed in as <span className="text-[var(--ink-strong)]">{session.user.displayName}</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link href="/app" className="button-primary w-full px-4 py-3 text-sm">
                  Open Dashboard
                </Link>
                <Link href="/api/auth/logout" className="button-secondary w-full px-4 py-3 text-sm">
                  Logout
                </Link>
              </div>
            </div>
          ) : (
            <Link href="/api/auth/discord/login" className="button-primary mt-6 w-full px-4 py-3 text-sm">
              Continue with Discord
            </Link>
          )}
          {errorMessage ? (
            <p className="mt-3 rounded-md border border-[rgba(216,29,56,0.4)] bg-[rgba(216,29,56,0.14)] px-3 py-2 text-xs text-[var(--ink-strong)]">
              {errorMessage}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            By continuing, you agree to Sentinel terms and privacy policy.
          </p>
        </article>

        <article className="glass-card p-6">
          <h2 className="text-lg font-semibold tracking-tight">Session Security</h2>
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            Security controls
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-soft)]">
            {securityItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
