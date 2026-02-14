import { cookies } from "next/headers";
import Link from "next/link";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

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
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <section className="login-shell">
        <div className="login-frame stagger-rise">
          <span className="kicker">Discord Access</span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Sign in to enter Sentinel.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-[var(--ink-soft)] sm:text-base">
            Use your Discord account to access your workspace, ER:LC integration panel,
            and team command modules. Sentinel also requests access to view your servers for bot setup.
          </p>

          {errorMessage ? (
            <p className="mt-5 max-w-xl rounded-md border border-[rgba(216,29,56,0.4)] bg-[rgba(216,29,56,0.14)] px-3 py-2 text-sm text-[var(--ink-strong)]">
              {errorMessage}
            </p>
          ) : null}

          {session ? (
            <>
              <p className="mt-6 text-sm text-[var(--ink-soft)]">
                Signed in as{" "}
                <span className="text-[var(--ink-strong)]">{session.user.displayName}</span>
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/app" className="button-primary px-6 py-3 text-base">
                  Open Dashboard
                </Link>
                <Link href="/app/onboarding" className="button-secondary px-6 py-3 text-base">
                  Onboard Server
                </Link>
                <Link href="/api/auth/logout" className="button-secondary px-6 py-3 text-base">
                  Sign Out
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/auth/discord/login" className="button-primary px-6 py-3 text-base">
                Continue with Discord
              </Link>
              <Link href="/" className="button-secondary px-6 py-3 text-base">
                Back to Home
              </Link>
            </div>
          )}

          <p className="mt-8 text-sm text-[var(--ink-soft)]">
            By using Sentinel, you agree to our{" "}
            <Link href="/terms" className="text-[var(--ink-strong)] hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[var(--ink-strong)] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
