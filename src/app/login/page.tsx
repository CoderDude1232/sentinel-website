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
    <main className="mx-auto w-full max-w-7xl px-5 sm:px-8">
      <section className="hero-shell">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="hero-subtle stagger-rise">Authentication</p>
          <h1 className="public-hero-title stagger-rise delay-1 mt-4">
            Access Sentinel through Discord.
          </h1>
          <p className="hero-subtle stagger-rise delay-2 mx-auto mt-6 max-w-3xl">
            Sign in with Discord to open your Sentinel workspace and ER:LC panels.
          </p>

          {errorMessage ? (
            <p className="stagger-rise delay-2 mx-auto mt-5 max-w-xl rounded-md border border-[rgba(216,29,56,0.4)] bg-[rgba(216,29,56,0.14)] px-3 py-2 text-sm text-[var(--ink-strong)]">
              {errorMessage}
            </p>
          ) : null}

          {session ? (
            <>
              <p className="stagger-rise delay-3 mt-6 text-sm text-[var(--ink-soft)]">
                Signed in as{" "}
                <span className="text-[var(--ink-strong)]">{session.user.displayName}</span>
              </p>
              <div className="stagger-rise delay-3 mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <Link href="/app" className="button-primary px-6 py-3 text-base">
                  Launch Dashboard
                </Link>
                <Link href="/app/onboarding" className="button-secondary px-6 py-3 text-base">
                  Connect ER:LC Server
                </Link>
                <Link href="/api/auth/logout" className="button-secondary px-6 py-3 text-base">
                  Sign Out
                </Link>
              </div>
            </>
          ) : (
            <div className="stagger-rise delay-3 mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/api/auth/discord/login" className="button-primary px-6 py-3 text-base">
                Sign In with Discord
              </Link>
              <Link href="/" className="button-secondary px-6 py-3 text-base">
                Back to Home
              </Link>
              <Link href="/features" className="button-secondary px-6 py-3 text-base">
                View Features
              </Link>
            </div>
          )}

          <p className="mt-7 text-base text-[var(--ink-soft)]">
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
